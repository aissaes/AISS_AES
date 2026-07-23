import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/errors/app_exception.dart';
import '../../../shared/dialogs/response_dialog.dart';
import '../../../shared/dialogs/confirmation_dialog.dart';
import '../../upload/services/upload_service.dart';
import '../../upload/providers/scanner_provider.dart';
import '../models/question_model.dart';
import '../providers/exam_provider.dart';
import '../providers/selected_question_provider.dart';
import '../services/exam_session_manager.dart';
import '../widgets/exam_kiosk_wrapper.dart';
import '../widgets/token_qr_scan_dialog.dart';
import 'dialogs/finalize_submission_dialog.dart';
import 'widgets/exam_info_tab.dart';
import 'widgets/exam_questions_tab.dart';

// =============================================================================
// EXAM DETAIL SCREEN
// High-level orchestrator assembling ExamInfoTab and ExamQuestionsTab.
// =============================================================================
class ExamDetailScreen extends ConsumerStatefulWidget {
  const ExamDetailScreen({super.key});

  @override
  ConsumerState<ExamDetailScreen> createState() => _ExamDetailScreenState();
}

class _ExamDetailScreenState extends ConsumerState<ExamDetailScreen> with TickerProviderStateMixin {
  Timer? _countdownTimer;
  int _secondsRemaining = 0;
  late final AnimationController _pulseController;
  late final TabController _tabController;
  bool _isFinalizing = false;
  String? _selectedQuestionFilter;

  @override
  void initState() {
    super.initState();
    _pulseController = AnimationController(vsync: this, duration: const Duration(seconds: 2))..repeat(reverse: true);
    _tabController = TabController(length: 2, vsync: this);
    WidgetsBinding.instance.addPostFrameCallback((_) => _initializeTimer());
  }

  @override
  void dispose() {
    _countdownTimer?.cancel();
    _pulseController.dispose();
    _tabController.dispose();
    super.dispose();
  }

  void _initializeTimer() {
    final exam = ref.read(activeExamProvider).exam;
    if (exam?.endTime == null) return;
    final trustedNow = ref.read(examSessionManagerProvider).nowUtc;
    final remaining = exam!.endTime!.toUtc().difference(trustedNow).inSeconds;
    setState(() => _secondsRemaining = remaining.clamp(0, remaining));
    _countdownTimer = Timer.periodic(const Duration(seconds: 1), (_) {
      if (_secondsRemaining > 0) {
        setState(() => _secondsRemaining--);
      } else {
        _countdownTimer?.cancel();
      }
    });
  }

  void _triggerScanForQuestion(QuestionModel question) {
    ref.read(selectedQuestionProvider.notifier).state = question;
    final existingScans = ref.read(questionScansProvider)[question.questionId] ?? [];
    if (existingScans.isNotEmpty) {
      ref.read(scannerProvider.notifier).initializeWithImages(existingScans);
      context.push('/upload/review');
    } else {
      ref.read(scannerProvider.notifier).reset();
      context.push('/upload/scanner');
    }
  }

  Future<void> _finalizeSubmission(String examToken) async {
    setState(() => _isFinalizing = true);
    try {
      final data = await ref.read(uploadServiceProvider).finalizeSubmission(examToken);
      if (!mounted) return;
      if (data.success) {
        await ref.read(examSessionManagerProvider).triggerFinalizeSubmission();
        if (!mounted) return;
        ResponseDialog.show(
          context,
          title: 'Submission Locked',
          message: 'Your exam scripts have been compiled, successfully verified, and securely locked on the evaluation server.',
          type: ResponseDialogType.success,
          buttonText: 'Finish',
          onConfirm: () { if (mounted) context.go('/upload-success'); },
        );
      } else {
        ResponseDialog.show(
          context,
          title: 'Finalization Failed',
          message: data.message.isNotEmpty ? data.message : 'An error occurred while locking your submission.',
          type: ResponseDialogType.error,
        );
      }
    } catch (exception) {
      if (!mounted) return;
      final isMismatch = exception is ApiException && exception.statusCode == 403;
      ResponseDialog.show(
        context,
        title: isMismatch ? 'College Mismatch' : 'Finalization Failed',
        message: isMismatch
            ? 'This exam belongs to another institution. Please contact your college administrator if this is an error.'
            : 'An error occurred while locking your submission: ${exception.toString().replaceAll('ApiException: ', '')}',
        type: ResponseDialogType.error,
      );
    } finally {
      if (mounted) setState(() => _isFinalizing = false);
    }
  }

