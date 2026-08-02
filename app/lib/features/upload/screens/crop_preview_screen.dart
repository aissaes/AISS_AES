import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'dart:io';
import '../../../core/theme/app_theme.dart';
import '../../../../core/services/scan_quality_service.dart';

class CropPreviewScreen extends StatefulWidget {
  final String imagePath;

  const CropPreviewScreen({super.key, required this.imagePath});

  @override
  State<CropPreviewScreen> createState() => _CropPreviewScreenState();
}

class _CropPreviewScreenState extends State<CropPreviewScreen> {
  bool _isEnhanced = false;
  
  // Quadrilateral corners in local coordinate space (initialized after layout)
  Offset? _topLeft;
  Offset? _topRight;
  Offset? _bottomLeft;
  Offset? _bottomRight;
  
  bool _isInitialized = false;
  double _canvasWidth = 1.0;
  double _canvasHeight = 1.0;
  
  int? _imageWidth;
  int? _imageHeight;

  // Enhance color filter matrix (grayscale + high contrast + slight brightness boost)
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

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
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
            // Preview & Interactive Drag Canvas Area
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
                          // 1. The Image with optional Contrast/Enhance filter
                          Positioned.fill(
                            child: _isEnhanced
                                ? ColorFiltered(
                                    colorFilter: const ColorFilter.matrix(_enhanceMatrix),
                                    child: imageWidget,
                                  )
                                : imageWidget,
                          ),
                          
                          // 2. Custom Painter drawing the crop boundaries
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

                          // 3. Draggable corners
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
            
