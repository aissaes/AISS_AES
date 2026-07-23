import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../../../../../core/theme/app_theme.dart';
import '../../../../../shared/widgets/app_badge.dart';

// =============================================================================
// UPCOMING EXAM CARD
// Priority card variant displayed when an exam is scheduled next.
// Uses shared AppBadge for 100% design system consistency.
// =============================================================================
class UpcomingExamCardVariant extends StatelessWidget {
  final Map<String, dynamic> data;

  const UpcomingExamCardVariant({super.key, required this.data});

  @override
  Widget build(BuildContext context) {
    final startsInHours = data['startsInHours'] ?? 0;
    final startTimeStr = data['startTime'] != null
        ? DateFormat('hh:mm a').format(DateTime.parse(data['startTime']).toLocal())
        : '09:00 AM';

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: AppTheme.surfaceColor,
        borderRadius: BorderRadius.circular(AppTheme.borderRadius2XL),
        border: Border.all(color: Colors.orange.withValues(alpha: 0.3), width: 1.5),
        boxShadow: AppTheme.softShadow,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              AppBadge.soft(
                icon: const Icon(Icons.access_time_filled_rounded, color: Colors.orange, size: 10),
                label: 'NEXT EXAM',
                color: Colors.orange,
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
          const SizedBox(height: 6),
          Text(
            'Tomorrow • $startTimeStr',
            style: const TextStyle(color: AppTheme.textSecondary, fontSize: 13),
          ),
          const Divider(height: 32, color: AppTheme.outlineVariant, thickness: 0.5),
          Row(
            children: [
              const Icon(Icons.timer_outlined, color: AppTheme.textSecondary, size: 16),
              const SizedBox(width: 6),
              Text(
                'Starts in $startsInHours Hours',
                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: AppTheme.textPrimary),
              ),
              const Spacer(),
              TextButton(
                onPressed: () => context.go('/exams'),
                style: TextButton.styleFrom(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  minimumSize: Size.zero,
                  tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                ),
                child: const Text('View Token Details'),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
