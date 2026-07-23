import 'dart:io' show File;
import 'package:flutter/material.dart';
import '../../core/theme/app_theme.dart';

// =============================================================================
// SCRIPT THUMBNAIL
// Universal answer script page thumbnail tile for images and PDF pages.
// Preserves exact zoom badge and page number indicator styling.
// =============================================================================
class ScriptThumbnail extends StatelessWidget {
  final String fileUrlOrPath;
  final bool isPdf;
  final String? pageLabel;
  final double width;
  final double height;
  final VoidCallback? onTap;

  const ScriptThumbnail({
    super.key,
    required this.fileUrlOrPath,
    this.isPdf = false,
    this.pageLabel,
    this.width = 50.0,
    this.height = 50.0,
    this.onTap,
  });

  bool get _isNetwork => fileUrlOrPath.startsWith('http://') || fileUrlOrPath.startsWith('https://');

  String get _effectiveUrl {
    if (!isPdf || !_isNetwork) return fileUrlOrPath;
    return fileUrlOrPath.contains('?') ? '$fileUrlOrPath&tr=pg-1' : '$fileUrlOrPath?tr=pg-1';
  }

  @override
  Widget build(BuildContext context) {
    final imageWidget = _isNetwork
        ? Image.network(
            _effectiveUrl,
            fit: BoxFit.cover,
            errorBuilder: (_, __, ___) => _errorPlaceholder(),
          )
        : Image.file(
            File(fileUrlOrPath),
            fit: BoxFit.cover,
            errorBuilder: (_, __, ___) => _errorPlaceholder(),
          );

    final thumbnailTile = ClipRRect(
      borderRadius: BorderRadius.circular(6),
      child: Container(
        width: width,
        height: height,
        color: Colors.black.withValues(alpha: 0.03),
        child: Stack(
          alignment: Alignment.center,
          fit: StackFit.expand,
          children: [
            imageWidget,
            Container(color: Colors.black.withValues(alpha: 0.1)),
            const Icon(Icons.zoom_in_rounded, color: Colors.white, size: 18),
            if (pageLabel != null)
              Positioned(
                left: 2,
                bottom: 2,
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1),
                  decoration: BoxDecoration(color: Colors.black.withValues(alpha: 0.75), borderRadius: BorderRadius.circular(3)),
                  child: Text(pageLabel!, style: const TextStyle(color: Colors.white, fontSize: 8, fontWeight: FontWeight.bold)),
                ),
              ),
          ],
        ),
      ),
    );

    if (onTap != null) {
      return GestureDetector(onTap: onTap, child: thumbnailTile);
    }
    return thumbnailTile;
  }

  Widget _errorPlaceholder() {
    return Container(
      color: isPdf ? Colors.red.withValues(alpha: 0.08) : Colors.transparent,
      child: Center(
        child: Icon(
          isPdf ? Icons.picture_as_pdf_rounded : Icons.image_not_supported_rounded,
          color: isPdf ? Colors.red : AppTheme.outlineColor,
          size: isPdf ? 24 : 20,
        ),
      ),
    );
  }
}
