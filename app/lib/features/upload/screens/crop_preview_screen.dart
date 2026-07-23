import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'dart:io';
import '../../../core/theme/app_theme.dart';
import '../services/scan_quality_service.dart';
import '../widgets/crop_boundary_painter.dart';
import '../widgets/crop_toolbar.dart';

class CropPreviewScreen extends StatefulWidget {
  final String imagePath;

  const CropPreviewScreen({super.key, required this.imagePath});

  @override
  State<CropPreviewScreen> createState() => _CropPreviewScreenState();
}

class _CropPreviewScreenState extends State<CropPreviewScreen> {
  bool _isEnhanced = false;

  Offset? _topLeft;
  Offset? _topRight;
  Offset? _bottomLeft;
  Offset? _bottomRight;

  bool _isInitialized = false;
  double _canvasWidth = 1.0;
  double _canvasHeight = 1.0;

  int? _imageWidth;
  int? _imageHeight;

  static const List<double> _enhanceMatrix = [
    1.6, 0.0, 0.0, 0.0, -10.0,
    0.0, 1.6, 0.0, 0.0, -10.0,
    0.0, 0.0, 1.6, 0.0, -10.0,
    0.0, 0.0, 0.0, 1.0, 0.0,
  ];

  @override
  void initState() {
    super.initState();
    _loadImageDimensions();
  }

  void _loadImageDimensions() {
    final imageProvider = FileImage(File(widget.imagePath));
    final stream = imageProvider.resolve(const ImageConfiguration());
    stream.addListener(ImageStreamListener((ImageInfo info, bool _) {
      if (mounted) {
        setState(() {
          _imageWidth = info.image.width;
          _imageHeight = info.image.height;
        });
      }
    }));
  }

  Rect _getDisplayedImageRect() {
    if (_imageWidth == null || _imageHeight == null || _canvasWidth <= 1.0 || _canvasHeight <= 1.0) {
      return Rect.fromLTWH(0, 0, _canvasWidth, _canvasHeight);
    }
    final double srcAspect = _imageWidth! / _imageHeight!;
    final double dstAspect = _canvasWidth / _canvasHeight;
    double drawWidth, drawHeight;
    double drawLeft, drawTop;

    if (srcAspect > dstAspect) {
      drawWidth = _canvasWidth;
      drawHeight = _canvasWidth / srcAspect;
      drawLeft = 0;
      drawTop = (_canvasHeight - drawHeight) / 2;
    } else {
      drawHeight = _canvasHeight;
      drawWidth = _canvasHeight * srcAspect;
      drawLeft = (_canvasWidth - drawWidth) / 2;
      drawTop = 0;
    }
    return Rect.fromLTWH(drawLeft, drawTop, drawWidth, drawHeight);
  }

  Offset _clampOffset(Offset offset, Rect rect) {
    return Offset(
      offset.dx.clamp(rect.left, rect.right),
      offset.dy.clamp(rect.top, rect.bottom),
    );
  }

