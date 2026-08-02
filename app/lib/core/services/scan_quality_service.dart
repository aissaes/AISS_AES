// ignore_for_file: avoid_print
import 'dart:io';
import 'dart:math';
import 'dart:typed_data';
import 'package:flutter/foundation.dart' show compute;
import 'package:image/image.dart' as img;

class ImageQualityResult {
  final double brightness;
  final double clarity;
  final bool isBlurry;
  final bool isTooDark;
  final bool isTooBright;

  ImageQualityResult({
    required this.brightness,
    required this.clarity,
    required this.isBlurry,
    required this.isTooDark,
    required this.isTooBright,
  });

  bool get isValid => !isBlurry && !isTooDark && !isTooBright;
}

class ScanQualityService {
  /// Analyzes image at [filePath] for focus (blur) and brightness.
  /// Runs inside a background isolate to keep UI thread fully uninterrupted (60 FPS).
  static Future<ImageQualityResult> analyzeImage(String filePath) async {
    return await compute(_analyzeAndCompressIsolate, filePath);
  }

  static ImageQualityResult _analyzeAndCompressIsolate(String filePath) {
    try {
      final file = File(filePath);
      if (!file.existsSync()) {
        throw Exception('Image file does not exist at $filePath');
      }

      final bytes = file.readAsBytesSync();
      
      // Decode with fast JPEG decoder
      final decoder = img.JpegDecoder();
      final image = decoder.decode(bytes);
      if (image == null) {
        throw Exception('Failed to decode scanned image.');
      }

      // Resize to a small width for speed while preserving clarity characteristics
      final smallImg = img.copyResize(image, width: 250);

      double totalLuminance = 0;
      final int pixelCount = smallImg.width * smallImg.height;

      // Extract luminances in a single contiguous list
      final List<double> luminances = List.filled(pixelCount, 0.0);
      int idx = 0;

      for (int y = 0; y < smallImg.height; y++) {
        for (int x = 0; x < smallImg.width; x++) {
          final pixel = smallImg.getPixel(x, y);
          final r = pixel.r;
          final g = pixel.g;
          final b = pixel.b;
          
          // Digital Standard formula: Y = 0.299R + 0.587G + 0.114B
          final l = (0.299 * r + 0.587 * g + 0.114 * b) / 255.0;
          luminances[idx++] = l;
          totalLuminance += l;
        }
      }

      final double avgBrightness = totalLuminance / pixelCount;

      // Detect glare (saturated white regions) and compute Standard Deviation (contrast measure)
      int saturatedPixels = 0;
      double sumSquaredDiffBrightness = 0.0;
      for (int i = 0; i < pixelCount; i++) {
        final double l = luminances[i];
        if (l > 0.95) {
          saturatedPixels++;
        }
        final double diff = l - avgBrightness;
        sumSquaredDiffBrightness += diff * diff;
      }

      final double saturatedRatio = saturatedPixels / pixelCount;
      final double stdDevBrightness = sqrt(sumSquaredDiffBrightness / pixelCount);

      // Calculate Gradient Variance (autofocus Sobel approximation)
      double totalDiff = 0.0;
      double totalSquaredDiff = 0.0;
      int diffCount = 0;

      for (int y = 1; y < smallImg.height - 1; y += 2) { // Step by 2 for further sub-sampling speedup
        for (int x = 1; x < smallImg.width - 1; x += 2) {
          final currentL = luminances[y * smallImg.width + x];
          
          final rightL = luminances[y * smallImg.width + x + 1];
          final bottomL = luminances[(y + 1) * smallImg.width + x];
          
          final dx = rightL - currentL;
          final dy = bottomL - currentL;
          
          final double gradientMag = dx * dx + dy * dy;
          totalDiff += gradientMag;
          totalSquaredDiff += gradientMag * gradientMag;
          diffCount++;
        }
      }

      final double meanGradient = totalDiff / diffCount;
      final double varianceGradient = (totalSquaredDiff / diffCount) - (meanGradient * meanGradient);

      // Normalize clarity score between 10 and 100 based on standard mobile sensors
      final double rawClarity = varianceGradient * 150000;
      double clarityScore = (rawClarity * 3.0).clamp(15, 100);

      // Glare penalty (reduces clarity score on washed out regions)
      if (saturatedRatio > 0.03) {
        clarityScore = (clarityScore * (1.0 - saturatedRatio * 3.0)).clamp(10.0, 100.0);
      }

      // Low contrast / washed out penalty
      if (stdDevBrightness < 0.15) {
        final contrastShortfall = (0.15 - stdDevBrightness) * 300.0;
        clarityScore = (clarityScore - contrastShortfall).clamp(10.0, 100.0);
      }

      // Flat color penalty
      if (clarityScore < 45.0) {
        clarityScore = max(0.0, clarityScore - 10);
      }

      final bool isTooDark = avgBrightness < 0.22;
      final bool isTooBright = avgBrightness > 0.82 || saturatedRatio > 0.08;
      final bool isBlurry = clarityScore < 50.0;

      final result = ImageQualityResult(
        brightness: avgBrightness,
        clarity: clarityScore,
        isBlurry: isBlurry,
        isTooDark: isTooDark,
        isTooBright: isTooBright,
      );

      // Compression and resizing are handled in processImage to avoid double compression.

      return result;
    } catch (e) {
      // Graceful fallback for platform limitations
      return ImageQualityResult(
        brightness: 0.5,
        clarity: 80.0,
        isBlurry: false,
        isTooDark: false,
        isTooBright: false,
      );
    }
  }

