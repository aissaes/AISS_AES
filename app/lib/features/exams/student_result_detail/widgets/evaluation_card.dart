import 'package:flutter/material.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../shared/widgets/app_badge.dart';
import 'expandable_feedback_block.dart';
import 'submitted_script_tile.dart';

// =============================================================================
// EVALUATION CARD
// Per-question result: score, grading method badge, strengths, weaknesses,
// AI feedback, reasoning, instructor note, and answer script attachment.
// Uses AppBadge for pixel-perfect status pills.
// =============================================================================
class EvaluationCard extends StatelessWidget {
  final dynamic evaluation;

  const EvaluationCard({super.key, required this.evaluation});

  @override
  Widget build(BuildContext context) {
    final qId = evaluation.questionId as String;
    final marks = evaluation.marksAwarded as double;
    final isManual = evaluation.isManuallyGraded as bool;
    final feedback = evaluation.feedback as String;
    final reasoning = evaluation.reasoning as String;
    final fileUrl = evaluation.fileUrl as String?;
    final fileType = evaluation.fileType as String;
    final strengths = evaluation.strengths as String;
    final weaknesses = evaluation.weaknesses as String;
    final overrideReason = evaluation.overrideReason as String?;

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: AppTheme.surfaceColor,
        borderRadius: BorderRadius.circular(AppTheme.borderRadiusLarge),
        boxShadow: AppTheme.softShadow,
        border: Border.all(color: AppTheme.outlineColor.withValues(alpha: 0.15)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _EvaluationCardHeader(questionId: qId, marks: marks, isManuallyGraded: isManual),
          const SizedBox(height: 20),

          if (strengths.isNotEmpty) ...[
            _LabeledBulletRow(label: 'STRENGTHS', text: strengths, icon: Icons.check_circle_outline_rounded, color: Colors.green),
            const SizedBox(height: 16),
          ],

          if (weaknesses.isNotEmpty) ...[
            _LabeledBulletRow(label: 'WEAKNESSES', text: weaknesses, icon: Icons.cancel_outlined, color: AppTheme.errorColor),
            const SizedBox(height: 16),
          ],

          ExpandableFeedbackBlock(title: 'AI Feedback', feedback: feedback),

          if (reasoning.isNotEmpty) ...[
            const SizedBox(height: 16),
            _LabeledText(label: 'GRADING REASONING', text: reasoning, color: AppTheme.textSecondary),
          ],

          if (isManual && overrideReason != null && overrideReason.isNotEmpty) ...[
            const SizedBox(height: 16),
            _LabeledBulletRow(label: 'INSTRUCTOR OVERRIDE NOTE', text: overrideReason, icon: Icons.rate_review_outlined, color: Colors.purple),
          ],

          if (fileUrl != null && fileUrl.isNotEmpty) ...[
            const SizedBox(height: 20),
            SubmittedScriptTile(questionId: qId, fileUrl: fileUrl, fileType: fileType),
          ],
        ],
      ),
    );
  }
}

class _EvaluationCardHeader extends StatelessWidget {
  final String questionId;
  final double marks;
  final bool isManuallyGraded;

  const _EvaluationCardHeader({required this.questionId, required this.marks, required this.isManuallyGraded});

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          'Question $questionId',
          style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 16, color: AppTheme.textPrimary),
        ),
        Row(
          children: [
            AppBadge.soft(
              label: isManuallyGraded ? 'TEACHER AUDITED' : 'AI EVALUATED',
              color: isManuallyGraded ? Colors.purple : Colors.blue[800]!,
            ),
            const SizedBox(width: 8),
            AppBadge.soft(
              label: 'Score: ${marks.toStringAsFixed(0)}',
              color: AppTheme.primaryColor,
              fontSize: 12,
            ),
          ],
        ),
      ],
    );
  }
}

class _LabeledBulletRow extends StatelessWidget {
  final String label;
  final String text;
  final IconData icon;
  final Color color;

  const _LabeledBulletRow({required this.label, required this.text, required this.icon, required this.color});

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: color, letterSpacing: 0.5),
        ),
        const SizedBox(height: 6),
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(icon, color: color, size: 16),
            const SizedBox(width: 8),
            Expanded(
              child: Text(text, style: const TextStyle(fontSize: 13, color: AppTheme.textPrimary, height: 1.4)),
            ),
          ],
        ),
      ],
    );
  }
}

class _LabeledText extends StatelessWidget {
  final String label;
  final String text;
  final Color color;

  const _LabeledText({required this.label, required this.text, required this.color});

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: color, letterSpacing: 0.5)),
        const SizedBox(height: 6),
        Text(text, style: const TextStyle(fontSize: 12, color: AppTheme.textSecondary, height: 1.4)),
      ],
    );
  }
}
