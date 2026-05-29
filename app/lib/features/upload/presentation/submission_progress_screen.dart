import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/repositories/paper_repository.dart';
import '../../../core/services/api_service.dart';
import '../../exams/providers/exam_provider.dart';
import '../../exams/providers/selected_question_provider.dart';
import '../providers/scanner_provider.dart';

import '../../../shared/widgets/response_dialog.dart';

class SubmissionProgressScreen extends ConsumerStatefulWidget {
  const SubmissionProgressScreen({super.key});

  @override
  ConsumerState<SubmissionProgressScreen> createState() => _SubmissionProgressScreenState();
}

class _SubmissionProgressScreenState extends ConsumerState<SubmissionProgressScreen> with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  double _progress = 0.0;
  String _currentStage = 'Initializing upload connection';
  bool _isDone = false;
  
  // Error Recovery & Offline states
  String? _errorMessage;
  bool _isOffline = false;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 2),
    )..repeat();
    
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _startUploadProcess();
    });
  }

  Future<void> _startUploadProcess() async {
    setState(() {
      _errorMessage = null;
      _isOffline = false;
      _currentStage = 'Initializing upload window...';
      _progress = 0.02;
    });

    final exam = ref.read(activeExamProvider);
    final scannerState = ref.read(scannerProvider);
    final paperRepo = ref.read(paperRepositoryProvider);
    final selectedQuestion = ref.read(selectedQuestionProvider);

    if (exam == null || scannerState.imagePaths.isEmpty || selectedQuestion == null) {
      setState(() {
        _errorMessage = 'Invalid submission state. Missing exam, captured page, or target question.';
      });
      return;
    }

    final examId = exam['_id'] as String;
    final examToken = exam['token'] as String;
    final questionId = selectedQuestion['questionId'] as String;

    try {
      // 1. Generate multi-page PDF of all scanned script pages
      setState(() {
        _currentStage = 'Compiling answer script into PDF...';
        _progress = 0.05;
      });

      final pdfPath = await ref.read(scannerProvider.notifier).generatePdf();
      if (pdfPath == null) {
        throw ApiException('Failed to generate answer script PDF.');
      }

      // 2. Start or resume the upload window session
      setState(() {
        _currentStage = 'Acquiring secure upload window';
        _progress = 0.15;
      });
      await paperRepo.startUploadSession(examToken);

      // 3. Stream the multipart PDF upload for this specific question
      setState(() {
        _currentStage = 'Streaming PDF Answer for Question $questionId';
        _progress = 0.35;
      });

      final response = await paperRepo.uploadAnswerPage(
        token: examToken,
        questionId: questionId,
        filePath: pdfPath,
        onProgress: (percent) {
          if (mounted) {
            setState(() {
              _progress = 0.35 + percent * 0.55;
            });
          }
        },
      );

      final fileUrl = response['fileUrl'] as String;

      // 4. Finalize upload & update dynamic checklist
      setState(() {
        _currentStage = 'Finalizing upload cache';
        _progress = 0.95;
      });

      // Inject the uploaded image into the active submissions cache
      ref.read(examSubmissionsProvider(examId).notifier).addSubmission(questionId, fileUrl);

      setState(() {
        _currentStage = 'Completed';
        _progress = 1.0;
        _isDone = true;
      });

      // Clear scanned cache
      ref.read(scannerProvider.notifier).reset();

      await Future.delayed(const Duration(milliseconds: 800));
      if (mounted) {
        // Pop back to the ExamDetailScreen checklist!
        ResponseDialog.show(
          context,
          title: 'Upload Successful',
          message: 'Your scanned page for Question $questionId has been successfully compiled and saved in the active session cache.',
          type: ResponseDialogType.success,
          onConfirm: () {
            if (mounted) {
              context.pop(); // Pop from Progress
              context.pop(); // Pop from Review
              context.pop(); // Pop from Scanner to detail screen!
            }
          },
        );
      }

    } on OfflineException catch (e) {
      setState(() {
        _isOffline = true;
        _errorMessage = 'Offline: ${e.message}\nCheck Wi-Fi and tap retry to stream capture.';
      });
    } on ApiException catch (e) {
      setState(() {
        _errorMessage = 'Upload Error: ${e.message}';
      });
    } catch (e) {
      setState(() {
        _errorMessage = 'System Failure: ${e.toString()}';
      });
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final selectedQuestion = ref.watch(selectedQuestionProvider);
    final questionId = selectedQuestion?['questionId'] ?? '';
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
                  _buildStatusHeader(isError),
                  const SizedBox(height: 48),
                  _buildProgressIndicator(isError),
                  const SizedBox(height: 48),
                  
                  if (isError) ...[
                    _buildErrorBox(),
                    const SizedBox(height: 32),
                    Row(
                      children: [
                        Expanded(
                          child: TextButton(
                            onPressed: () {
                              ref.read(scannerProvider.notifier).reset();
                              context.pop(); // Pop from progress
                              context.pop(); // Pop from review
                              context.pop(); // Pop from scanner
                            },
                            child: const Text(
                              'Cancel Upload',
                              style: TextStyle(color: AppTheme.errorColor, fontWeight: FontWeight.bold),
                            ),
                          ),
                        ),
                        const SizedBox(width: 16),
                        Expanded(
                          child: ElevatedButton.icon(
                            onPressed: _startUploadProcess,
                            icon: const Icon(Icons.refresh_rounded),
                            label: const Text('Retry Upload'),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: AppTheme.primaryColor,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ] else ...[
                    _buildChecklist(questionId),
                    const SizedBox(height: 32),
                    if (!_isDone)
                      TextButton(
                        onPressed: () => context.pop(),
                        child: const Text(
                          'Cancel Upload',
                          style: TextStyle(color: AppTheme.errorColor, fontWeight: FontWeight.w600),
                        ),
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

  Widget _buildStatusHeader(bool isError) {
    return Column(
      children: [
        Text(
          isError ? 'Upload Interrupted' : 'Uploading Answer',
          style: const TextStyle(fontSize: 28, fontWeight: FontWeight.w800, letterSpacing: -0.5),
        ),
        const SizedBox(height: 8),
        Text(
          isError 
              ? 'Your captured answer page is preserved.'
              : 'Please keep the app open until finished.',
          style: const TextStyle(color: AppTheme.textSecondary, fontSize: 15),
        ),
      ],
    );
  }

  Widget _buildProgressIndicator(bool isError) {
    return Stack(
      alignment: Alignment.center,
      children: [
        SizedBox(
          width: 200,
          height: 200,
          child: CircularProgressIndicator(
            value: isError ? 0.0 : _progress,
            strokeWidth: 12,
            backgroundColor: (isError ? AppTheme.errorColor : AppTheme.primaryColor).withValues(alpha: 0.1),
            valueColor: AlwaysStoppedAnimation<Color>(isError ? AppTheme.errorColor : AppTheme.primaryColor),
            strokeCap: StrokeCap.round,
          ),
        ),
        Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (isError) ...[
              const Icon(Icons.wifi_off_rounded, size: 48, color: AppTheme.errorColor),
              const SizedBox(height: 4),
              const Text(
                'OFFLINE',
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w900,
                  color: AppTheme.errorColor,
                  letterSpacing: 1,
                ),
              ),
            ] else ...[
              Text(
                '${(_progress * 100).toInt()}%',
                style: const TextStyle(fontSize: 48, fontWeight: FontWeight.w800, letterSpacing: -1),
              ),
              Text(
                'COMPLETE',
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w800,
                  color: AppTheme.primaryColor.withValues(alpha: 0.6),
                  letterSpacing: 1,
                ),
              ),
            ],
          ],
        ),
      ],
    );
  }

  Widget _buildErrorBox() {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: AppTheme.errorColor.withValues(alpha: 0.05),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppTheme.errorColor.withValues(alpha: 0.2)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.warning_amber_rounded, color: AppTheme.errorColor),
              const SizedBox(width: 8),
              Text(
                _isOffline ? 'No Internet Connection' : 'Upload Failed',
                style: const TextStyle(fontWeight: FontWeight.bold, color: AppTheme.errorColor, fontSize: 16),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            _errorMessage ?? 'An unknown connection error occurred.',
            style: const TextStyle(color: AppTheme.textPrimary, fontSize: 14, height: 1.4),
          ),
        ],
      ),
    );
  }

  Widget _buildChecklist(String questionId) {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: AppTheme.surfaceColor,
        borderRadius: BorderRadius.circular(AppTheme.borderRadiusLarge),
        border: Border.all(color: AppTheme.outlineColor),
      ),
      child: Column(
        children: [
          _buildStepItem('Secure Upload Session', 'Acquiring secure upload window'),
          const SizedBox(height: 16),
          _buildStepItem('Question $questionId Script Page', 'Streaming Answer'),
          const SizedBox(height: 16),
          _buildStepItem('Register Upload in Database', 'Finalizing upload cache'),
        ],
      ),
    );
  }

  Widget _buildStepItem(String label, String stageKeyPrefix) {
    bool isCompleted = false;
    bool isCurrent = false;

    if (stageKeyPrefix == 'Acquiring secure upload window') {
      isCompleted = _currentStage.startsWith('Streaming Answer') || _currentStage == 'Finalizing upload cache' || _isDone;
      isCurrent = _currentStage == 'Acquiring secure upload window';
    } else if (stageKeyPrefix == 'Streaming Answer') {
      isCompleted = _currentStage == 'Finalizing upload cache' || _isDone;
      isCurrent = _currentStage.startsWith('Streaming Answer');
    } else if (stageKeyPrefix == 'Finalizing upload cache') {
      isCompleted = _isDone;
      isCurrent = _currentStage == 'Finalizing upload cache';
    }

    return Row(
      children: [
        AnimatedContainer(
          duration: const Duration(milliseconds: 300),
          width: 24,
          height: 24,
          decoration: BoxDecoration(
            color: isCompleted ? AppTheme.successColor : (isCurrent ? AppTheme.primaryColor : Colors.transparent),
            shape: BoxShape.circle,
            border: Border.all(
              color: isCompleted || isCurrent ? Colors.transparent : AppTheme.outlineColor,
              width: 2,
            ),
          ),
          child: isCompleted
              ? const Icon(Icons.check, size: 14, color: Colors.white)
              : (isCurrent ? const Center(child: SizedBox(width: 8, height: 8, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))) : null),
        ),
        const SizedBox(width: 16),
        Text(
          isCurrent && stageKeyPrefix == 'Streaming Answer' ? _currentStage : label,
          style: TextStyle(
            fontSize: 15,
            fontWeight: isCurrent ? FontWeight.w700 : FontWeight.w500,
            color: isCurrent ? AppTheme.textPrimary : AppTheme.textSecondary,
          ),
        ),
      ],
    );
  }
}