  Future<void> _processAndConfirmCrop() async {
    final rect = _getDisplayedImageRect();

    final topLeftX = rect.width > 0 ? ((_topLeft!.dx - rect.left) / rect.width).clamp(0.0, 1.0) : 0.0;
    final topLeftY = rect.height > 0 ? ((_topLeft!.dy - rect.top) / rect.height).clamp(0.0, 1.0) : 0.0;

    final topRightX = rect.width > 0 ? ((_topRight!.dx - rect.left) / rect.width).clamp(0.0, 1.0) : 1.0;
    final topRightY = rect.height > 0 ? ((_topRight!.dy - rect.top) / rect.height).clamp(0.0, 1.0) : 0.0;

    final bottomLeftX = rect.width > 0 ? ((_bottomLeft!.dx - rect.left) / rect.width).clamp(0.0, 1.0) : 0.0;
    final bottomLeftY = rect.height > 0 ? ((_bottomLeft!.dy - rect.top) / rect.height).clamp(0.0, 1.0) : 1.0;

    final bottomRightX = rect.width > 0 ? ((_bottomRight!.dx - rect.left) / rect.width).clamp(0.0, 1.0) : 1.0;
    final bottomRightY = rect.height > 0 ? ((_bottomRight!.dy - rect.top) / rect.height).clamp(0.0, 1.0) : 1.0;

    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => const Center(
        child: Card(
          color: AppTheme.surfaceColor,
          margin: EdgeInsets.symmetric(horizontal: 32),
          child: Padding(
            padding: EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                CircularProgressIndicator(color: AppTheme.primaryColor),
                SizedBox(height: 20),
                Text(
                  'Optimizing & Processing Crop...',
                  style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                ),
              ],
            ),
          ),
        ),
      ),
    );

    try {
      await ScanQualityService.processImage(
        filePath: widget.imagePath,
        topLeftX: topLeftX,
        topLeftY: topLeftY,
        topRightX: topRightX,
        topRightY: topRightY,
        bottomLeftX: bottomLeftX,
        bottomLeftY: bottomLeftY,
        bottomRightX: bottomRightX,
        bottomRightY: bottomRightY,
        enhance: _isEnhanced,
      );

      if (mounted) {
        context.pop(); // dismiss loading dialog
        context.pop(widget.imagePath);
      }
    } catch (_) {
      if (mounted) {
        context.pop(); // dismiss loading dialog
        context.pop(widget.imagePath); // fallback to original
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final imageWidget = Image.file(
      File(widget.imagePath),
      fit: BoxFit.contain,
    );

    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        backgroundColor: Colors.black,
        elevation: 0,
        title: const Text(
          'ADJUST SCAN BORDERS',
          style: TextStyle(
            color: Colors.white,
            fontSize: 14,
            fontWeight: FontWeight.w900,
            letterSpacing: 1.0,
          ),
        ),
        centerTitle: true,
        automaticallyImplyLeading: false,
      ),
      body: SafeArea(
        child: Column(
          children: [
            Expanded(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                child: LayoutBuilder(
                  builder: (context, constraints) {
                    _canvasWidth = constraints.maxWidth;
                    _canvasHeight = constraints.maxHeight;

                    if (!_isInitialized && _imageWidth != null && _imageHeight != null && _canvasWidth > 1.0 && _canvasHeight > 1.0) {
                      final rect = _getDisplayedImageRect();
                      _topLeft = Offset(rect.left + rect.width * 0.05, rect.top + rect.height * 0.05);
                      _topRight = Offset(rect.left + rect.width * 0.95, rect.top + rect.height * 0.05);
                      _bottomLeft = Offset(rect.left + rect.width * 0.05, rect.top + rect.height * 0.95);
                      _bottomRight = Offset(rect.left + rect.width * 0.95, rect.top + rect.height * 0.95);
                      _isInitialized = true;
                    }

                    return Container(
                      decoration: BoxDecoration(
                        color: const Color(0xFF0F0F0F),
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: Colors.white10),
                      ),
                      clipBehavior: Clip.antiAlias,
                      child: Stack(
                        fit: StackFit.expand,
                        children: [
                          Positioned.fill(
                            child: _isEnhanced
                                ? ColorFiltered(
                                    colorFilter: const ColorFilter.matrix(_enhanceMatrix),
                                    child: imageWidget,
                                  )
                                : imageWidget,
                          ),
                          if (_isInitialized)
                            Positioned.fill(
                              child: CustomPaint(
                                painter: CropBoundaryPainter(
                                  topLeft: _topLeft!,
                                  topRight: _topRight!,
                                  bottomLeft: _bottomLeft!,
                                  bottomRight: _bottomRight!,
                                ),
                              ),
                            ),
                          if (_isInitialized) ...[
                            _buildDraggableHandle(
                              offset: _topLeft!,
                              onDrag: (delta) {
                                final rect = _getDisplayedImageRect();
                                setState(() {
                                  _topLeft = _clampOffset(_topLeft! + delta, rect);
                                });
                              },
                            ),
                            _buildDraggableHandle(
                              offset: _topRight!,
                              onDrag: (delta) {
                                final rect = _getDisplayedImageRect();
                                setState(() {
                                  _topRight = _clampOffset(_topRight! + delta, rect);
                                });
                              },
                            ),
                            _buildDraggableHandle(
                              offset: _bottomLeft!,
                              onDrag: (delta) {
                                final rect = _getDisplayedImageRect();
                                setState(() {
                                  _bottomLeft = _clampOffset(_bottomLeft! + delta, rect);
                                });
                              },
                            ),
                            _buildDraggableHandle(
                              offset: _bottomRight!,
                              onDrag: (delta) {
                                final rect = _getDisplayedImageRect();
                                setState(() {
                                  _bottomRight = _clampOffset(_bottomRight! + delta, rect);
                                });
                              },
                            ),
                          ],
                        ],
                      ),
                    );
                  },
                ),
              ),
            ),
            CropToolbar(
              isEnhanced: _isEnhanced,
              onToggleEnhance: (val) => setState(() => _isEnhanced = val),
              onConfirmCrop: _processAndConfirmCrop,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildDraggableHandle({required Offset offset, required ValueChanged<Offset> onDrag}) {
    return Positioned(
      left: offset.dx - 22,
      top: offset.dy - 22,
      child: GestureDetector(
        onPanUpdate: (details) => onDrag(details.delta),
        child: Container(
          width: 44,
          height: 44,
          color: Colors.transparent,
          child: Center(
            child: Container(
              width: 22,
              height: 22,
              decoration: BoxDecoration(
                color: AppTheme.secondaryColor,
                shape: BoxShape.circle,
                border: Border.all(color: Colors.white, width: 2),
                boxShadow: const [BoxShadow(color: Colors.black45, blurRadius: 4)],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
