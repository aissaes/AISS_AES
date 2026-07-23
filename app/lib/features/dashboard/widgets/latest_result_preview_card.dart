import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/theme/app_theme.dart';
import '../models/dashboard_data_model.dart';

// =============================================================================
// LATEST RESULT PREVIEW CARD
// Preview card showing score for the most recently evaluated subject.
// =============================================================================
class LatestResultPreviewCard extends StatelessWidget {
  final DashboardLatestResult result;

  const LatestResultPreviewCard({super.key, required this.result});

  @override
  Widget build(BuildContext context) {
    final marks = result.marksObtained.toStringAsFixed(0);
    final max = result.maxMarks.toStringAsFixed(0);
    final percent = (result.maxMarks > 0)
        ? ((result.marksObtained / result.maxMarks) * 100).toInt()
        : 0;

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: AppTheme.surfaceColor,
        borderRadius: BorderRadius.circular(AppTheme.borderRadiusLarge),
        border: Border.all(color: AppTheme.outlineVariant.withValues(alpha: 0.3)),
        boxShadow: AppTheme.softShadow,
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: AppTheme.primaryColor.withValues(alpha: 0.08),
              shape: BoxShape.circle,
            ),
            child: const Icon(Icons.stars_rounded, color: AppTheme.primaryColor, size: 24),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  '${result.subjectCode} • ${result.subjectName}',
                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: AppTheme.textPrimary),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 4),
                Text(
                  'Score: $marks/$max ($percent%)',
                  style: const TextStyle(color: AppTheme.textSecondary, fontSize: 12),
                ),
              ],
            ),
          ),
          IconButton(
            icon: const Icon(Icons.arrow_forward_ios_rounded, size: 14, color: AppTheme.textSecondary),
            onPressed: () {
              if (result.examId.isNotEmpty) {
                context.push('/results/detail/${result.examId}');
              } else {
                context.go('/results');
              }
            },
          ),
        ],
      ),
    );
  }
}