            // 4. Control Toolbar (Grayscale/Shadow removal filter switch)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
              margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              decoration: BoxDecoration(
                color: Colors.white.withValues(alpha: 0.05),
                borderRadius: BorderRadius.circular(30),
                border: Border.all(color: Colors.white12),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Row(
                    children: [
                      Icon(Icons.photo_filter_rounded, color: AppTheme.primaryColor),
                      SizedBox(width: 12),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Auto-Enhance Contrast',
                            style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13),
                          ),
                          Text(
                            'Removes paper shadow & improves OCR',
                            style: TextStyle(color: Colors.white54, fontSize: 10),
                          ),
                        ],
                      ),
                    ],
                  ),
                  Switch.adaptive(
                    value: _isEnhanced,
                    activeThumbColor: AppTheme.primaryColor,
                    onChanged: (val) {
                      setState(() {
                        _isEnhanced = val;
                      });
                    },
                  ),
                ],
              ),
            ),
            
            // 5. Actions Footer (Retake / Confirm)
            Container(
              padding: const EdgeInsets.all(20),
              decoration: const BoxDecoration(
                color: AppTheme.surfaceColor,
                borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
              ),
              child: Row(
                children: [
                  Expanded(
                    child: TextButton.icon(
                      onPressed: () {
                        context.pop(false); // Pop with false: Retake
                      },
                      icon: const Icon(Icons.refresh_rounded, color: Colors.amber),
                      label: const Text(
                        'Retake Photo',
                        style: TextStyle(color: Colors.amber, fontWeight: FontWeight.bold),
                      ),
                      style: TextButton.styleFrom(
                        padding: const EdgeInsets.symmetric(vertical: 14),
                      ),
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: ElevatedButton.icon(
                      onPressed: () async {
                        // Calculate crop bounds relative to actual displayed image rectangle
                        final rect = _getDisplayedImageRect();
                        
                        final topLeftX = rect.width > 0 ? ((_topLeft!.dx - rect.left) / rect.width).clamp(0.0, 1.0) : 0.0;
                        final topLeftY = rect.height > 0 ? ((_topLeft!.dy - rect.top) / rect.height).clamp(0.0, 1.0) : 0.0;
                        
                        final topRightX = rect.width > 0 ? ((_topRight!.dx - rect.left) / rect.width).clamp(0.0, 1.0) : 1.0;
                        final topRightY = rect.height > 0 ? ((_topRight!.dy - rect.top) / rect.height).clamp(0.0, 1.0) : 0.0;
                        
                        final bottomLeftX = rect.width > 0 ? ((_bottomLeft!.dx - rect.left) / rect.width).clamp(0.0, 1.0) : 0.0;
                        final bottomLeftY = rect.height > 0 ? ((_bottomLeft!.dy - rect.top) / rect.height).clamp(0.0, 1.0) : 1.0;
                        
                        final bottomRightX = rect.width > 0 ? ((_bottomRight!.dx - rect.left) / rect.width).clamp(0.0, 1.0) : 1.0;
                        final bottomRightY = rect.height > 0 ? ((_bottomRight!.dy - rect.top) / rect.height).clamp(0.0, 1.0) : 1.0;

                        // Show loader dialog during image manipulation (P1/P2 fixes)
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
                                      'APPLYING DOCUMENT CROP & FILTERS',
                                      style: TextStyle(
                                        fontSize: 11,
                                        fontWeight: FontWeight.w900,
                                        letterSpacing: 1.0,
                                        color: AppTheme.textPrimary,
                                      ),
                                    ),
                                    SizedBox(height: 6),
                                    Text(
                                      'Enhancing contrast & perspective...',
                                      style: TextStyle(
                                        fontSize: 10,
                                        color: AppTheme.textSecondary,
                                      ),
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
                          // Evict from cache to force Flutter to reload processed image from disk
                          await FileImage(File(widget.imagePath)).evict();
                        } catch (e) {
                          debugPrint('Error processing image: $e');
                        } finally {
                          if (context.mounted) {
                            Navigator.pop(context); // Dismiss loading dialog
                            context.pop(true);      // Return true to ScannerScreen
                          }
                        }
                      },
                      icon: const Icon(Icons.check_circle_outline_rounded, color: Colors.white),
                      label: const Text('Accept & Crop'),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppTheme.successColor,
                        padding: const EdgeInsets.symmetric(vertical: 14),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildDraggableHandle({required Offset offset, required Function(Offset) onDrag}) {
    return Positioned(
      left: offset.dx - 22,
      top: offset.dy - 22,
      child: GestureDetector(
        behavior: HitTestBehavior.opaque,
        onPanUpdate: (details) {
          onDrag(details.delta);
        },
        child: Container(
          width: 44,
          height: 44,
          alignment: Alignment.center,
          child: Container(
            width: 22,
            height: 22,
            decoration: BoxDecoration(
              color: AppTheme.primaryColor,
              shape: BoxShape.circle,
              border: Border.all(color: Colors.white, width: 3),
              boxShadow: [
                BoxShadow(
                  color: AppTheme.primaryColor.withValues(alpha: 0.5),
                  blurRadius: 10,
                  spreadRadius: 2,
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class CropBoundaryPainter extends CustomPainter {
  final Offset topLeft;
  final Offset topRight;
  final Offset bottomLeft;
  final Offset bottomRight;

  CropBoundaryPainter({
    required this.topLeft,
    required this.topRight,
    required this.bottomLeft,
    required this.bottomRight,
  });

  @override
  void paint(Canvas canvas, Size size) {
    // 1. Draw boundary lines
    final paintLine = Paint()
      ..color = AppTheme.primaryColor
      ..strokeWidth = 2.5
      ..style = PaintingStyle.stroke;

    final path = Path()
      ..moveTo(topLeft.dx, topLeft.dy)
      ..lineTo(topRight.dx, topRight.dy)
      ..lineTo(bottomRight.dx, bottomRight.dy)
      ..lineTo(bottomLeft.dx, bottomLeft.dy)
      ..close();

    canvas.drawPath(path, paintLine);

    // 2. Shade outside of crop boundaries
    final paintOutside = Paint()
      ..color = Colors.black.withValues(alpha: 0.5)
      ..style = PaintingStyle.fill;

    // Build paths representing the surrounding margins
    final rectPath = Path()..addRect(Rect.fromLTWH(0, 0, size.width, size.height));
    final shadePath = Path.combine(PathOperation.difference, rectPath, path);
    canvas.drawPath(shadePath, paintOutside);
  }

  @override
  bool shouldRepaint(covariant CropBoundaryPainter oldDelegate) {
    return oldDelegate.topLeft != topLeft ||
        oldDelegate.topRight != topRight ||
        oldDelegate.bottomLeft != bottomLeft ||
        oldDelegate.bottomRight != bottomRight;
  }
}
