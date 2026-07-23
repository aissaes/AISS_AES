import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../../core/theme/app_theme.dart';

class CropToolbar extends StatelessWidget {
  final bool isEnhanced;
  final ValueChanged<bool> onToggleEnhance;
  final VoidCallback onConfirmCrop;

  const CropToolbar({
    super.key,
    required this.isEnhanced,
    required this.onToggleEnhance,
    required this.onConfirmCrop,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        // Enhance Toggle Control Bar
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
          color: Colors.black.withValues(alpha: 0.8),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Row(
                children: [
                  Icon(Icons.auto_fix_high_rounded, color: AppTheme.secondaryColor, size: 20),
                  SizedBox(width: 8),
                  Text(
                    'Auto-Enhance Contrast & Clarity',
                    style: TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.w600),
                  ),
                ],
              ),
              Switch.adaptive(
                value: isEnhanced,
                activeThumbColor: AppTheme.primaryColor,
                onChanged: onToggleEnhance,
              ),
            ],
          ),
        ),

        // Actions Footer (Retake / Confirm)
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
                  onPressed: () => context.pop(false),
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
                  onPressed: onConfirmCrop,
                  icon: const Icon(Icons.check_rounded),
                  label: const Text('Keep & Continue'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppTheme.secondaryColor,
                    foregroundColor: Colors.black,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    textStyle: const TextStyle(fontWeight: FontWeight.bold),
                  ),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}
