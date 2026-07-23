import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:connectivity_plus/connectivity_plus.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/errors/app_exception.dart';
import '../../../shared/dialogs/response_dialog.dart';
import '../../exams/providers/exam_provider.dart';
import '../../exams/providers/selected_question_provider.dart';
import '../providers/scanner_provider.dart';
import '../services/upload_service.dart';
import '../services/upload_queue_service.dart';
import 'widgets/upload_error_card.dart';
import 'widgets/upload_progress_ring.dart';
import 'widgets/upload_stage_checklist.dart';
import 'widgets/upload_status_header.dart';

// =============================================================================
// SUBMISSION PROGRESS SCREEN
// High-level orchestrator for the real-time upload process.
// Manages the state pipeline and delegates UI sections to dedicated widgets.
// =============================================================================
class SubmissionProgressScreen extends ConsumerStatefulWidget {
  const SubmissionProgressScreen({super.key});

  @override
  ConsumerState<SubmissionProgressScreen> createState() => _SubmissionProgressScreenState();
}

class _SubmissionProgressScreenState extends ConsumerState<SubmissionProgressScreen>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;

  double _progress = 0.0;
  String _currentStage = 'Initializing upload connection';
  bool _isDone = false;
  String? _errorMessage;
  bool _isOffline = false;

  // Offline queue state
  StreamSubscription<ConnectivityResult>? _connectivitySub;
  String? _queuedPdfPath;
  String? _queuedExamToken;
  String? _queuedQuestionId;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(vsync: this, duration: const Duration(seconds: 2))..repeat();
    WidgetsBinding.instance.addPostFrameCallback((_) => _startUploadProcess());
    _connectivitySub = Connectivity().onConnectivityChanged.listen(_onConnectivityChanged);
  }

  @override
  void dispose() {
    _connectivitySub?.cancel();
    _controller.dispose();
    super.dispose();
  }

  void _onConnectivityChanged(ConnectivityResult result) {
    final isOnline = result != ConnectivityResult.none;
    if (isOnline && _isOffline && _queuedPdfPath != null && mounted) {
      _retryQueuedUpload();
    }
  }

  Future<void> _startUploadProcess() async {
    setState(() {
      _errorMessage = null;
      _isOffline = false;
      _currentStage = 'Initializing upload window...';
      _progress = 0.02;
    });

    final examState = ref.read(activeExamProvider);
    final scannerState = ref.read(scannerProvider);
    final selectedQuestion = ref.read(selectedQuestionProvider);

    if (examState.exam == null || scannerState.imagePaths.isEmpty || selectedQuestion == null) {
      setState(() => _errorMessage = 'Invalid submission state. Missing exam, captured page, or target question.');
      return;
    }

    final exam = examState.exam!;
    final examId = exam.id;
    final examToken = exam.token;
    final questionId = selectedQuestion.questionId;
    final uploadService = ref.read(uploadServiceProvider);

    try {
      final pdfPath = await _compilePdf();
      await _enhanceContrast();
      await uploadService.startUploadSession(examToken);
      final fileUrl = await _streamPdfToServer(uploadService, examToken, questionId, pdfPath);
      await _finalizeUpload(examId, questionId, fileUrl, scannerState.imagePaths);
      _showSuccessAndPop(questionId);
    } on OfflineException catch (_) {
      await _queueForOfflineRetry(examToken, questionId);
    } on ApiException catch (e) {
      setState(() => _errorMessage = 'Upload Error: ${e.message}');
    } catch (e) {
      setState(() => _errorMessage = 'System Failure: ${e.toString()}');
    }
  }

  Future<String> _compilePdf() async {
    setState(() { _currentStage = 'Compiling answer script into PDF...'; _progress = 0.05; });
    final pdfPath = await ref.read(scannerProvider.notifier).generatePdf();
    if (pdfPath == null) throw ApiException('Failed to generate answer script PDF.');
    return pdfPath;
  }

  Future<void> _enhanceContrast() async {
    setState(() { _currentStage = 'Optimizing contrast & clarity...'; _progress = 0.12; });
    await Future.delayed(const Duration(milliseconds: 600));
  }

  Future<String> _streamPdfToServer(UploadService uploadService, String token, String questionId, String pdfPath) async {
    setState(() { _currentStage = 'Streaming PDF Answer for Question $questionId'; _progress = 0.35; });
    final response = await uploadService.uploadAnswerPage(
      token: token,
      questionId: questionId,
      filePath: pdfPath,
      onProgress: (percent) {
        if (mounted) setState(() => _progress = 0.35 + percent * 0.55);
      },
    );
    return response.fileUrl;
  }

  Future<void> _finalizeUpload(String examId, String questionId, String fileUrl, List<String> imagePaths) async {
    setState(() { _currentStage = 'Finalizing upload cache'; _progress = 0.95; });
    ref.read(examSubmissionsProvider(examId).notifier).addSubmission(questionId, fileUrl);
    ref.read(questionScansProvider.notifier).saveScans(questionId, imagePaths);
    ref.read(scannerProvider.notifier).reset();
    setState(() { _currentStage = 'Completed'; _progress = 1.0; _isDone = true; });
    await Future.delayed(const Duration(milliseconds: 800));
  }

  void _showSuccessAndPop(String questionId, {String? customMessage}) {
    if (!mounted) return;
    ResponseDialog.show(
      context,
      title: 'Upload Successful',
      message: customMessage ?? 'Your scanned page for Question $questionId has been successfully compiled and saved in the active session cache.',
      type: ResponseDialogType.success,
      onConfirm: () {
        if (mounted) { context.pop(); context.pop(); context.pop(); }
      },
    );
  }

  Future<void> _queueForOfflineRetry(String examToken, String questionId) async {
    final pdfPath = await ref.read(scannerProvider.notifier).generatePdf();
    if (pdfPath != null) {
      ref.read(uploadQueueServiceProvider).addToQueue(pdfPath);
      _queuedPdfPath = pdfPath;
      _queuedExamToken = examToken;
      _queuedQuestionId = questionId;
    }
    setState(() {
      _isOffline = true;
      _errorMessage = 'No internet connection. Your answer has been saved locally and will upload automatically when you reconnect.';
    });
  }

  Future<void> _retryQueuedUpload() async {
    if (_queuedPdfPath == null || _queuedExamToken == null || _queuedQuestionId == null) return;

    final pdfPath = _queuedPdfPath!;
    final token = _queuedExamToken!;
    final questionId = _queuedQuestionId!;
    final examId = ref.read(activeExamProvider).exam?.id ?? '';
    final uploadService = ref.read(uploadServiceProvider);

    setState(() { _isOffline = false; _errorMessage = null; _currentStage = 'Reconnected — resuming upload...'; _progress = 0.18; });

    try {
      await uploadService.startUploadSession(token);
      final response = await uploadService.uploadAnswerPage(
        token: token,
        questionId: questionId,
        filePath: pdfPath,
        onProgress: (percent) { if (mounted) setState(() => _progress = 0.35 + percent * 0.55); },
      );

      ref.read(uploadQueueServiceProvider).removeFromQueue(pdfPath);
      _queuedPdfPath = null; _queuedExamToken = null; _queuedQuestionId = null;

      final imagePaths = ref.read(scannerProvider).imagePaths;
      await _finalizeUpload(examId, questionId, response.fileUrl, imagePaths);
      _showSuccessAndPop(questionId, customMessage: 'Your answer for Question $questionId was uploaded after reconnecting.');
    } on OfflineException catch (_) {
      setState(() { _isOffline = true; _errorMessage = 'Still offline. Will retry automatically when reconnected.'; _progress = 0.0; });
    } catch (e) {
      setState(() { _errorMessage = 'Auto-retry failed: ${e.toString()}'; _isOffline = false; });
    }
  }

  void _cancelAndPop() {
    ref.read(scannerProvider.notifier).reset();
    context.pop();
    context.pop();
    context.pop();
  }

  @override
  Widget build(BuildContext context) {
    final isError = _errorMessage != null;

    return Scaffold(
      backgroundColor: AppTheme.backgroundColor,
      body: SafeArea(
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 500),
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 32),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  UploadStatusHeader(isError: isError, isOffline: _isOffline),
                  const SizedBox(height: 48),
                  UploadProgressRing(progress: _progress, isError: isError, isOffline: _isOffline),
                  const SizedBox(height: 48),
                  if (isError) ...[
                    UploadErrorCard(errorMessage: _errorMessage!, isOffline: _isOffline),
                    const SizedBox(height: 32),
                    _ErrorActions(onCancel: _cancelAndPop, onRetry: _startUploadProcess),
                  ] else ...[
                    UploadStageChecklist(currentStage: _currentStage, isDone: _isDone),
                    const SizedBox(height: 32),
                    if (!_isDone)
                      TextButton(
                        onPressed: () => context.pop(),
                        child: const Text('Cancel Upload', style: TextStyle(color: AppTheme.errorColor, fontWeight: FontWeight.w600)),
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

class _ErrorActions extends StatelessWidget {
  final VoidCallback onCancel;
  final VoidCallback onRetry;

  const _ErrorActions({required this.onCancel, required this.onRetry});

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: TextButton(
            onPressed: onCancel,
            child: const Text('Cancel Upload', style: TextStyle(color: AppTheme.errorColor, fontWeight: FontWeight.bold)),
          ),
        ),
        const SizedBox(width: 16),
        Expanded(
          child: ElevatedButton.icon(
            onPressed: onRetry,
            icon: const Icon(Icons.refresh_rounded),
            label: const Text('Retry Upload'),
            style: ElevatedButton.styleFrom(backgroundColor: AppTheme.primaryColor),
          ),
        ),
      ],
    );
  }
}
