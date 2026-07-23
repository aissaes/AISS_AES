import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../../../core/theme/app_theme.dart';
import '../../models/exam_model.dart';
import 'exam_hero_card.dart';
import 'exam_timer_card.dart';

// =============================================================================
// INFO TAB (Tab 1)
// Shows exam hero card, countdown timer, and submission requirements.
// =============================================================================
class ExamInfoTab extends StatelessWidget {
  final ExamModel exam;
  final int secondsRemaining;
  final AnimationController pulseController;

  const ExamInfoTab({
    super.key,
    required this.exam,
    required this.secondsRemaining,
    required this.pulseController,
  });

  @override
  Widget build(BuildContext context) {
    final endFormatted = exam.endTime != null
        ? DateFormat('hh:mm a').format(exam.endTime!)
        : 'N/A';

    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Column(
        children: [
          ExamHeroCard(exam: exam),
          const SizedBox(height: 24),
          ExamTimerCard(
            secondsRemaining: secondsRemaining,
            endFormatted: endFormatted,
            pulseController: pulseController,
          ),
          const SizedBox(height: 24),
          const _SubmissionRequirementsSection(),
        ],
      ),
    );
  }
}

class _SubmissionRequirementsSection extends StatelessWidget {
  const _SubmissionRequirementsSection();

  static const _requirements = [
    (Icons.camera_alt_outlined, 'Live camera capture of handwritten answer scripts'),
    (Icons.cloud_upload_outlined, '15-minute dedicated secure upload session'),
    (Icons.verified_user_outlined, 'Verified academic integrity check'),
  ];

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('Requirements', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
        const SizedBox(height: 12),
        ..._requirements.map((r) => _RequirementItem(icon: r.$1, text: r.$2)),
      ],
    );
  }
}

class _RequirementItem extends StatelessWidget {
  final IconData icon;
  final String text;

  const _RequirementItem({required this.icon, required this.text});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: AppTheme.primaryColor.withValues(alpha: 0.05),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Icon(icon, size: 16, color: AppTheme.primaryColor),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Text(text, style: const TextStyle(fontSize: 13, color: AppTheme.textSecondary, fontWeight: FontWeight.w500)),
          ),
        ],
      ),
    );
  }
}
