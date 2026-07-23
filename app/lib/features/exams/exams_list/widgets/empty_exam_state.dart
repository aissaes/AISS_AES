import 'package:flutter/material.dart';
import '../../../../shared/widgets/app_empty_card.dart';
import 'exam_segmented_control.dart';

// =============================================================================
// EMPTY EXAM STATE
// Leverages shared AppEmptyCard for 100% design system consistency.
// =============================================================================
class EmptyExamState extends StatelessWidget {
  final ExamTab tab;

  const EmptyExamState({super.key, required this.tab});

  String get _title => switch (tab) {
    ExamTab.live => 'No Live Exams',
    ExamTab.upcoming => 'No Upcoming Exams',
    ExamTab.history => 'No Past Exams',
  };

  String get _subtitle => switch (tab) {
    ExamTab.live => 'There are currently no examinations active for script submission.',
    ExamTab.upcoming => 'You have no scheduled upcoming examinations in your timetable.',
    ExamTab.history => 'No past examination history recorded.',
  };

  @override
  Widget build(BuildContext context) {
    return AppEmptyCard(
      title: _title,
      message: _subtitle,
      icon: Icons.vpn_key_outlined,
    );
  }
}
