import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../shared/widgets/app_badge.dart';
import '../../models/exam_model.dart';
import '../../models/question_model.dart';
import '../../../upload/providers/scanner_provider.dart';
import 'local_scans_preview.dart';

// =============================================================================
// QUESTION CARD
// A single question tile with scan status badge, local preview, and upload button.
// Renders sub-questions indented below if present.
// =============================================================================
class QuestionCard extends ConsumerWidget {
  final QuestionModel question;
  final Map<String, String> uploadsMap;
  final ExamModel exam;
  final ValueChanged<QuestionModel> onScanQuestion;

  const QuestionCard({
    super.key,
    required this.question,
    required this.uploadsMap,
    required this.exam,
    required this.onScanQuestion,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final qId = question.questionId;
    final hasUploaded = uploadsMap.containsKey(qId);
    final localScans = ref.watch(questionScansProvider)[qId] ?? [];
    final hasLocalScans = localScans.isNotEmpty;
    final children = question.children;
    final isLeaf = children == null || children.isEmpty;

    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppTheme.surfaceColor,
        borderRadius: BorderRadius.circular(AppTheme.borderRadiusMedium),
        border: Border.all(
          color: hasUploaded ? AppTheme.successColor.withValues(alpha: 0.3) : AppTheme.outlineColor,
          width: hasUploaded ? 1.5 : 1,
        ),
        boxShadow: AppTheme.softShadow,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _QuestionCardHeader(
            label: 'Question $qId',
            hasUploaded: hasUploaded,
            hasLocalScans: hasLocalScans,
          ),
          const SizedBox(height: 8),
          Text(question.text, style: const TextStyle(fontSize: 14, color: AppTheme.textPrimary, height: 1.4)),
          if (isLeaf) LocalScansPreview(questionId: qId),
          const SizedBox(height: 12),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text('[${question.marks.toStringAsFixed(0)} Marks]', style: const TextStyle(fontSize: 12, color: AppTheme.primaryColor, fontWeight: FontWeight.bold)),
              if (isLeaf)
                _ScanButton(
                  hasLocalScans: hasLocalScans,
                  isSubmitted: exam.hasSubmitted,
                  onTap: () => onScanQuestion(question),
                ),
            ],
          ),
          if (!isLeaf) ...[
            const SizedBox(height: 16),
            const Divider(height: 1, color: AppTheme.outlineColor),
            const SizedBox(height: 12),
            ...children.map((sub) => _SubQuestionCard(
                  sub: sub,
                  uploadsMap: uploadsMap,
                  exam: exam,
                  onScanQuestion: onScanQuestion,
                )),
          ],
        ],
      ),
    );
  }
}

class _QuestionCardHeader extends StatelessWidget {
  final String label;
  final bool hasUploaded;
  final bool hasLocalScans;

  const _QuestionCardHeader({required this.label, required this.hasUploaded, required this.hasLocalScans});

  Color get _statusColor => hasUploaded
      ? AppTheme.successColor
      : (hasLocalScans ? Colors.orange.shade800 : AppTheme.textSecondary);

  String get _statusLabel => hasUploaded ? 'UPLOADED' : (hasLocalScans ? 'SAVED LOCALLY' : 'PENDING');

  IconData get _statusIcon => hasUploaded
      ? Icons.check_circle_rounded
      : (hasLocalScans ? Icons.cloud_queue_rounded : Icons.radio_button_unchecked_rounded);

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: AppTheme.textPrimary)),
        AppBadge.soft(
          icon: Icon(_statusIcon, size: 12, color: _statusColor),
          label: _statusLabel,
          color: _statusColor,
        ),
      ],
    );
  }
}

class _SubQuestionCard extends ConsumerWidget {
  final QuestionModel sub;
  final Map<String, String> uploadsMap;
  final ExamModel exam;
  final ValueChanged<QuestionModel> onScanQuestion;

  const _SubQuestionCard({
    required this.sub,
    required this.uploadsMap,
    required this.exam,
    required this.onScanQuestion,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final subId = sub.questionId;
    final isUploaded = uploadsMap.containsKey(subId);
    final localScans = ref.watch(questionScansProvider)[subId] ?? [];
    final hasScans = localScans.isNotEmpty;

    return Container(
      margin: const EdgeInsets.only(bottom: 12, left: 12),
      padding: const EdgeInsets.only(left: 12),
      decoration: const BoxDecoration(
        border: Border(left: BorderSide(color: AppTheme.outlineColor, width: 2)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text('Sub-question $subId', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: AppTheme.textPrimary)),
              Row(
                children: [
                  Icon(
                    isUploaded ? Icons.check_circle_rounded : (hasScans ? Icons.cloud_queue_rounded : Icons.radio_button_unchecked_rounded),
                    size: 14,
                    color: isUploaded ? AppTheme.successColor : (hasScans ? Colors.orange.shade800 : AppTheme.textSecondary),
                  ),
                  if (hasScans && !isUploaded) ...[
                    const SizedBox(width: 4),
                    Text('SAVED LOCALLY', style: TextStyle(fontSize: 9, fontWeight: FontWeight.bold, color: Colors.orange.shade800)),
                  ],
                ],
              ),
            ],
          ),
          const SizedBox(height: 6),
          Text(sub.text, style: const TextStyle(fontSize: 13, color: AppTheme.textSecondary)),
          LocalScansPreview(questionId: subId),
          const SizedBox(height: 8),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text('[${sub.marks.toStringAsFixed(0)} Marks]', style: const TextStyle(fontSize: 11, color: AppTheme.primaryColor, fontWeight: FontWeight.bold)),
              _ScanButton(hasLocalScans: hasScans, isSubmitted: exam.hasSubmitted, onTap: () => onScanQuestion(sub), compact: true),
            ],
          ),
        ],
      ),
    );
  }
}

class _ScanButton extends StatelessWidget {
  final bool hasLocalScans;
  final bool isSubmitted;
  final VoidCallback onTap;
  final bool compact;

  const _ScanButton({
    required this.hasLocalScans,
    required this.isSubmitted,
    required this.onTap,
    this.compact = false,
  });

  @override
  Widget build(BuildContext context) {
    return ElevatedButton.icon(
      onPressed: isSubmitted ? null : onTap,
      icon: Icon(hasLocalScans ? Icons.edit_note_rounded : Icons.camera_alt_rounded, size: compact ? 12 : 14),
      label: Text(hasLocalScans ? (compact ? 'Manage Pages' : 'Manage Pages') : (compact ? 'Upload' : 'Upload Scan')),
      style: ElevatedButton.styleFrom(
        padding: EdgeInsets.symmetric(horizontal: compact ? 10 : 14, vertical: compact ? 6 : 8),
        minimumSize: Size.zero,
        tapTargetSize: MaterialTapTargetSize.shrinkWrap,
        backgroundColor: hasLocalScans ? Colors.white : AppTheme.primaryColor,
        foregroundColor: hasLocalScans ? AppTheme.primaryColor : Colors.white,
        side: hasLocalScans ? const BorderSide(color: AppTheme.primaryColor) : null,
      ),
    );
  }
}
