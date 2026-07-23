import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/theme/app_theme.dart';
import '../../../shared/widgets/app_loading_indicator.dart';
import '../providers/student_results_provider.dart';
import 'widgets/evaluation_card.dart';
import 'widgets/result_overview_card.dart';

// =============================================================================
// STUDENT RESULT DETAIL SCREEN
// High-level orchestrator assembling ResultOverviewCard and EvaluationCards.
// =============================================================================
class StudentResultDetailScreen extends ConsumerWidget {
  final String examId;

  const StudentResultDetailScreen({super.key, required this.examId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final detailAsync = ref.watch(studentDetailedResultProvider(examId));

    return Scaffold(
      backgroundColor: AppTheme.backgroundColor,
      appBar: _buildAppBar(context),
      body: SafeArea(
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 600),
            child: detailAsync.when(
              data: (result) => _ResultBody(result: result),
              loading: () => const Center(child: AppLoadingIndicator(size: 50, logoSize: 24)),
              error: (err, _) => _ResultErrorState(error: err, examId: examId),
            ),
          ),
        ),
      ),
    );
  }

  AppBar _buildAppBar(BuildContext context) {
    return AppBar(
      backgroundColor: AppTheme.backgroundColor,
      elevation: 0,
      leading: IconButton(
        icon: const Icon(Icons.arrow_back_ios_new_rounded, color: AppTheme.textPrimary),
        onPressed: () => context.pop(),
      ),
      title: const Text(
        'Evaluation Details',
        style: TextStyle(color: AppTheme.textPrimary, fontWeight: FontWeight.w800, fontSize: 20),
      ),
      centerTitle: true,
    );
  }
}

class _ResultBody extends StatelessWidget {
  final dynamic result;

  const _ResultBody({required this.result});

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          ResultOverviewCard(result: result),
          const SizedBox(height: 28),
          const Text(
            'QUESTION BREAKDOWN',
            style: TextStyle(fontSize: 11, fontWeight: FontWeight.w900, color: AppTheme.textSecondary, letterSpacing: 1.2),
          ),
          const SizedBox(height: 16),
          if (result.evaluations.isEmpty)
            const Center(
              child: Padding(
                padding: EdgeInsets.symmetric(vertical: 32),
                child: Text('No question evaluation details found.', style: TextStyle(color: AppTheme.textSecondary)),
              ),
            )
          else
            ListView.separated(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: result.evaluations.length,
              separatorBuilder: (_, __) => const SizedBox(height: 20),
              itemBuilder: (context, i) => EvaluationCard(evaluation: result.evaluations[i]),
            ),
          const SizedBox(height: 40),
        ],
      ),
    );
  }
}

class _ResultErrorState extends ConsumerWidget {
  final Object error;
  final String examId;

  const _ResultErrorState({required this.error, required this.examId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.error_outline_rounded, size: 48, color: AppTheme.errorColor),
            const SizedBox(height: 16),
            Text(
              'Failed to load evaluation details\n$error',
              textAlign: TextAlign.center,
              style: const TextStyle(color: AppTheme.textSecondary, height: 1.5),
            ),
            const SizedBox(height: 20),
            ElevatedButton(
              onPressed: () => ref.invalidate(studentDetailedResultProvider(examId)),
              style: ElevatedButton.styleFrom(minimumSize: const Size(180, 44)),
              child: const Text('Retry'),
            ),
          ],
        ),
      ),
    );
  }
}
