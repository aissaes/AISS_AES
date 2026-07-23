import 'dart:io';
import 'package:flutter/material.dart';
import '../services/scan_quality_service.dart';

/// Holds all crop coordinate state, image dimensions, and business logic.
/// Completely separate from UI — the screen just delegates to this.
class CropController extends ChangeNotifier {
  final String imagePath;

  // Corner handle positions in canvas space
  Offset? topLeft;
  Offset? topRight;
  Offset? bottomLeft;
  Offset? bottomRight;

  bool isInitialized = false;
  bool isEnhanced = false;

  // Canvas dimensions updated by LayoutBuilder
  double _canvasWidth = 1.0;
  double _canvasHeight = 1.0;

  // Image dimensions loaded asynchronously
  int? _imageWidth;
  int? _imageHeight;

  CropController({required this.imagePath}) {
    _loadImageDimensions();
  }

  bool get cornersReady =>
      isInitialized && topLeft != null && topRight != null && bottomLeft != null && bottomRight != null;

  void _loadImageDimensions() {
    final stream = FileImage(File(imagePath)).resolve(const ImageConfiguration());
    stream.addListener(ImageStreamListener((ImageInfo info, bool _) {
      _imageWidth = info.image.width;
      _imageHeight = info.image.height;
      notifyListeners();
    }));
  }

  /// Call from LayoutBuilder whenever canvas constraints are known.
  void updateCanvas(double width, double height) {
    _canvasWidth = width;
    _canvasHeight = height;

    if (!isInitialized && _imageWidth != null && _imageHeight != null && width > 1.0 && height > 1.0) {
      _initializeCorners();
    }
  }

  void _initializeCorners() {
    final rect = imageRect;
    topLeft     = Offset(rect.left + rect.width * 0.05, rect.top + rect.height * 0.05);
    topRight    = Offset(rect.left + rect.width * 0.95, rect.top + rect.height * 0.05);
    bottomLeft  = Offset(rect.left + rect.width * 0.05, rect.top + rect.height * 0.95);
    bottomRight = Offset(rect.left + rect.width * 0.95, rect.top + rect.height * 0.95);
    isInitialized = true;
    notifyListeners();
  }

  /// The visible image rectangle within the canvas (letterboxed / pillarboxed).
  Rect get imageRect {
    if (_imageWidth == null || _imageHeight == null || _canvasWidth <= 1.0 || _canvasHeight <= 1.0) {
      return Rect.fromLTWH(0, 0, _canvasWidth, _canvasHeight);
    }
    final srcAspect = _imageWidth! / _imageHeight!;
    final dstAspect = _canvasWidth / _canvasHeight;

    if (srcAspect > dstAspect) {
      final h = _canvasWidth / srcAspect;
      return Rect.fromLTWH(0, (_canvasHeight - h) / 2, _canvasWidth, h);
    } else {
      final w = _canvasHeight * srcAspect;
      return Rect.fromLTWH((_canvasWidth - w) / 2, 0, w, _canvasHeight);
    }
  }

  void moveCorner(String corner, Offset delta) {
    final rect = imageRect;
    Offset clamp(Offset o) => Offset(
          o.dx.clamp(rect.left, rect.right),
          o.dy.clamp(rect.top, rect.bottom),
        );

    switch (corner) {
      case 'topLeft':     topLeft     = clamp(topLeft! + delta);
      case 'topRight':    topRight    = clamp(topRight! + delta);
      case 'bottomLeft':  bottomLeft  = clamp(bottomLeft! + delta);
      case 'bottomRight': bottomRight = clamp(bottomRight! + delta);
    }
    notifyListeners();
  }

  void toggleEnhance(bool value) {
    isEnhanced = value;
    notifyListeners();
  }

  /// Converts canvas-space corner positions to normalized [0, 1] image coordinates.
  Map<String, double> get normalizedCropPoints {
    final rect = imageRect;
    double norm(double v, double start, double size) =>
        size > 0 ? ((v - start) / size).clamp(0.0, 1.0) : 0.0;

    return {
      'topLeftX':     norm(topLeft!.dx,     rect.left, rect.width),
      'topLeftY':     norm(topLeft!.dy,     rect.top,  rect.height),
      'topRightX':    norm(topRight!.dx,    rect.left, rect.width),
      'topRightY':    norm(topRight!.dy,    rect.top,  rect.height),
      'bottomLeftX':  norm(bottomLeft!.dx,  rect.left, rect.width),
      'bottomLeftY':  norm(bottomLeft!.dy,  rect.top,  rect.height),
      'bottomRightX': norm(bottomRight!.dx, rect.left, rect.width),
      'bottomRightY': norm(bottomRight!.dy, rect.top,  rect.height),
    };
  }

  /// Processes the crop in a background isolate. Returns the output image path.
  Future<String> processCrop() async {
    final pts = normalizedCropPoints;
    await ScanQualityService.processImage(
      filePath: imagePath,
      topLeftX:     pts['topLeftX']!,
      topLeftY:     pts['topLeftY']!,
      topRightX:    pts['topRightX']!,
      topRightY:    pts['topRightY']!,
      bottomLeftX:  pts['bottomLeftX']!,
      bottomLeftY:  pts['bottomLeftY']!,
      bottomRightX: pts['bottomRightX']!,
      bottomRightY: pts['bottomRightY']!,
      enhance:      isEnhanced,
    );
    // processImage writes in-place; return original path as the processed result
    return imagePath;
  }
}
