import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/errors/app_exception.dart';
import '../../../shared/widgets/app_logo.dart';
import '../../../shared/widgets/app_loading_indicator.dart';
import '../../../shared/dialogs/response_dialog.dart';
import '../../auth/providers/auth_provider.dart';
import '../models/exam_model.dart';
import '../models/exam_result_model.dart';
import '../models/exam_state.dart';
import '../models/exam_session_state.dart';
import '../providers/exam_provider.dart';
import '../providers/student_results_provider.dart';
import '../services/exam_service.dart';
import '../services/exam_session_manager.dart';
import '../widgets/token_qr_scan_dialog.dart';
import 'dialogs/unlock_exam_dialog.dart';
import 'widgets/exam_segmented_control.dart';
import 'widgets/exam_tab_content.dart';
import 'widgets/timetable_sync_error.dart';

// =============================================================================
// EXAMS LIST SCREEN
// High-level orchestrator assembling header, segmented control, and exam list.
// =============================================================================
class ExamsListScreen extends ConsumerStatefulWidget {
  const ExamsListScreen({super.key});

  @override
  ConsumerState<ExamsListScreen> createState() => _ExamsListScreenState();
}

class _ExamsListScreenState extends ConsumerState<ExamsListScreen> with WidgetsBindingObserver {
  ExamTab _selectedTab = ExamTab.live;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      ref.invalidate(studentTimetableAndExamsProvider);
    }
  }

  Future<void> _unlockExamWithToken(String token) async {
    if (token.isEmpty) {
      ResponseDialog.show(
        context,
        title: 'Token Required',
        message: 'Please scan a valid exam QR code to unlock your examination.',
        type: ResponseDialogType.warning,
      );
      return;
    }

    try {
      final examService = ref.read(examServiceProvider);
      final data = await examService.getExamByToken(token);
      ref.read(activeExamProvider.notifier).state = ExamState(exam: data);

      final sessionManager = ref.read(examSessionManagerProvider);
      if (sessionManager.activeSession?.examId != data.id) {
        await sessionManager.initializeOrRestoreSession(ExamSession(
          examId: data.id,
          examToken: token,
          startUtc: data.startTime?.toUtc() ?? DateTime.now().toUtc(),
          endUtc: data.endTime?.toUtc() ?? DateTime.now().toUtc().add(const Duration(hours: 3)),
        ));
      }

      if (mounted) context.push('/exams/detail');
    } catch (exception) {
      if (!mounted) return;
      final isMismatch = exception is ApiException && exception.statusCode == 403;
      ResponseDialog.show(
        context,
        title: isMismatch ? 'College Mismatch' : 'Unlock Failed',
        message: isMismatch
            ? 'This exam belongs to another institution. Please contact your college administrator if this is an error.'
            : exception.toString().replaceAll('Exception: ', '').replaceAll('ApiException: ', ''),
        type: ResponseDialogType.error,
      );
    }
  }

  void _scanExamQr() {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (_) => TokenQrScanDialog(
        onScanned: (token) { if (mounted) _unlockExamWithToken(token.trim()); },
      ),
    );
  }

  void _showUnlockDialog(ExamModel exam) {
    showDialog(
      context: context,
      barrierDismissible: true,
      builder: (_) => UnlockExamDialog(
        exam: exam,
        onScanQr: () { Navigator.pop(context); _scanExamQr(); },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isOffline = ref.watch(authProvider).isOffline;
    final timetableAsync = ref.watch(studentTimetableAndExamsProvider);
    final resultsAsync = ref.watch(studentResultsProvider);

    return Scaffold(
      backgroundColor: AppTheme.backgroundColor,
      appBar: AppBar(
        backgroundColor: AppTheme.backgroundColor,
        elevation: 0,
        centerTitle: true,
        leading: const Padding(
          padding: EdgeInsets.all(12.0),
          child: AppLogo(size: 24),
        ),
        title: const Text('My Exams', style: TextStyle(fontWeight: FontWeight.w800, color: AppTheme.textPrimary, fontSize: 18)),
      ),
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: () async {
            ref.invalidate(studentTimetableAndExamsProvider);
            ref.invalidate(studentResultsProvider);
          },
          child: SingleChildScrollView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _HeaderSection(isOffline: isOffline),
                const SizedBox(height: 20),
                ExamSegmentedControl(
                  selectedTab: _selectedTab,
                  onTabSelected: (tab) => setState(() => _selectedTab = tab),
                ),
                const SizedBox(height: 24),
                timetableAsync.when(
                  loading: () => const Padding(
                    padding: EdgeInsets.only(top: 60),
                    child: Center(child: AppLoadingIndicator()),
                  ),
                  error: (err, _) => TimetableSyncError(error: err),
                  data: (exams) => ExamTabContent(
                    exams: exams,
                    results: resultsAsync.asData?.value ?? <ExamResultModel>[],
                    selectedTab: _selectedTab,
                    onUnlock: _showUnlockDialog,
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

class _HeaderSection extends StatelessWidget {
  final bool isOffline;
  const _HeaderSection({required this.isOffline});

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Academic Schedule',
          style: Theme.of(context).textTheme.headlineMedium?.copyWith(fontWeight: FontWeight.w900),
        ),
        const SizedBox(height: 4),
        Text(
          isOffline ? 'Offline — Viewing Cached Schedule' : 'Verify tokens and submit your answer scripts securely.',
          style: Theme.of(context).textTheme.bodyMedium?.copyWith(
            color: isOffline ? Colors.orange.shade800 : AppTheme.textSecondary,
            fontWeight: isOffline ? FontWeight.w600 : FontWeight.normal,
          ),
        ),
      ],
    );
  }
}
