import 'package:flutter/material.dart';
import '../../../../core/theme/app_theme.dart';
import '../models/dashboard_data_model.dart';

// =============================================================================
// SEMESTER SNAPSHOT GRID
// 2x2 grid of stat tiles: courses, credits, upcoming exams, completed exams.
// =============================================================================
class SemesterSnapshotGrid extends StatelessWidget {
  final DashboardSemesterSnapshot snapshot;

  const SemesterSnapshotGrid({super.key, required this.snapshot});

  @override
  Widget build(BuildContext context) {
    return GridView.count(
      crossAxisCount: 2,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      crossAxisSpacing: 16,
      mainAxisSpacing: 16,
      childAspectRatio: 1.9,
      children: [
        _SnapshotCard(icon: Icons.book_outlined,          title: 'Courses Enrolled', value: '${snapshot.coursesCount}',   color: const Color(0xFFE8EAF6), iconColor: AppTheme.primaryColor),
        _SnapshotCard(icon: Icons.badge_outlined,         title: 'Semester Credits', value: '${snapshot.totalCredits}',   color: const Color(0xFFFFF3E0), iconColor: Colors.orange),
        _SnapshotCard(icon: Icons.pending_actions_rounded, title: 'Upcoming Exams',  value: '${snapshot.upcomingExams}',  color: const Color(0xFFE0F2F1), iconColor: Colors.teal),
        _SnapshotCard(icon: Icons.task_alt_rounded,       title: 'Exams Completed',  value: '${snapshot.completedExams}', color: const Color(0xFFFCE4EC), iconColor: Colors.pink),
      ],
    );
  }
}

class _SnapshotCard extends StatelessWidget {
  final IconData icon;
  final String title;
  final String value;
  final Color color;
  final Color iconColor;

  const _SnapshotCard({
    required this.icon,
    required this.title,
    required this.value,
    required this.color,
    required this.iconColor,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppTheme.surfaceColor,
        borderRadius: BorderRadius.circular(AppTheme.borderRadiusLarge),
        border: Border.all(color: AppTheme.outlineVariant.withValues(alpha: 0.3)),
        boxShadow: AppTheme.softShadow,
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(color: color, borderRadius: BorderRadius.circular(8)),
            child: Icon(icon, color: iconColor, size: 20),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text(value, style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 16, color: AppTheme.textPrimary)),
                const SizedBox(height: 2),
                Text(title, style: const TextStyle(color: AppTheme.textSecondary, fontSize: 10, fontWeight: FontWeight.w500), maxLines: 1, overflow: TextOverflow.ellipsis),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
