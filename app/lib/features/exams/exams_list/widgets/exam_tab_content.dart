import 'package:flutter/material.dart';
import '../../models/exam_model.dart';
import '../../models/exam_result_model.dart';
import '../../widgets/history_exam_card.dart';
import '../../widgets/live_exam_card.dart';
import '../../widgets/upcoming_exam_card.dart';
import 'empty_exam_state.dart';
import 'exam_segmented_control.dart';

// =============================================================================
// EXAM TAB CONTENT
// Filters and renders the correct exam list based on selected tab.
// =============================================================================
class ExamTabContent extends StatelessWidget {
  final List<ExamModel> exams;
  final List<ExamResultModel> results;
  final ExamTab selectedTab;
  final ValueChanged<ExamModel> onUnlock;

  const ExamTabContent({
    super.key,
    required this.exams,
    required this.results,
    required this.selectedTab,
    required this.onUnlock,
  });

  List<ExamModel> _filteredExams() {
    return switch (selectedTab) {
      ExamTab.live => exams.where((e) => e.status == 'live' || (e.isWindowActive && !e.hasSubmitted)).toList(),
      ExamTab.upcoming => exams.where((e) => e.status == 'upcoming' && !e.isWindowActive).toList(),
      ExamTab.history => exams.where((e) => e.status == 'completed' || e.hasSubmitted || (e.endTime != null && e.endTime!.isBefore(DateTime.now()))).toList(),
    };
  }

  @override
  Widget build(BuildContext context) {
    final displayed = _filteredExams();
    if (displayed.isEmpty) return EmptyExamState(tab: selectedTab);

    return ListView.separated(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      itemCount: displayed.length,
      separatorBuilder: (_, __) => const SizedBox(height: 16),
      itemBuilder: (context, i) {
        final exam = displayed[i];
        return switch (selectedTab) {
          ExamTab.live => LiveExamCard(exam: exam, onUnlockPressed: () => onUnlock(exam)),
          ExamTab.upcoming => UpcomingExamCard(exam: exam),
          ExamTab.history => HistoryExamCard(exam: exam, results: results),
        };
      },
    );
  }
}
