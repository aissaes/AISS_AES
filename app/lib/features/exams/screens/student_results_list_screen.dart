import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/theme/app_theme.dart';
import '../providers/student_results_provider.dart';
import '../../../shared/widgets/app_loading_indicator.dart';
import '../../../shared/widgets/app_error_card.dart';

class StudentResultsListScreen extends ConsumerWidget {
  const StudentResultsListScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final resultsAsync = ref.watch(studentResultsProvider);

    return Scaffold(
      backgroundColor: AppTheme.backgroundColor,
      appBar: AppBar(
        backgroundColor: AppTheme.backgroundColor,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, color: AppTheme.textPrimary),
          onPressed: () => context.pop(),
        ),
        title: const Text(
          'My Results',
          style: TextStyle(
            color: AppTheme.textPrimary,
            fontWeight: FontWeight.w800,
            fontSize: 20,
          ),
        ),
        centerTitle: true,
      ),
      body: SafeArea(
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 600),
            child: resultsAsync.when(
              data: (results) {
                if (results.isEmpty) {
                  return _buildEmptyState(context);
                }

                return ListView.separated(
                  padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
                  itemCount: results.length,
                  separatorBuilder: (context, index) => const SizedBox(height: 16),
                  itemBuilder: (context, index) {
                    final result = results[index];
                    final examId = result.id;
                    final subjectName = result.subjectName;
                    final subjectCode = result.subjectCode;
                    final examType = result.examType;
                    final maxMarks = result.maxMarks.toStringAsFixed(0);
                    final totalMarksObtained = result.totalMarksObtained.toStringAsFixed(0);
                    final statusLower = result.status.toLowerCase();
                    final isCompleted = statusLower == 'completed' || statusLower == 'graded';
                    final isEvaluating = statusLower == 'evaluating';
                    final isUncertain = statusLower == 'uncertain';
                    final isFailed = statusLower == 'failed';
                    final isOCRFailed = isFailed && result.evaluations.any((ev) => ev.reasoning.startsWith('OCR_FAILED:'));

                    String statusText = 'PENDING EVALUATION';
                    Color badgeBg = Colors.amber.withValues(alpha: 0.1);
                    Color badgeTextColor = Colors.amber[800]!;

                    if (isCompleted) {
                      statusText = 'GRADED';
                      badgeBg = AppTheme.primaryColor.withValues(alpha: 0.08);
                      badgeTextColor = AppTheme.primaryColor;
                    } else if (isEvaluating) {
                      statusText = 'GRADING IN PROGRESS';
                      badgeBg = Colors.blue.withValues(alpha: 0.08);
                      badgeTextColor = Colors.blue[800]!;
                    } else if (isUncertain) {
                      statusText = 'MANUAL REVIEW REQUIRED';
                      badgeBg = Colors.orange.withValues(alpha: 0.08);
                      badgeTextColor = Colors.orange[800]!;
                    } else if (isOCRFailed) {
                      statusText = 'OCR FAILED';
                      badgeBg = AppTheme.errorColor.withValues(alpha: 0.08);
                      badgeTextColor = AppTheme.errorColor;
                    } else if (isFailed) {
                      statusText = 'EVALUATION FAILED';
                      badgeBg = AppTheme.errorColor.withValues(alpha: 0.08);
                      badgeTextColor = AppTheme.errorColor;
                    }

                    final dateStr = result.date != null 
                        ? result.date!.toLocal().toString().split(' ').first 
                        : 'N/A';

                    return Container(
                      decoration: BoxDecoration(
                        color: AppTheme.surfaceColor,
                        borderRadius: BorderRadius.circular(AppTheme.borderRadius2XL),
                        boxShadow: AppTheme.softShadow,
                        border: Border.all(
                          color: isCompleted 
                              ? AppTheme.primaryColor.withValues(alpha: 0.1) 
                              : isFailed
                                  ? AppTheme.errorColor.withValues(alpha: 0.2)
                                  : isUncertain
                                      ? Colors.orange.withValues(alpha: 0.2)
                                      : Colors.amber.withValues(alpha: 0.2),
                          width: 1,
                        ),
                      ),
                      child: ClipRRect(
                        borderRadius: BorderRadius.circular(AppTheme.borderRadius2XL),
                        child: Material(
                          color: Colors.transparent,
                          child: InkWell(
                            onTap: isCompleted && examId.isNotEmpty
                                ? () => context.push('/results/detail/$examId')
                                : () {
                                    String snackText = 'This exam script is currently being evaluated. Please check back later.';
                                    if (isEvaluating) {
                                      snackText = 'This exam script is currently being evaluated by AISS AI. Please check back later.';
                                    } else if (isUncertain) {
                                      snackText = 'AI evaluation is complete and pending faculty verification. Please check back later.';
                                    } else if (isOCRFailed) {
                                      snackText = 'OCR processing failed for this paper (unreadable handwriting or scan). Faculty will manually grade it.';
                                    } else if (isFailed) {
                                      snackText = 'AI evaluation failed for this paper. Faculty will manually grade it soon.';
                                    }
                                    ScaffoldMessenger.of(context).showSnackBar(
                                      SnackBar(
                                        content: Text(snackText),
                                        behavior: SnackBarBehavior.floating,
                                      ),
                                    );
                                  },
                            child: Padding(
                              padding: const EdgeInsets.all(20),
                              child: Row(
                                children: [
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Row(
                                          children: [
                                            Container(
                                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                              decoration: BoxDecoration(
                                                color: badgeBg,
                                                borderRadius: BorderRadius.circular(6),
                                              ),
                                              child: Text(
                                                statusText,
                                                style: TextStyle(
                                                  color: badgeTextColor,
                                                  fontSize: 9,
                                                  fontWeight: FontWeight.w900,
                                                  letterSpacing: 0.5,
                                                ),
                                              ),
                                            ),
                                            const SizedBox(width: 8),
                                            Text(
                                              subjectCode,
                                              style: const TextStyle(
                                                color: AppTheme.textSecondary,
                                                fontSize: 11,
                                                fontWeight: FontWeight.bold,
                                              ),
                                            ),
                                          ],
                                        ),
                                        const SizedBox(height: 12),
                                        Text(
                                          subjectName,
                                          style: const TextStyle(
                                            fontWeight: FontWeight.w800,
                                            fontSize: 16,
                                            color: AppTheme.textPrimary,
                                            letterSpacing: -0.2,
                                          ),
                                        ),
                                        const SizedBox(height: 4),
                                        Text(
                                          '$examType • $dateStr',
                                          style: const TextStyle(
                                            color: AppTheme.textSecondary,
                                            fontSize: 12,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                  const SizedBox(width: 16),
                                  if (isCompleted)
                                    Column(
                                      mainAxisAlignment: MainAxisAlignment.center,
                                      crossAxisAlignment: CrossAxisAlignment.end,
                                      children: [
                                        Container(
                                          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                                          decoration: BoxDecoration(
                                            color: AppTheme.primaryColor.withValues(alpha: 0.06),
                                            borderRadius: BorderRadius.circular(12),
                                            border: Border.all(color: AppTheme.primaryColor.withValues(alpha: 0.15)),
                                          ),
                                          child: Text(
                                            '$totalMarksObtained/$maxMarks',
                                            style: const TextStyle(
                                              fontSize: 16,
                                              fontWeight: FontWeight.w900,
                                              color: AppTheme.primaryColor,
                                            ),
                                          ),
                                        ),
                                        const SizedBox(height: 6),
                                        const Row(
                                          mainAxisSize: MainAxisSize.min,
                                          children: [
                                            Text(
                                              'View Details',
                                              style: TextStyle(
                                                fontSize: 11,
                                                color: AppTheme.primaryColor,
                                                fontWeight: FontWeight.bold,
                                              ),
                                            ),
                                            SizedBox(width: 2),
                                            Icon(Icons.arrow_forward_ios_rounded, size: 10, color: AppTheme.primaryColor),
                                          ],
                                        ),
                                      ],
                                    )
                                  else
                                    Container(
                                      padding: const EdgeInsets.all(12),
                                      decoration: BoxDecoration(
                                        color: isFailed 
                                            ? AppTheme.errorColor.withValues(alpha: 0.08) 
                                            : isUncertain 
                                                ? Colors.orange.withValues(alpha: 0.08)
                                                : Colors.amber.withValues(alpha: 0.08),
                                        shape: BoxShape.circle,
                                      ),
                                      child: Icon(
                                        isFailed
                                            ? Icons.error_outline_rounded
                                            : isUncertain
                                                ? Icons.announcement_outlined
                                                : isEvaluating
                                                    ? Icons.sync_rounded
                                                    : Icons.hourglass_empty_rounded,
                                        color: isFailed 
                                            ? AppTheme.errorColor 
                                            : isUncertain 
                                                ? Colors.orange 
                                                : Colors.amber,
                                        size: 24,
                                      ),
                                    ),
                                ],
                              ),
                            ),
                          ),
                        ),
                      ),
                    );
                  },
                );
              },
              loading: () => const Center(child: AppLoadingIndicator(size: 50, logoSize: 24)),
              error: (err, stack) => Center(
                child: Padding(
                  padding: const EdgeInsets.all(24.0),
                  child: AppErrorCard(
                    title: 'Failed to load results',
                    message: err.toString(),
                    onRetry: () => ref.invalidate(studentResultsProvider),
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildEmptyState(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32.0),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                color: AppTheme.primaryColor.withValues(alpha: 0.05),
                shape: BoxShape.circle,
              ),
              child: const Icon(
                Icons.assignment_turned_in_rounded,
                size: 64,
                color: AppTheme.primaryColor,
              ),
            ),
            const SizedBox(height: 24),
            const Text(
              'No Results Released Yet',
              style: TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.w800,
                color: AppTheme.textPrimary,
              ),
            ),
            const SizedBox(height: 8),
            const Text(
              'You have no graded exams at this moment. As soon as your answer sheets are evaluated, your grades and detailed AI breakdown will appear here.',
              textAlign: TextAlign.center,
              style: TextStyle(
                color: AppTheme.textSecondary,
                fontSize: 14,
                height: 1.5,
              ),
            ),
            const SizedBox(height: 32),
            ElevatedButton(
              onPressed: () => context.pop(),
              style: ElevatedButton.styleFrom(
                minimumSize: const Size(200, 48),
              ),
              child: const Text('Back to Dashboard'),
            ),
          ],
        ),
      ),
    );
  }
}
