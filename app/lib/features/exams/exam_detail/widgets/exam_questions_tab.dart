import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../upload/models/submission_model.dart';
import '../../models/exam_model.dart';
import '../../models/exam_result_model.dart';
import '../../models/question_model.dart';
import '../../providers/exam_provider.dart';
import '../../providers/student_results_provider.dart';
import 'finalize_bar.dart';
import 'question_card.dart';
import 'question_filter_bar.dart';

// =============================================================================
// QUESTIONS TAB (Tab 2)
// Shows filter chips, submission status banner, question list, and finalize button.
// =============================================================================
class ExamQuestionsTab extends ConsumerWidget {
  final ExamModel exam;
  final AsyncValue<SubmissionModel> submissionsState;
  final String? selectedFilter;
  final bool isFinalizing;
  final bool isTimeUp;
  final ValueChanged<String?> onFilterChanged;
  final ValueChanged<QuestionModel> onScanQuestion;
  final VoidCallback onFinalize;

  const ExamQuestionsTab({
    super.key,
    required this.exam,
    required this.submissionsState,
    required this.selectedFilter,
    required this.isFinalizing,
    required this.isTimeUp,
    required this.onFilterChanged,
    required this.onScanQuestion,
    required this.onFinalize,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    if (exam.sections.isEmpty) return const _NoPaperLoaded();

    final resultStatus = _resolveResultStatus(ref, exam.id);

    return Column(
      children: [
        if (exam.hasSubmitted) _SubmissionStatusBanner(status: resultStatus),
        QuestionFilterBar(
          exam: exam,
          submissionsState: submissionsState,
          selectedFilter: selectedFilter,
          onFilterChanged: onFilterChanged,
        ),
        Expanded(child: _QuestionList(
          exam: exam,
          submissionsState: submissionsState,
          selectedFilter: selectedFilter,
          onScanQuestion: onScanQuestion,
          ref: ref,
        )),
        FinalizeBar(
          isFinalizing: isFinalizing,
          isTimeUp: isTimeUp,
          onFinalize: onFinalize,
        ),
      ],
    );
  }

  String _resolveResultStatus(WidgetRef ref, String examId) {
    final results = ref.watch(studentResultsProvider).valueOrNull;
    final matched = results?.firstWhere(
      (r) => r.id == examId,
      orElse: () => const ExamResultModel(id: '', status: '', totalMarksObtained: 0, subjectName: '', subjectCode: '', examType: '', maxMarks: 0, evaluations: []),
    );
    return (matched != null && matched.id.isNotEmpty) ? matched.status : 'Evaluating';
  }
}

class _SubmissionStatusBanner extends StatelessWidget {
  final String status;
  const _SubmissionStatusBanner({required this.status});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      margin: const EdgeInsets.only(left: 20, right: 20, top: 12, bottom: 4),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.blue.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.blue.withValues(alpha: 0.2)),
      ),
      child: Row(
        children: [
          const SizedBox(
            width: 18,
            height: 18,
            child: CircularProgressIndicator(strokeWidth: 2, color: Colors.blue),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  status == 'Evaluating' ? 'Grading in progress...' : 'Evaluation Status: $status',
                  style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.blue, fontSize: 14),
                ),
                const SizedBox(height: 4),
                const Text(
                  'Your script is being evaluated by AISS AI. Re-uploads and changes are locked.',
                  style: TextStyle(color: AppTheme.textSecondary, fontSize: 12),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _QuestionList extends ConsumerWidget {
  final ExamModel exam;
  final AsyncValue<SubmissionModel> submissionsState;
  final String? selectedFilter;
  final ValueChanged<QuestionModel> onScanQuestion;
  final WidgetRef ref;

  const _QuestionList({
    required this.exam,
    required this.submissionsState,
    required this.selectedFilter,
    required this.onScanQuestion,
    required this.ref,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return submissionsState.when(
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (err, _) => Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.wifi_off_rounded, size: 48, color: AppTheme.errorColor),
            const SizedBox(height: 12),
            const Text('Failed to sync submissions status.'),
            const SizedBox(height: 12),
            ElevatedButton(
              onPressed: () => ref.refresh(examSubmissionsProvider(exam.id)),
              child: const Text('Retry Connection'),
            ),
          ],
        ),
      ),
      data: (submission) => ListView.builder(
        padding: const EdgeInsets.only(left: 20, right: 20, top: 10, bottom: 20),
        itemCount: exam.sections.length,
        itemBuilder: (context, i) {
          final section = exam.sections[i];
          var questions = section.questions;

          if (selectedFilter != null) {
            questions = questions.where((q) {
              if (q.questionId == selectedFilter) return true;
              return q.children?.any((s) => s.questionId == selectedFilter) ?? false;
            }).toList();
          }

          if (questions.isEmpty) return const SizedBox.shrink();

          return Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _SectionLabel(label: section.title),
              ...questions.map((q) => QuestionCard(
                    question: q,
                    uploadsMap: submission.uploads,
                    exam: exam,
                    onScanQuestion: onScanQuestion,
                  )),
              const SizedBox(height: 16),
            ],
          );
        },
      ),
    );
  }
}

class _SectionLabel extends StatelessWidget {
  final String label;
  const _SectionLabel({required this.label});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(top: 8.0, bottom: 12.0),
      child: Row(
        children: [
          Text(
            'SECTION $label',
            style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w800, color: AppTheme.primaryColor, letterSpacing: 0.5),
          ),
          const SizedBox(width: 12),
          const Expanded(child: Divider(color: AppTheme.outlineColor, height: 1)),
        ],
      ),
    );
  }
}

class _NoPaperLoaded extends StatelessWidget {
  const _NoPaperLoaded();

  @override
  Widget build(BuildContext context) {
    return const Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.lock_clock_outlined, size: 48, color: AppTheme.textSecondary),
          SizedBox(height: 16),
          Text(
            'Question paper is pending approval or upload.',
            style: TextStyle(fontWeight: FontWeight.w600, color: AppTheme.textSecondary),
          ),
        ],
      ),
    );
  }
}
