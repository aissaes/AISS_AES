import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/services/scan_quality_service.dart';
import '../providers/scanner_provider.dart';

class QualityAlertScreen extends ConsumerWidget {
  const QualityAlertScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final scannerState = ref.watch(scannerProvider);
    
    final quality = scannerState.qualityResults.isNotEmpty 
        ? scannerState.qualityResults.last 
        : ImageQualityResult(
            brightness: 0.5,
            clarity: 80.0,
            isBlurry: false,
            isTooDark: false,
            isTooBright: false,
          );

    final int clarityScore = quality.clarity.toInt();
    final double clarityPercent = quality.clarity / 100.0;

    String warningTitle = 'Readability Warning';
    String warningMessage = 'Image quality is low. Please retake.';
    IconData warningIcon = Icons.visibility_off_rounded;
    Color warningColor = AppTheme.errorColor;

    if (quality.isBlurry) {
      warningTitle = 'Blurry Scan Detected';
      warningMessage = 'This page appears to be blurry. Clear scans are required for accurate grading.';
      warningIcon = Icons.blur_on_rounded;
    } else if (quality.isTooDark) {
      warningTitle = 'Low Lighting Warning';
      warningMessage = 'This page appears to be too dark. Please ensure even and bright lighting.';
      warningIcon = Icons.dark_mode_rounded;
      warningColor = Colors.orange;
    } else if (quality.isTooBright) {
      warningTitle = 'Glare / Flash Warning';
      warningMessage = 'This page appears to be overexposed. Avoid direct camera flash reflections.';
      warningIcon = Icons.wb_sunny_rounded;
      warningColor = Colors.orange;
    }

    return Scaffold(
      backgroundColor: Colors.transparent,
      body: Stack(
        children: [
          // Blurred Background
          Positioned.fill(
            child: BackdropFilter(
              filter: ImageFilter.blur(sigmaX: 10, sigmaY: 10),
              child: Container(
                color: Colors.black.withValues(alpha: 0.6),
              ),
            ),
          ),
          
          // Warning Card
          Center(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 24.0),
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 400),
                child: Container(
                  padding: const EdgeInsets.all(32),
                  decoration: BoxDecoration(
                    color: AppTheme.surfaceColor,
                    borderRadius: BorderRadius.circular(AppTheme.borderRadiusLarge),
                    boxShadow: AppTheme.premiumShadow,
                  ),
                  child: SingleChildScrollView(
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                      Container(
                        width: 80,
                        height: 80,
                        decoration: BoxDecoration(
                          color: warningColor.withValues(alpha: 0.1),
                          shape: BoxShape.circle,
                        ),
                        child: Icon(
                          warningIcon,
                          color: warningColor,
                          size: 40,
                        ),
                      ),
                      const SizedBox(height: 24),
                      Text(
                        warningTitle,
                        textAlign: TextAlign.center,
                        style: const TextStyle(
                          fontSize: 22,
                          fontWeight: FontWeight.w800,
                          color: AppTheme.textPrimary,
                        ),
                      ),
                      const SizedBox(height: 12),
                      Text(
                        warningMessage,
                        textAlign: TextAlign.center,
                        style: const TextStyle(
                          color: AppTheme.textSecondary,
                          fontSize: 15,
                          height: 1.5,
                        ),
                      ),
                      const SizedBox(height: 32),
                      
                      // Quality Indicator
                      Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: AppTheme.backgroundColor,
                          borderRadius: BorderRadius.circular(AppTheme.borderRadiusMedium),
                        ),
                        child: Column(
                          children: [
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                const Text(
                                  'Clarity Score',
                                  style: TextStyle(
                                    fontSize: 13,
                                    fontWeight: FontWeight.w600,
                                    color: AppTheme.textSecondary,
                                  ),
                                ),
                                Text(
                                  '$clarityScore/100',
                                  style: TextStyle(
                                    color: warningColor,
                                    fontWeight: FontWeight.w800,
                                    fontSize: 13,
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 12),
                            ClipRRect(
                              borderRadius: BorderRadius.circular(4),
                              child: LinearProgressIndicator(
                                value: clarityPercent,
                                minHeight: 8,
                                backgroundColor: Colors.white,
                                valueColor: AlwaysStoppedAnimation<Color>(warningColor),
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 32),
                      
                      // Actions
                      ElevatedButton(
                        onPressed: () {
                          // Remove the poor quality scan
                          if (scannerState.imagePaths.isNotEmpty) {
                            ref.read(scannerProvider.notifier).removeImage(scannerState.imagePaths.length - 1);
                          }
                          context.pop(); // Pop back to scanner
                        },
                        child: const Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(Icons.refresh_rounded),
                            SizedBox(width: 8),
                            Text('Retake Scan'),
                          ],
                        ),
                      ),
                      const SizedBox(height: 12),
                      TextButton(
                        onPressed: () {
                          // Dismiss dialog and route directly to review page
                          context.pop(); // Pop quality alert dialog
                          context.push('/upload/review'); // Push review page
                        },
                        style: TextButton.styleFrom(
                          foregroundColor: AppTheme.textSecondary,
                        ),
                        child: const Text('Use this scan anyway'),
                      ),
                    ],
                  ),
                ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
