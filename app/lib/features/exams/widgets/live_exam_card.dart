import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../../core/theme/app_theme.dart';
import '../models/exam_model.dart';

class LiveExamCard extends StatelessWidget {
  final ExamModel exam;
  final VoidCallback onUnlockPressed;

  const LiveExamCard({
    super.key,
    required this.exam,
    required this.onUnlockPressed,
  });

  @override
  Widget build(BuildContext context) {
    final dateStr = exam.date != null 
        ? DateFormat('EEE, MMM d, yyyy').format(exam.date!.toLocal())
        : 'N/A';
    final subjectName = exam.subjectName;
    final subjectCode = exam.subjectCode;
    final examType = exam.examType;
    final maxMarks = exam.maxMarks;
    
    final startTime = exam.startTime;
    final endTime = exam.endTime;
    String timingsStr = 'N/A';
    if (startTime != null && endTime != null) {
      try {
        final startFormatted = DateFormat('hh:mm a').format(startTime.toLocal());
        final endFormatted = DateFormat('hh:mm a').format(endTime.toLocal());
        timingsStr = '$startFormatted - $endFormatted';
      } catch (_) {}
    }

    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: AppTheme.surfaceColor,
        borderRadius: BorderRadius.circular(AppTheme.borderRadius2XL),
        boxShadow: AppTheme.premiumShadow,
        border: Border.all(
          color: AppTheme.errorColor.withValues(alpha: 0.6),
          width: 2.0,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: AppTheme.errorColor.withValues(alpha: 0.08),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: const Text(
                  'LIVE NOW',
                  style: TextStyle(
                    color: AppTheme.errorColor,
                    fontSize: 9,
                    fontWeight: FontWeight.w900,
                    letterSpacing: 0.5,
                  ),
                ),
              ),
              const Spacer(),
              Text(
                subjectCode,
                style: const TextStyle(
                  color: AppTheme.textSecondary,
                  fontSize: 12,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Text(
            subjectName,
            style: const TextStyle(
              fontWeight: FontWeight.w900,
              fontSize: 17,
              color: AppTheme.textPrimary,
              letterSpacing: -0.2,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            '$examType • Max Marks: ${maxMarks.toStringAsFixed(0)}',
            style: const TextStyle(
              color: AppTheme.textSecondary,
              fontSize: 12,
            ),
          ),
          const SizedBox(height: 14),
          const Divider(color: AppTheme.outlineColor, height: 1),
          const SizedBox(height: 14),
          Row(
            children: [
              const Icon(Icons.date_range_rounded, size: 14, color: AppTheme.textSecondary),
              const SizedBox(width: 6),
              Text(
                dateStr,
                style: const TextStyle(fontSize: 12, color: AppTheme.textSecondary, fontWeight: FontWeight.w500),
              ),
              const SizedBox(width: 20),
              const Icon(Icons.access_time_rounded, size: 14, color: AppTheme.textSecondary),
              const SizedBox(width: 6),
              Text(
                timingsStr,
                style: const TextStyle(fontSize: 12, color: AppTheme.textSecondary, fontWeight: FontWeight.w500),
              ),
            ],
          ),
          const SizedBox(height: 16),
          ElevatedButton.icon(
            onPressed: onUnlockPressed,
            icon: const Icon(Icons.lock_open_rounded, size: 16),
            label: const Text('Unlock script upload'),
            style: ElevatedButton.styleFrom(
              minimumSize: const Size(double.infinity, 44),
              backgroundColor: AppTheme.successColor,
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(AppTheme.borderRadiusMedium),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
