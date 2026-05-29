import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';

class AppImage extends StatelessWidget {
  final String path;
  final BoxFit fit;
  final double? width;
  final double? height;

  const AppImage({
    super.key,
    required this.path,
    this.fit = BoxFit.cover,
    this.width,
    this.height,
  });

  @override
  Widget build(BuildContext context) {
    if (kIsWeb) {
      // On web, if it's a local path from picker, it might be a blob URL or network URL
      if (path.startsWith('http') || path.startsWith('blob:')) {
        return Image.network(
          path,
          fit: fit,
          width: width,
          height: height,
          errorBuilder: (context, error, stackTrace) => _buildErrorWidget(),
        );
      }
      // If it's a local asset or something else, handled accordingly. 
      // For this app's context, scanned images on web would likely be blob/network or memory.
      return _buildErrorWidget();
    } else {
      return Image.file(
        File(path),
        fit: fit,
        width: width,
        height: height,
        errorBuilder: (context, error, stackTrace) => _buildErrorWidget(),
      );
    }
  }

  Widget _buildErrorWidget() {
    return Container(
      width: width,
      height: height,
      color: Colors.grey[200],
      child: const Icon(Icons.broken_image_outlined, color: Colors.grey),
    );
  }
}