  void _showFinalizeDialog(String examToken) {
    showDialog(
      context: context,
      builder: (dialogContext) => FinalizeSubmissionDialog(
        examToken: examToken,
        onScanQr: () {
          Navigator.pop(dialogContext);
          showDialog(
            context: context,
            barrierDismissible: false,
            builder: (_) => TokenQrScanDialog(
              onScanned: (scannedValue) {
                if (scannedValue.trim() == examToken.trim()) {
                  _finalizeSubmission(examToken);
                } else {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Mismatched QR code. Please scan the correct Exam QR.')),
                  );
                }
              },
            ),
          );
        },
      ),
    );
  }

  Future<bool> _confirmExit() {
    return ConfirmationDialog.show(
      context,
      title: 'Exit Exam Portal?',
      message: 'Your active script upload session is currently running. Exiting now will not finalize or secure your submission. Are you sure you want to go back?',
      type: ConfirmationDialogType.warning,
      cancelText: 'Cancel',
      confirmText: 'Exit',
      icon: Icons.warning_amber_rounded,
    );
  }

  @override
  Widget build(BuildContext context) {
    final exam = ref.watch(activeExamProvider).exam;
    if (exam == null) return const _NoExamLoaded();

    final isKioskLocked = ref.watch(examSessionManagerProvider).isKioskLocked;
    final submissionsState = ref.watch(examSubmissionsProvider(exam.id));

    final scaffold = Scaffold(
      backgroundColor: AppTheme.backgroundColor,
      appBar: AppBar(
        title: Text(exam.subjectName, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
        leading: isKioskLocked
            ? null
            : IconButton(
                icon: const Icon(Icons.arrow_back_rounded),
                onPressed: () async {
                  final router = GoRouter.of(context);
                  final shouldExit = await _confirmExit();
                  if (shouldExit && mounted) router.pop();
                },
              ),
        bottom: TabBar(
          controller: _tabController,
          indicatorColor: AppTheme.primaryColor,
          labelColor: AppTheme.primaryColor,
          unselectedLabelColor: AppTheme.textSecondary,
          labelStyle: const TextStyle(fontWeight: FontWeight.bold),
          tabs: const [
            Tab(text: 'SYLLABUS & INFO', icon: Icon(Icons.info_outline_rounded, size: 20)),
            Tab(text: 'QUESTION PAPER', icon: Icon(Icons.assignment_outlined, size: 20)),
          ],
        ),
      ),
      body: SafeArea(
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 600),
            child: TabBarView(
              controller: _tabController,
              children: [
                ExamInfoTab(
                  exam: exam,
                  secondsRemaining: _secondsRemaining,
                  pulseController: _pulseController,
                ),
                ExamQuestionsTab(
                  exam: exam,
                  submissionsState: submissionsState,
                  selectedFilter: _selectedQuestionFilter,
                  isFinalizing: _isFinalizing,
                  isTimeUp: _secondsRemaining <= 0,
                  onFilterChanged: (id) => setState(() => _selectedQuestionFilter = id),
                  onScanQuestion: _triggerScanForQuestion,
                  onFinalize: () => _showFinalizeDialog(exam.token),
                ),
              ],
            ),
          ),
        ),
      ),
    );

    if (isKioskLocked) {
      return ExamKioskWrapper(
        title: '${exam.subjectCode} Proctored Exam',
        child: scaffold,
      );
    }

    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, _) async {
        if (didPop) return;
        final router = GoRouter.of(context);
        final shouldExit = await _confirmExit();
        if (shouldExit && mounted) router.pop();
      },
      child: scaffold,
    );
  }
}

class _NoExamLoaded extends StatelessWidget {
  const _NoExamLoaded();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.backgroundColor,
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.warning_amber_rounded, size: 48, color: AppTheme.errorColor),
            const SizedBox(height: 16),
            const Text('No active exam loaded.', style: TextStyle(fontWeight: FontWeight.bold)),
            const SizedBox(height: 16),
            ElevatedButton(
              onPressed: () => context.pop(),
              child: const Text('Go Back'),
            ),
          ],
        ),
      ),
    );
  }
}
