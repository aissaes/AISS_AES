import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../../../../core/theme/app_theme.dart';
import '../../../../../shared/widgets/app_badge.dart';

// =============================================================================
// RESULT PUBLISHED CARD
// Priority card variant displayed when a new evaluation result is ready.
// Uses shared AppBadge for 100% design system consistency.
// =============================================================================
class ResultPublishedCardVariant extends StatelessWidget {
  final Map<String, dynamic> data;

  const ResultPublishedCardVariant({super.key, required this.data});

  @override
  Widget build(BuildContext context) {
    final marksObtained = data['marksObtained'] ?? 0;
    final maxMarks = data['maxMarks'] ?? 100;
    final examId = data['examId'] ?? '';

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: AppTheme.surfaceColor,
        borderRadius: BorderRadius.circular(AppTheme.borderRadius2XL),
        border: Border.all(color: AppTheme.successColor.withValues(alpha: 0.3), width: 1.5),
        boxShadow: AppTheme.softShadow,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              AppBadge.soft(
                icon: const Icon(Icons.workspace_premium_rounded, color: AppTheme.successColor, size: 10),
                label: 'RESULT PUBLISHED',
                color: AppTheme.successColor,
              ),
              const Spacer(),
              Text(
                data['subjectCode'] ?? '',
                style: const TextStyle(color: AppTheme.textSecondary, fontSize: 12, fontWeight: FontWeight.bold),
              ),
            ],
          ),
          const SizedBox(height: 16),
          Text(
            data['subjectName'] ?? '',
            style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 20, color: AppTheme.textPrimary, height: 1.2),
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: AppTheme.successColor.withValues(alpha: 0.08),
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.check_circle_outline_rounded, color: AppTheme.successColor, size: 26),
              ),
              const SizedBox(width: 16),
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'MARKS OBTAINED',
                    style: TextStyle(color: AppTheme.textSecondary, fontSize: 10, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    '$marksObtained / $maxMarks',
                    style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 18, color: AppTheme.textPrimary),
                  ),
                ],
              ),
              const Spacer(),
              ElevatedButton(
                onPressed: () {
                  if (examId.isNotEmpty) {
                    context.push('/results/detail/$examId');
                  } else {
                    context.go('/results');
                  }
                },
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppTheme.primaryColor,
                  foregroundColor: Colors.white,
                  minimumSize: const Size(110, 44),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(AppTheme.borderRadiusLarge),
                  ),
                  elevation: 0,
                ),
                child: const Text('View Script'),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
