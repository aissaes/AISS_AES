import 'package:flutter/material.dart';
import '../../../../../core/theme/app_theme.dart';

// =============================================================================
// SEMESTER OVERVIEW CARD
// Default priority card variant showing general semester progress.
// =============================================================================
class SemesterOverviewCardVariant extends StatelessWidget {
  final Map<String, dynamic> data;

  const SemesterOverviewCardVariant({super.key, required this.data});

  @override
  Widget build(BuildContext context) {
    final semesterName    = data['semesterName'] ?? 'Semester Overview';
    final coursesCount    = data['coursesCount'] ?? 0;
    final totalCredits    = data['totalCredits'] ?? 0;
    final completedExams  = data['completedExams'] ?? 0;
    final totalExams      = data['totalExams'] ?? 0;

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(AppTheme.borderRadius2XL),
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [AppTheme.primaryColor, AppTheme.primaryContainer],
        ),
        boxShadow: [
          BoxShadow(
            color: AppTheme.primaryColor.withValues(alpha: 0.3),
            blurRadius: 20,
            offset: const Offset(0, 10),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                semesterName.toString().toUpperCase(),
                style: const TextStyle(
                  color: Colors.white70,
                  fontSize: 11,
                  fontWeight: FontWeight.w900,
                  letterSpacing: 1.5,
                ),
              ),
              const Icon(Icons.dashboard_customize_rounded, color: Colors.white70, size: 16),
            ],
          ),
          const SizedBox(height: 16),
          const Text(
            'Academic Control Center',
            style: TextStyle(color: Colors.white, fontSize: 22, fontWeight: FontWeight.w900, letterSpacing: -0.5),
          ),
          const SizedBox(height: 4),
          const Text(
            'System fully operational. Tap tabs below to view detailed timelines.',
            style: TextStyle(color: Colors.white70, fontSize: 12),
          ),
          const SizedBox(height: 24),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              _MetricItem(value: '$coursesCount', label: 'Courses'),
              _MetricItem(value: '$totalCredits', label: 'Credits'),
              _MetricItem(value: '$completedExams / $totalExams', label: 'Exams Done'),
            ],
          ),
        ],
      ),
    );
  }
}

class _MetricItem extends StatelessWidget {
  final String value;
  final String label;

  const _MetricItem({required this.value, required this.label});

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          value,
          style: const TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.w900),
        ),
        const SizedBox(height: 2),
        Text(
          label.toUpperCase(),
          style: const TextStyle(color: Colors.white54, fontSize: 8, fontWeight: FontWeight.bold, letterSpacing: 0.5),
        ),
      ],
    );
  }
}
