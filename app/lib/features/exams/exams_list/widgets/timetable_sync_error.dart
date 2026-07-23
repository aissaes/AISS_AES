import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../shared/widgets/app_error_card.dart';
import '../../providers/student_results_provider.dart';

// =============================================================================
// TIMETABLE SYNC ERROR
// Leverages shared AppErrorCard for pixel-perfect error presentations.
// =============================================================================
class TimetableSyncError extends ConsumerWidget {
  final Object error;

  const TimetableSyncError({super.key, required this.error});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isOfflineError = error.toString().contains('Offline');

    return Padding(
      padding: const EdgeInsets.only(top: 40),
      child: AppErrorCard(
        title: 'Sync Failure',
        message: isOfflineError
            ? 'No internet connection or AES server is offline.'
            : 'An unexpected error occurred while syncing your timetable.',
        buttonLabel: 'Try Again',
        onRetry: () => ref.invalidate(studentTimetableAndExamsProvider),
      ),
    );
  }
}
