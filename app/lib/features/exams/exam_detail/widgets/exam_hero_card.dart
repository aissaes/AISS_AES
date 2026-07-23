import 'package:flutter/material.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../shared/widgets/app_badge.dart';
import '../../models/exam_model.dart';

// =============================================================================
// EXAM HERO CARD
// Subject info: code badge, name, type, department, marks.
// Uses shared AppBadge for 100% design system consistency.
// =============================================================================
class ExamHeroCard extends StatelessWidget {
  final ExamModel exam;

  const ExamHeroCard({super.key, required this.exam});

  @override
  Widget build(BuildContext context) {
    final marks = exam.maxMarks.toStringAsFixed(0);
    final subtitle = exam.department != 'N/A'
        ? '${exam.examType} • ${exam.course} • ${exam.department} (Sem ${exam.semester})'
        : '${exam.examType} • ${exam.course} (Sem ${exam.semester})';

    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: AppTheme.surfaceColor,
        borderRadius: BorderRadius.circular(AppTheme.borderRadiusLarge),
        boxShadow: AppTheme.softShadow,
        border: Border.all(color: AppTheme.outlineColor),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              AppBadge.soft(label: exam.subjectCode, color: AppTheme.primaryColor, fontSize: 12),
              const AppBadge(
                label: 'SECURE',
                icon: Icon(Icons.check_circle_rounded, size: 12, color: AppTheme.successColor),
                color: AppTheme.successColor,
                fontSize: 10,
              ),
            ],
          ),
          const SizedBox(height: 16),
          Text(
            exam.subjectName,
            style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w800, color: AppTheme.textPrimary, letterSpacing: -0.5),
          ),
          const SizedBox(height: 4),
          Text(subtitle, style: const TextStyle(color: AppTheme.textSecondary, fontSize: 13, fontWeight: FontWeight.w500)),
          const SizedBox(height: 24),
          const Divider(height: 1, color: AppTheme.outlineColor),
          const SizedBox(height: 24),
          Row(
            children: [
              _DetailItem(icon: Icons.star_outline_rounded, label: 'Maximum Marks', value: '$marks Marks'),
              const Spacer(),
              const _DetailItem(icon: Icons.auto_stories_outlined, label: 'Expected', value: 'Single Scanned Page'),
            ],
          ),
        ],
      ),
    );
  }
}

class _DetailItem extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;

  const _DetailItem({required this.icon, required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Icon(icon, size: 14, color: AppTheme.textSecondary),
            const SizedBox(width: 6),
            Text(
              label.toUpperCase(),
              style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: AppTheme.textSecondary, letterSpacing: 0.5),
            ),
          ],
        ),
        const SizedBox(height: 4),
        Text(value, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600, color: AppTheme.textPrimary)),
      ],
    );
  }
}
