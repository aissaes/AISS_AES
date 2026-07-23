import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../upload/models/submission_model.dart';
import '../../models/exam_model.dart';

// =============================================================================
// QUESTION FILTER BAR
// Horizontal scrollable chip strip for filtering by question ID.
// =============================================================================
class QuestionFilterBar extends StatelessWidget {
  final ExamModel exam;
  final AsyncValue<SubmissionModel> submissionsState;
  final String? selectedFilter;
  final ValueChanged<String?> onFilterChanged;

  const QuestionFilterBar({
    super.key,
    required this.exam,
    required this.submissionsState,
    required this.selectedFilter,
    required this.onFilterChanged,
  });

  List<String> _allLeafQuestionIds() {
    final ids = <String>[];
    for (final sec in exam.sections) {
      for (final q in sec.questions) {
        if (q.children == null || q.children!.isEmpty) {
          ids.add(q.questionId);
        } else {
          ids.addAll(q.children!.map((s) => s.questionId));
        }
      }
    }
    return ids;
  }

  @override
  Widget build(BuildContext context) {
    final questionIds = _allLeafQuestionIds();
    final uploadsMap = submissionsState.valueOrNull?.uploads ?? {};

    return SizedBox(
      height: 48,
      child: ListView.builder(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 16),
        itemCount: questionIds.length + 1,
        itemBuilder: (context, index) {
          if (index == 0) return _filterChip(label: 'All Questions', isSelected: selectedFilter == null, onTap: () => onFilterChanged(null));
          final qId = questionIds[index - 1];
          final isUploaded = uploadsMap.containsKey(qId);
          return _filterChip(
            label: 'Q$qId',
            isSelected: selectedFilter == qId,
            avatar: Icon(
              isUploaded ? Icons.check_circle_rounded : Icons.radio_button_unchecked_rounded,
              size: 14,
              color: isUploaded ? AppTheme.successColor : AppTheme.textSecondary,
            ),
            onTap: () => onFilterChanged(qId),
          );
        },
      ),
    );
  }

  Widget _filterChip({required String label, required bool isSelected, Widget? avatar, required VoidCallback onTap}) {
    return Padding(
      padding: const EdgeInsets.only(right: 8),
      child: ChoiceChip(
        avatar: avatar,
        label: Text(label),
        selected: isSelected,
        selectedColor: AppTheme.primaryColor.withValues(alpha: 0.15),
        backgroundColor: AppTheme.surfaceColor,
        labelStyle: TextStyle(
          color: isSelected ? AppTheme.primaryColor : AppTheme.textSecondary,
          fontWeight: FontWeight.bold,
        ),
        onSelected: (_) => onTap(),
      ),
    );
  }
}
