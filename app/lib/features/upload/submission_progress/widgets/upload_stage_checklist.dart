import 'package:flutter/material.dart';
import '../../../../core/theme/app_theme.dart';

// =============================================================================
// UPLOAD STAGE CHECKLIST
// 4-step visual checklist driven by currentStage string matching.
// =============================================================================
class UploadStageChecklist extends StatelessWidget {
  final String currentStage;
  final bool isDone;

  const UploadStageChecklist({
    super.key,
    required this.currentStage,
    required this.isDone,
  });

  static const _steps = [
    'Capturing & Compiling PDF',
    'Contrast Enhancement Processing',
    'Streaming Pages to Server',
    'Finalizing Server Cache',
  ];

  bool _isCompleted(int index) {
    return switch (index) {
      0 => currentStage == 'Optimizing contrast & clarity...' ||
           currentStage == 'Acquiring secure upload window' ||
           currentStage.startsWith('Streaming PDF Answer') ||
           currentStage == 'Finalizing upload cache' || isDone,
      1 => currentStage == 'Acquiring secure upload window' ||
           currentStage.startsWith('Streaming PDF Answer') ||
           currentStage == 'Finalizing upload cache' || isDone,
      2 => currentStage == 'Finalizing upload cache' || isDone,
      3 => isDone,
      _ => false,
    };
  }

  bool _isCurrent(int index) {
    return switch (index) {
      0 => currentStage == 'Initializing upload window...' || currentStage == 'Compiling answer script into PDF...',
      1 => currentStage == 'Optimizing contrast & clarity...',
      2 => currentStage == 'Acquiring secure upload window' || currentStage.startsWith('Streaming PDF Answer'),
      3 => currentStage == 'Finalizing upload cache',
      _ => false,
    };
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: AppTheme.surfaceColor,
        borderRadius: BorderRadius.circular(AppTheme.borderRadiusLarge),
        border: Border.all(color: AppTheme.outlineColor),
      ),
      child: Column(
        children: [
          for (var i = 0; i < _steps.length; i++) ...[
            if (i > 0) const SizedBox(height: 16),
            _UploadStepItem(label: _steps[i], isCompleted: _isCompleted(i), isCurrent: _isCurrent(i)),
          ],
        ],
      ),
    );
  }
}

class _UploadStepItem extends StatelessWidget {
  final String label;
  final bool isCompleted;
  final bool isCurrent;

  const _UploadStepItem({required this.label, required this.isCompleted, required this.isCurrent});

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        AnimatedContainer(
          duration: const Duration(milliseconds: 300),
          width: 24,
          height: 24,
          decoration: BoxDecoration(
            color: isCompleted ? AppTheme.successColor : (isCurrent ? AppTheme.primaryColor : Colors.transparent),
            shape: BoxShape.circle,
            border: Border.all(
              color: isCompleted || isCurrent ? Colors.transparent : AppTheme.outlineColor,
              width: 2,
            ),
          ),
          child: isCompleted
              ? const Icon(Icons.check, size: 14, color: Colors.white)
              : (isCurrent
                  ? const Center(child: SizedBox(width: 8, height: 8, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white)))
                  : null),
        ),
        const SizedBox(width: 16),
        Expanded(
          child: Text(
            label,
            style: TextStyle(
              fontSize: 15,
              fontWeight: isCurrent ? FontWeight.w700 : FontWeight.w500,
              color: isCurrent ? AppTheme.textPrimary : AppTheme.textSecondary,
            ),
          ),
        ),
      ],
    );
  }
}
