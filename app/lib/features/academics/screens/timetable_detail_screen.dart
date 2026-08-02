import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/models/timetable_category_model.dart';
import '../providers/academics_providers.dart';

class TimetableDetailScreen extends ConsumerWidget {
  final String semesterId;
  final String categoryId;

  const TimetableDetailScreen({
    required this.semesterId,
    required this.categoryId,
    super.key,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final examsAsync = ref.watch(timetableExamsProvider((semesterId, categoryId)));

    return Scaffold(
      backgroundColor: AppTheme.backgroundColor,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_rounded, color: AppTheme.textPrimary),
          onPressed: () => context.pop(),
        ),
        title: const Text(
          'Timetable Details',
          style: TextStyle(
            fontWeight: FontWeight.bold,
            color: AppTheme.textPrimary,
            fontSize: 18,
          ),
        ),
      ),
      body: examsAsync.when(
        data: (exams) => _buildBody(context, ref, exams),
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (err, stack) => _buildErrorWidget(context, ref, err),
      ),
    );
  }

  Widget _buildBody(BuildContext context, WidgetRef ref, List<CategoryExamModel> exams) {
    if (exams.isEmpty) {
      return const Center(
        child: Padding(
          padding: EdgeInsets.all(24.0),
          child: Text(
            'No exams scheduled for this category.',
            textAlign: TextAlign.center,
            style: TextStyle(color: AppTheme.textSecondary),
          ),
        ),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.only(left: 20.0, right: 20.0, top: 12.0, bottom: 120.0),
      itemCount: exams.length,
      itemBuilder: (context, index) {
        final exam = exams[index];
        
        Color statusColor = AppTheme.outlineColor;
        IconData statusIcon = Icons.event_rounded;
        
        switch (exam.status) {
          case 'Completed':
            statusColor = AppTheme.successColor;
            statusIcon = Icons.check_circle_rounded;
            break;
          case 'Live':
            statusColor = AppTheme.primaryColor;
            statusIcon = Icons.sensors_rounded;
            break;
          case 'Missed':
            statusColor = AppTheme.errorColor;
            statusIcon = Icons.cancel_rounded;
            break;
          case 'Upcoming':
            statusColor = Colors.blue.shade700;
            statusIcon = Icons.schedule_rounded;
            break;
        }

        final formattedDate = DateFormat('EEE, MMM d, yyyy').format(exam.date);

        return Container(
          margin: const EdgeInsets.only(bottom: 16),
          decoration: BoxDecoration(
            color: AppTheme.surfaceColor,
            borderRadius: BorderRadius.circular(AppTheme.borderRadius2XL),
            boxShadow: AppTheme.softShadow,
            border: Border.all(color: Colors.grey.shade100),
          ),
          child: InkWell(
            onTap: exam.status == 'Completed' && exam.result?.status == 'Graded'
                ? () => context.push('/results/detail/${exam.examId}')
                : null,
            borderRadius: BorderRadius.circular(AppTheme.borderRadius2XL),
            child: Padding(
              padding: const EdgeInsets.all(18.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: statusColor.withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(statusIcon, size: 12, color: statusColor),
                            const SizedBox(width: 4),
                            Text(
                              exam.status.toUpperCase(),
                              style: TextStyle(
                                color: statusColor,
                                fontSize: 10,
                                fontWeight: FontWeight.bold,
                                letterSpacing: 0.5,
                              ),
                            ),
                          ],
                        ),
                      ),
                      Text(
                        exam.subjectCode,
                        style: const TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.bold,
                          color: AppTheme.outlineColor,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  Text(
                    exam.subjectName,
                    style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                      color: AppTheme.textPrimary,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Row(
                    children: [
                      const Icon(Icons.calendar_today_rounded, size: 12, color: AppTheme.textSecondary),
                      const SizedBox(width: 6),
                      Text(
                        formattedDate,
                        style: const TextStyle(
                          fontSize: 12,
                          color: AppTheme.textSecondary,
                        ),
                      ),
                    ],
                  ),
                  const Divider(height: 24, thickness: 0.7),
                  _buildResultOrInfo(context, exam),
                ],
              ),
            ),
          ),
        );
      },
    );
  }

  Widget _buildResultOrInfo(BuildContext context, CategoryExamModel exam) {
    if (exam.status == 'Completed') {
      final res = exam.result;
      if (res != null) {
        if (res.status == 'Graded') {
          final percentage = (res.marksObtained! / res.maxMarks) * 100;
          return Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Marks Obtained', style: TextStyle(fontSize: 11, color: AppTheme.textSecondary)),
                  const SizedBox(height: 2),
                  Text(
                    '${percentage.toStringAsFixed(1)}% (${res.marksObtained!.toStringAsFixed(1)}/${res.maxMarks.toStringAsFixed(1)})',
                    style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: AppTheme.successColor),
                  ),
                ],
              ),
              const Row(
                children: [
                  Text(
                    'View Feedback',
                    style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppTheme.primaryColor),
                  ),
                  SizedBox(width: 4),
                  Icon(Icons.arrow_forward_ios_rounded, size: 12, color: AppTheme.primaryColor),
                ],
              ),
            ],
          );
        } else {
          return Row(
            children: [
              Icon(Icons.query_stats_rounded, size: 16, color: Colors.orange.shade800),
              const SizedBox(width: 6),
              Text(
                'Evaluation in Progress',
                style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.orange.shade800),
              ),
            ],
          );
        }
      } else {
        return Row(
          children: [
            Icon(Icons.hourglass_empty_rounded, size: 16, color: Colors.orange.shade800),
            const SizedBox(width: 6),
            Text(
              'Result Pending Publishing',
              style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.orange.shade800),
            ),
          ],
        );
      }
    } else if (exam.status == 'Live') {
      return Container(
        width: double.infinity,
        padding: const EdgeInsets.symmetric(vertical: 8),
        alignment: Alignment.center,
        decoration: BoxDecoration(
          color: AppTheme.primaryColor,
          borderRadius: BorderRadius.circular(AppTheme.borderRadiusMedium),
        ),
        child: const Text(
          'ENTER EXAM SYSTEM',
          style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 12),
        ),
      );
    } else if (exam.status == 'Missed') {
      return Row(
        children: [
          const Icon(Icons.warning_amber_rounded, size: 16, color: AppTheme.errorColor),
          const SizedBox(width: 6),
          Text(
            'You missed this examination submission.',
            style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppTheme.errorColor.withValues(alpha: 0.9)),
          ),
        ],
      );
    } else {
      // Upcoming
      return const Text(
        'Exam will be unlocked on start time.',
        style: TextStyle(fontSize: 12, color: AppTheme.textSecondary, fontStyle: FontStyle.italic),
      );
    }
  }

  Widget _buildErrorWidget(BuildContext context, WidgetRef ref, Object err) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(20.0),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.error_outline_rounded, size: 48, color: AppTheme.errorColor),
            const SizedBox(height: 12),
            const Text(
              'Failed to load category exams.',
              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
            ),
            const SizedBox(height: 8),
            Text(err.toString(), textAlign: TextAlign.center, style: const TextStyle(fontSize: 12)),
            const SizedBox(height: 16),
            ElevatedButton(
              onPressed: () => ref.refresh(timetableExamsProvider((semesterId, categoryId)).future),
              child: const Text('Retry'),
            ),
          ],
        ),
      ),
    );
  }
}