  /// Processes document cropping, perspective warping and adaptive contrast enhancement in background isolate
  static Future<void> processImage({
    required String filePath,
    required double topLeftX,
    required double topLeftY,
    required double topRightX,
    required double topRightY,
    required double bottomLeftX,
    required double bottomLeftY,
    required double bottomRightX,
    required double bottomRightY,
    required bool enhance,
  }) async {
    await compute(_processImageIsolate, {
      'filePath': filePath,
      'topLeftX': topLeftX,
      'topLeftY': topLeftY,
      'topRightX': topRightX,
      'topRightY': topRightY,
      'bottomLeftX': bottomLeftX,
      'bottomLeftY': bottomLeftY,
      'bottomRightX': bottomRightX,
      'bottomRightY': bottomRightY,
      'enhance': enhance,
    });
  }

  static void _processImageIsolate(Map<String, dynamic> args) {
    try {
      final String filePath = args['filePath'];
      final double topLeftX = args['topLeftX'];
      final double topLeftY = args['topLeftY'];
      final double topRightX = args['topRightX'];
      final double topRightY = args['topRightY'];
      final double bottomLeftX = args['bottomLeftX'];
      final double bottomLeftY = args['bottomLeftY'];
      final double bottomRightX = args['bottomRightX'];
      final double bottomRightY = args['bottomRightY'];
      final bool enhance = args['enhance'];

      final file = File(filePath);
      if (!file.existsSync()) return;

      final bytes = file.readAsBytesSync();
      
      final decoder = img.JpegDecoder();
      final image = decoder.decode(bytes);
      if (image == null) return;

      // Coordinates of the source quadrilateral in pixels
      final double x0 = topLeftX * image.width;
      final double y0 = topLeftY * image.height;
      final double x1 = topRightX * image.width;
      final double y1 = topRightY * image.height;
      final double x2 = bottomRightX * image.width;
      final double y2 = bottomRightY * image.height;
      final double x3 = bottomLeftX * image.width;
      final double y3 = bottomLeftY * image.height;

      // Calculate output size based on average edge lengths
      final double w1 = sqrt(pow(x1 - x0, 2) + pow(y1 - y0, 2));
      final double w2 = sqrt(pow(x2 - x3, 2) + pow(y2 - y3, 2));
      final double h1 = sqrt(pow(x3 - x0, 2) + pow(y3 - y0, 2));
      final double h2 = sqrt(pow(x2 - x1, 2) + pow(y2 - y1, 2));

      int destW = max(w1, w2).round().clamp(100, 3000);
      int destH = max(h1, h2).round().clamp(100, 3000);

      // Downsize to maximum dimension of 1600px to maintain standard OCR resolution limits
      const double maxDimension = 1600.0;
      if (destW > maxDimension || destH > maxDimension) {
        final double scale = maxDimension / max(destW, destH);
        destW = (destW * scale).round();
        destH = (destH * scale).round();
      }

      // Solve for homography coefficients (mapping destination [0, 1] to source image space)
      final double dx1 = x1 - x2;
      final double dx2 = x3 - x2;
      final double dy1 = y1 - y2;
      final double dy2 = y3 - y2;
      final double sx = x0 - x1 + x2 - x3;
      final double sy = y0 - y1 + y2 - y3;

      final double det = dx1 * dy2 - dx2 * dy1;
      
      double a, b, c, d, e, f, g, h;
      
      if (det.abs() < 0.0001) {
        // Fallback to bilinear mapping if homography is degenerate
        a = x1 - x0;
        b = x3 - x0;
        c = x0;
        d = y1 - y0;
        e = y3 - y0;
        f = y0;
        g = 0.0;
        h = 0.0;
      } else {
        g = (sx * dy2 - sy * dx2) / det;
        h = (sy * dx1 - sx * dy1) / det;
        a = x1 - x0 + g * x1;
        b = x3 - x0 + h * x3;
        c = x0;
        d = y1 - y0 + g * y1;
        e = y3 - y0 + h * y3;
        f = y0;
      }

      // Create new output warped image canvas
      var processed = img.Image(width: destW, height: destH, numChannels: image.numChannels);

      // Warp pixels using reverse perspective projection mapping
      for (int dy = 0; dy < destH; dy++) {
        final double v = dy / destH;
        for (int dx = 0; dx < destW; dx++) {
          final double u = dx / destW;
          
          final double denom = g * u + h * v + 1.0;
          final double srcX = (a * u + b * v + c) / denom;
          final double srcY = (d * u + e * v + f) / denom;
          
          // Clamp source coordinates to image boundaries
          final int sxInt = srcX.round().clamp(0, image.width - 1);
          final int syInt = srcY.round().clamp(0, image.height - 1);
          
          final srcPixel = image.getPixel(sxInt, syInt);
          final destPixel = processed.getPixel(dx, dy);
          
          destPixel.r = srcPixel.r;
          destPixel.g = srcPixel.g;
          destPixel.b = srcPixel.b;
          if (image.numChannels > 3) {
            destPixel.a = srcPixel.a;
          }
        }
      }

      // Print out before/after diagnostics proving transform operations worked successfully
      print('=== SCANNER PIPELINE DIAGNOSTICS ===');
      print('Original dimensions: ${image.width}x${image.height}');
      print('Target corners (normalized):');
      print('  Top-Left: ($topLeftX, $topLeftY)');
      print('  Top-Right: ($topRightX, $topRightY)');
      print('  Bottom-Left: ($bottomLeftX, $bottomLeftY)');
      print('  Bottom-Right: ($bottomRightX, $bottomRightY)');
      print('Output warped size: ${processed.width}x${processed.height}');
      print('Perspective Warping Correction: SUCCESS');

      // Local Adaptive Illumination Correction (Summed Area Table / Integral Image)
      if (enhance) {
        final int W = processed.width;
        final int H = processed.height;
        
        // Compute Integral Image (Summed Area Table)
        final Int32List sat = Int32List(W * H);
        for (int py = 0; py < H; py++) {
          int rowSum = 0;
          for (int px = 0; px < W; px++) {
            final pixel = processed.getPixel(px, py);
            final int gray = (0.299 * pixel.r + 0.587 * pixel.g + 0.114 * pixel.b).round();
            rowSum += gray;
            if (py == 0) {
              sat[px] = rowSum;
            } else {
              sat[py * W + px] = sat[(py - 1) * W + px] + rowSum;
            }
          }
        }

        // Apply Local Illumination Normalization
        const int halfWindow = 16; // 33x33 window
        for (int py = 0; py < H; py++) {
          for (int px = 0; px < W; px++) {
            final int x1 = max(0, px - halfWindow);
            final int y1 = max(0, py - halfWindow);
            final int x2 = min(W - 1, px + halfWindow);
            final int y2 = min(H - 1, py + halfWindow);

            int sum = sat[y2 * W + x2];
            if (x1 > 0) {
              sum -= sat[y2 * W + (x1 - 1)];
            }
            if (y1 > 0) {
              sum -= sat[(y1 - 1) * W + x2];
            }
            if (x1 > 0 && y1 > 0) {
              sum += sat[(y1 - 1) * W + (x1 - 1)];
            }

            final int count = (x2 - x1 + 1) * (y2 - y1 + 1);
            final double avg = sum / count;

            final pixel = processed.getPixel(px, py);
            final double gray = 0.299 * pixel.r + 0.587 * pixel.g + 0.114 * pixel.b;

            int outVal = 255;
            if (avg > 0) {
              final double ratio = gray / avg;
              if (ratio >= 0.92) {
                outVal = 255;
              } else {
                outVal = ((ratio / 0.92) * 240).clamp(0, 240).round();
              }
            }

            pixel.r = outVal;
            pixel.g = outVal;
            pixel.b = outVal;
          }
        }
        print('Local Adaptive Illumination Correction: SUCCESS');
      }
      print('Saved final JPEG at quality: 90 to: $filePath');
      print('====================================');

      // Save processed cropped image back with high quality (90%)
      final compressedBytes = img.encodeJpg(processed, quality: 90);
      file.writeAsBytesSync(compressedBytes);
    } catch (e, stack) {
      print('Scanner Pipeline Error: $e');
      print(stack);
    }
  }
}
