import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/theme/app_theme.dart';
import '../../exams/providers/selected_question_provider.dart';

class ScannerQuestionBadge extends ConsumerWidget {
  const ScannerQuestionBadge({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final selectedQuestion = ref.watch(selectedQuestionProvider);
    final questionId = selectedQuestion?.questionId ?? '';

    return SafeArea(
      child: Align(
        alignment: Alignment.topCenter,
        child: Padding(
          padding: const EdgeInsets.only(top: 60),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            decoration: BoxDecoration(
              color: Colors.black.withValues(alpha: 0.65),
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: AppTheme.primaryColor.withValues(alpha: 0.4)),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.camera_alt_outlined, color: AppTheme.primaryColor, size: 16),
                const SizedBox(width: 8),
                Text(
                  'Question $questionId',
                  style: const TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.w900,
                    fontSize: 13,
                    letterSpacing: 0.5,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
