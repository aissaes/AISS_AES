import 'package:flutter/material.dart';
import '../../../core/theme/app_theme.dart';

class ScanGuideOverlay extends StatelessWidget {
  final bool isAligned;

  const ScanGuideOverlay({
    super.key,
    required this.isAligned,
  });

  @override
  Widget build(BuildContext context) {
    final size = MediaQuery.of(context).size;
    final frameWidth = size.width * 0.85;
    final frameHeight = size.height * 0.65;

    return Center(
      child: Container(
        width: frameWidth,
        height: frameHeight,
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: isAligned ? AppTheme.secondaryColor : Colors.white54,
            width: 2,
          ),
        ),
        child: Stack(
          children: [
            // Frame corner accents
            Positioned(
              top: -2,
              left: -2,
              child: Container(
                width: 24,
                height: 24,
                decoration: BoxDecoration(
                  border: Border(
                    top: BorderSide(color: isAligned ? AppTheme.secondaryColor : Colors.white, width: 4),
                    left: BorderSide(color: isAligned ? AppTheme.secondaryColor : Colors.white, width: 4),
                  ),
                ),
              ),
            ),
            Positioned(
              top: -2,
              right: -2,
              child: Container(
                width: 24,
                height: 24,
                decoration: BoxDecoration(
                  border: Border(
                    top: BorderSide(color: isAligned ? AppTheme.secondaryColor : Colors.white, width: 4),
                    right: BorderSide(color: isAligned ? AppTheme.secondaryColor : Colors.white, width: 4),
                  ),
                ),
              ),
            ),
            Positioned(
              bottom: -2,
              left: -2,
              child: Container(
                width: 24,
                height: 24,
                decoration: BoxDecoration(
                  border: Border(
                    bottom: BorderSide(color: isAligned ? AppTheme.secondaryColor : Colors.white, width: 4),
                    left: BorderSide(color: isAligned ? AppTheme.secondaryColor : Colors.white, width: 4),
                  ),
                ),
              ),
            ),
            Positioned(
              bottom: -2,
              right: -2,
              child: Container(
                width: 24,
                height: 24,
                decoration: BoxDecoration(
                  border: Border(
                    bottom: BorderSide(color: isAligned ? AppTheme.secondaryColor : Colors.white, width: 4),
                    right: BorderSide(color: isAligned ? AppTheme.secondaryColor : Colors.white, width: 4),
                  ),
                ),
              ),
            ),
            Center(
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                decoration: BoxDecoration(
                  color: Colors.black54,
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Text(
                  isAligned ? 'Page Aligned — Ready to Capture' : 'Align Page Within Frame',
                  style: TextStyle(
                    color: isAligned ? AppTheme.secondaryColor : Colors.white,
                    fontWeight: FontWeight.w600,
                    fontSize: 12,
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
