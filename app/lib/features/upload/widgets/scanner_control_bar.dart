import 'dart:io';
import 'package:flutter/material.dart';
import '../../../core/theme/app_theme.dart';

class ScannerControlBar extends StatelessWidget {
  final List<String> imagePaths;
  final bool isAligned;
  final VoidCallback onTakePicture;
  final VoidCallback onNavigateToReview;

  const ScannerControlBar({
    super.key,
    required this.imagePaths,
    required this.isAligned,
    required this.onTakePicture,
    required this.onNavigateToReview,
  });

  @override
  Widget build(BuildContext context) {
    final hasImages = imagePaths.isNotEmpty;

    return Align(
      alignment: Alignment.bottomCenter,
      child: Container(
        padding: const EdgeInsets.fromLTRB(24, 32, 24, 48),
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [
              Colors.transparent,
              Colors.black.withValues(alpha: 0.8),
            ],
          ),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceAround,
          children: [
            // Thumbnail Preview
            GestureDetector(
              onTap: hasImages ? onNavigateToReview : null,
              child: Container(
                width: 54,
                height: 54,
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: Colors.white, width: 2),
                  color: Colors.white10,
                ),
                child: hasImages
                    ? ClipRRect(
                        borderRadius: BorderRadius.circular(10),
                        child: Image.file(File(imagePaths.last), fit: BoxFit.cover),
                      )
                    : const Icon(Icons.photo_library_rounded, color: Colors.white70),
              ),
            ),

            // Shutter Button
            GestureDetector(
              onTap: onTakePicture,
              child: Container(
                width: 80,
                height: 80,
                padding: const EdgeInsets.all(4),
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  border: Border.all(color: Colors.white, width: 4),
                ),
                child: Container(
                  decoration: const BoxDecoration(
                    color: Colors.white,
                    shape: BoxShape.circle,
                  ),
                  child: isAligned
                      ? const Icon(Icons.camera_rounded, size: 40, color: Colors.black)
                      : null,
                ),
              ),
            ),

            // Done / Review Check Button
            InkWell(
              onTap: hasImages ? onNavigateToReview : () {},
              borderRadius: BorderRadius.circular(27),
              child: Container(
                width: 54,
                height: 54,
                decoration: BoxDecoration(
                  color: hasImages ? AppTheme.primaryColor : Colors.white10,
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.check_rounded, color: Colors.white, size: 24),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
