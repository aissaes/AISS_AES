import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../../../core/theme/app_theme.dart';
import '../models/exam_model.dart';
import '../models/exam_result_model.dart';

class HistoryExamCard extends StatelessWidget {
  final ExamModel exam;
  final List<ExamResultModel> results;

  const HistoryExamCard({
    super.key,
    required this.exam,
    required this.results,
  });

  @override
  Widget build(BuildContext context) {
    final dateStr = exam.date != null 
        ? DateFormat('MMM d, yyyy').format(exam.date!.toLocal())
        : 'N/A';
    final subjectName = exam.subjectName;
    final subjectCode = exam.subjectCode;
    final examType = exam.examType;
    final hasSubmitted = exam.hasSubmitted;
    
    final ExamResultModel matchedResult = results.firstWhere(
      (r) => r.id == exam.id,
      orElse: () => const ExamResultModel(
        id: '',
        status: 'Unknown',
        totalMarksObtained: 0,
        subjectName: '',
        subjectCode: '',
        examType: '',
        maxMarks: 0,
        evaluations: [],
      ),
    );
    
    final hasResultRecord = matchedResult.id.isNotEmpty;
    final isGraded = hasResultRecord && matchedResult.isGraded;
    final totalMarksObtained = hasResultRecord ? matchedResult.totalMarksObtained.toStringAsFixed(0) : '0';
    final maxMarks = hasResultRecord ? matchedResult.maxMarks.toStringAsFixed(0) : exam.maxMarks.toStringAsFixed(0);
    final isOCRFailed = hasResultRecord && matchedResult.status.toLowerCase() == 'failed' && matchedResult.evaluations.any((ev) => ev.reasoning.startsWith('OCR_FAILED:'));

    return Container(
      decoration: BoxDecoration(
        color: AppTheme.surfaceColor,
        borderRadius: BorderRadius.circular(AppTheme.borderRadius2XL),
        boxShadow: AppTheme.softShadow,
        border: Border.all(
          color: AppTheme.outlineColor.withValues(alpha: 0.15),
          width: 1,
        ),
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(AppTheme.borderRadius2XL),
        child: Material(
          color: Colors.transparent,
          child: InkWell(
            onTap: hasSubmitted && isGraded && matchedResult.id.isNotEmpty
                ? () => context.push('/results/detail/${matchedResult.id}')
                : hasSubmitted
                    ? () {
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(
                            content: Text('Your answers are under AI-assisted evaluation. Feedback will be published shortly.'),
                            behavior: SnackBarBehavior.floating,
                          ),
                        );
                      }
                    : null,
            child: Padding(
              padding: const EdgeInsets.all(18),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: hasSubmitted
                              ? AppTheme.successColor.withValues(alpha: 0.08)
                              : Colors.orange.withValues(alpha: 0.08),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(
                              hasSubmitted ? Icons.check_circle_rounded : Icons.warning_amber_rounded,
                              size: 10,
                              color: hasSubmitted ? AppTheme.successColor : Colors.orange,
                            ),
                            const SizedBox(width: 4),
                            Text(
                              hasSubmitted ? 'Completed' : 'Missed',
                              style: TextStyle(
                                color: hasSubmitted ? AppTheme.successColor : Colors.orange,
                                fontSize: 9,
                                fontWeight: FontWeight.w900,
                                letterSpacing: 0.5,
                              ),
                            ),
                          ],
                        ),
                      ),
                      const Spacer(),
                      Text(
                        subjectCode,
                        style: const TextStyle(
                          color: AppTheme.textSecondary,
                          fontSize: 12,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  Text(
                    subjectName,
                    style: const TextStyle(
                      fontWeight: FontWeight.w900,
                      fontSize: 17,
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
                  if (hasSubmitted) ...[
                    const SizedBox(height: 16),
                    const Divider(color: AppTheme.outlineColor, height: 1),
                    const SizedBox(height: 14),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        if (isGraded) ...[
                          Row(
                            children: [
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                                decoration: BoxDecoration(
                                  color: AppTheme.primaryColor.withValues(alpha: 0.06),
                                  borderRadius: BorderRadius.circular(8),
                                  border: Border.all(color: AppTheme.primaryColor.withValues(alpha: 0.12)),
                                ),
                                child: Text(
                                  '$totalMarksObtained / $maxMarks Marks',
                                  style: const TextStyle(
                                    fontSize: 13,
                                    fontWeight: FontWeight.w900,
                                    color: AppTheme.primaryColor,
                                  ),
                                ),
                              ),
                            ],
                          ),
                          const Row(
                            children: [
                              Text(
                                'View grading breakdown',
                                style: TextStyle(
                                  fontSize: 11,
                                  color: AppTheme.primaryColor,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                              SizedBox(width: 4),
                              Icon(Icons.arrow_forward_ios_rounded, size: 10, color: AppTheme.primaryColor),
                            ],
                          ),
                        ] else ...[
                          Row(
                            children: [
                              Icon(
                                isOCRFailed
                                    ? Icons.blur_linear_rounded
                                    : hasResultRecord && matchedResult.status.toLowerCase() == 'failed'
                                        ? Icons.error_outline_rounded
                                        : hasResultRecord && matchedResult.status.toLowerCase() == 'uncertain'
                                            ? Icons.announcement_outlined
                                            : hasResultRecord && matchedResult.status.toLowerCase() == 'evaluating'
                                                ? Icons.sync_rounded
                                                : Icons.hourglass_empty_rounded,
                                size: 14,
                                color: isOCRFailed || (hasResultRecord && matchedResult.status.toLowerCase() == 'failed')
                                    ? AppTheme.errorColor
                                    : hasResultRecord && matchedResult.status.toLowerCase() == 'uncertain'
                                        ? Colors.orange[800]
                                        : Colors.amber[800],
                              ),
                              const SizedBox(width: 6),
                              Text(
                                isOCRFailed
                                    ? 'OCR Failed'
                                    : hasResultRecord && matchedResult.status.toLowerCase() == 'failed'
                                        ? 'Evaluation Failed'
                                        : hasResultRecord && matchedResult.status.toLowerCase() == 'uncertain'
                                            ? 'Manual Review Required'
                                            : hasResultRecord && matchedResult.status.toLowerCase() == 'evaluating'
                                                ? 'Grading in Progress'
                                                : 'Pending Evaluation',
                                style: TextStyle(
                                  fontSize: 12,
                                  color: isOCRFailed || (hasResultRecord && matchedResult.status.toLowerCase() == 'failed')
                                      ? AppTheme.errorColor
                                      : hasResultRecord && matchedResult.status.toLowerCase() == 'uncertain'
                                          ? Colors.orange[800]
                                          : Colors.amber[800],
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ],
                          ),
                          Text(
                            'Max Marks: $maxMarks',
                            style: const TextStyle(
                              fontSize: 12,
                              color: AppTheme.textSecondary,
                            ),
                          ),
                        ],
                      ],
                    ),
                  ],
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
