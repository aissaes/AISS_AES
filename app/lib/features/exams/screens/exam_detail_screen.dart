import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../../../core/theme/app_theme.dart';
import '../../upload/repositories/paper_repository_impl.dart';
import '../../upload/providers/scanner_provider.dart';
import '../providers/exam_provider.dart';
import '../providers/selected_question_provider.dart';
import '../../../shared/widgets/response_dialog.dart';
import '../../../shared/widgets/confirmation_dialog.dart';
import '../../../core/models/exam_model.dart';
import '../../../core/models/question_model.dart';
import '../../../core/models/submission_model.dart';
import 'dart:async';
import 'dart:io' show File;
import 'package:mobile_scanner/mobile_scanner.dart';

class ExamDetailScreen extends ConsumerStatefulWidget {
  const ExamDetailScreen({super.key});

  @override
  ConsumerState<ExamDetailScreen> createState() => _ExamDetailScreenState();
}

class _ExamDetailScreenState extends ConsumerState<ExamDetailScreen> with TickerProviderStateMixin {
  Timer? _timer;
  int _secondsRemaining = 0;
  late AnimationController _pulseController;
  late TabController _tabController;
  bool _isFinalizing = false;
  String? _selectedQuestionFilter;

  @override
  void initState() {
    super.initState();
    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 2),
    )..repeat(reverse: true);
    
    _tabController = TabController(length: 2, vsync: this);
    
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _initializeTimer();
    });
  }

  void _initializeTimer() {
    final examState = ref.read(activeExamProvider);
    final exam = examState.exam;
    if (exam == null) return;

    final endTime = exam.endTime;
    if (endTime != null) {
      final difference = endTime.difference(DateTime.now()).inSeconds;
      
      setState(() {
        _secondsRemaining = difference > 0 ? difference : 0;
      });

      _startTimer();
    }
  }

  void _startTimer() {
    _timer?.cancel();
    _timer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (_secondsRemaining > 0) {
        setState(() {
          _secondsRemaining--;
        });
      } else {
        _timer?.cancel();
      }
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    _pulseController.dispose();
    _tabController.dispose();
    _finalizeTokenController.dispose();
    super.dispose();
  }

  String _formatTime(int seconds) {
    if (seconds <= 0) return '00:00:00';
    int hours = seconds ~/ 3600;
    int minutes = (seconds % 3600) ~/ 60;
    int remainingSeconds = seconds % 60;
    
    return '${hours.toString().padLeft(2, '0')}:${minutes.toString().padLeft(2, '0')}:${remainingSeconds.toString().padLeft(2, '0')}';
  }

  void _triggerScanForQuestion(QuestionModel question) {
    ref.read(selectedQuestionProvider.notifier).state = question;
    final existingScans = ref.read(questionScansProvider)[question.questionId] ?? [];
    if (existingScans.isNotEmpty) {
      ref.read(scannerProvider.notifier).initializeWithImages(existingScans);
      context.push('/upload/review'); // Open pages preview directly
    } else {
      ref.read(scannerProvider.notifier).reset();
      context.push('/upload/scanner'); // Open camera for first scan
    }
  }

  void _finalizeSubmission(String examToken) async {
    setState(() => _isFinalizing = true);
    
    final paperRepo = ref.read(paperRepositoryProvider);
    try {
      final data = await paperRepo.finalizeSubmission(examToken);
      if (mounted) {
        if (data.success) {
          ResponseDialog.show(
            context,
            title: 'Submission Locked',
            message: 'Your exam scripts have been compiled, successfully verified, and securely locked on the evaluation server.',
            type: ResponseDialogType.success,
            buttonText: 'Finish',
            onConfirm: () {
              if (mounted) {
                context.go('/upload-success');
              }
            },
          );
        } else {
          ResponseDialog.show(
            context,
            title: 'Finalization Failed',
            message: data.message.isNotEmpty ? data.message : 'An error occurred while locking your submission.',
            type: ResponseDialogType.error,
          );
        }
      }
    } catch (exception) {
      if (mounted) {
        ResponseDialog.show(
          context,
          title: 'Finalization Failed',
          message: 'An error occurred while locking your submission: ${exception.toString().replaceAll('ApiException: ', '')}',
          type: ResponseDialogType.error,
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isFinalizing = false);
      }
    }
  }

  final TextEditingController _finalizeTokenController = TextEditingController();

  void _showFinalizeDialog(BuildContext context, String examToken) {
    _finalizeTokenController.clear();
    showDialog(
      context: context,
      barrierDismissible: true,
      builder: (dialogContext) {
        return AlertDialog(
          backgroundColor: AppTheme.surfaceColor,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(AppTheme.borderRadiusLarge),
            side: const BorderSide(color: AppTheme.outlineColor),
          ),
          title: const Row(
            children: [
              Icon(Icons.verified_rounded, color: AppTheme.successColor, size: 22),
              SizedBox(width: 12),
              Expanded(
                child: Text(
                  'Finalize & Submit',
                  style: TextStyle(color: AppTheme.textPrimary, fontWeight: FontWeight.bold, fontSize: 16),
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ],
          ),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const Text(
                  'Enter the exam verification token or scan the projected QR code to finalize and lock your submission.',
                  style: TextStyle(color: AppTheme.textSecondary, fontSize: 13, height: 1.4),
                ),
                const SizedBox(height: 20),
                TextField(
                  controller: _finalizeTokenController,
                  style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold),
                  decoration: InputDecoration(
                    hintText: 'Enter Exam Token',
                    prefixIcon: const Icon(Icons.vpn_key_rounded, size: 18),
                    contentPadding: const EdgeInsets.symmetric(vertical: 12),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(AppTheme.borderRadiusMedium),
                    ),
                  ),
                ),
                const SizedBox(height: 12),
                ElevatedButton.icon(
                  onPressed: () {
                    Navigator.pop(dialogContext);
                    // Open QR scan dialog
                    showDialog(
                      context: context,
                      barrierDismissible: false,
                      builder: (qrDialogContext) {
                        return QrScanDialog(
                          examToken: examToken,
                          onVerified: (verifiedToken) {
                            _finalizeSubmission(verifiedToken);
                          },
                        );
                      },
                    );
                  },
                  icon: const Icon(Icons.qr_code_scanner_rounded, size: 16),
                  label: const Text('Scan Exam QR Code'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppTheme.primaryColor.withValues(alpha: 0.1),
                    foregroundColor: AppTheme.primaryColor,
                    elevation: 0,
                    minimumSize: const Size(0, 42),
                  ),
                ),
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(dialogContext),
              child: const Text('Cancel', style: TextStyle(color: AppTheme.textSecondary, fontWeight: FontWeight.bold)),
            ),
            ElevatedButton(
              onPressed: () {
                final token = _finalizeTokenController.text.trim();
                if (token.isEmpty) return;
                Navigator.pop(dialogContext);
                _finalizeSubmission(token);
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: AppTheme.successColor,
                minimumSize: const Size(90, 38),
              ),
              child: const Text('Submit'),
            ),
          ],
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final examState = ref.watch(activeExamProvider);
    final exam = examState.exam;

    if (exam == null) {
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

    final String examId = exam.id;
    final subjectName = exam.subjectName;
    final subjectCode = exam.subjectCode;
    final examType = exam.examType;
    final semester = exam.semester;
    final course = exam.course;
    final department = exam.department;
    final maxMarks = exam.maxMarks.toStringAsFixed(0);

    // Parse and format end date
    String formattedEndTime = 'N/A';
    final endTime = exam.endTime;
    if (endTime != null) {
      try {
        formattedEndTime = DateFormat('hh:mm a').format(endTime);
      } catch (_) {}
    }

    // Load dynamic submissions checklist state
    final submissionsState = ref.watch(examSubmissionsProvider(examId));

    Future<bool> showExitConfirmation(BuildContext context) {
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

    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, result) async {
        if (didPop) return;
        final shouldExit = await showExitConfirmation(context);
        if (shouldExit && context.mounted) {
          context.pop();
        }
      },
      child: Scaffold(
        backgroundColor: AppTheme.backgroundColor,
        appBar: AppBar(
          title: Text(subjectName, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
          leading: IconButton(
            icon: const Icon(Icons.arrow_back_rounded),
            onPressed: () async {
              final shouldExit = await showExitConfirmation(context);
              if (shouldExit && context.mounted) {
                context.pop();
              }
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
                  // TAB 1: GUIDELINES & SYLLABUS
                  SingleChildScrollView(
                    padding: const EdgeInsets.only(left: 24, right: 24, top: 24, bottom: 24),
                    child: Column(
                      children: [
                        _buildHeroCard(subjectName, subjectCode, examType, semester, course, department, maxMarks),
                        const SizedBox(height: 24),
                        _buildTimerCard(formattedEndTime),
                        const SizedBox(height: 24),
                        _buildRequirementSection(),
                      ],
                    ),
                  ),
                  
                  // TAB 2: QUESTIONS SHEET & CAPTURES
                  _buildQuestionsList(exam, submissionsState),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildQuestionFilterChips(ExamModel exam, AsyncValue<SubmissionModel> submissionsState) {
    final List<String> questionIds = [];
    for (final sec in exam.sections) {
      for (final q in sec.questions) {
        if (q.children == null || q.children!.isEmpty) {
          questionIds.add(q.questionId);
        } else {
          for (final sub in q.children!) {
            questionIds.add(sub.questionId);
          }
        }
      }
    }

    final uploadsMap = submissionsState.valueOrNull?.uploads ?? {};

    return Container(
      height: 48,
      margin: const EdgeInsets.symmetric(vertical: 8),
      child: ListView.builder(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 16),
        itemCount: questionIds.length + 1,
        itemBuilder: (context, index) {
          if (index == 0) {
            final isSelected = _selectedQuestionFilter == null;
            return Padding(
              padding: const EdgeInsets.only(right: 8.0),
              child: ChoiceChip(
                label: const Text('All Questions'),
                selected: isSelected,
                selectedColor: AppTheme.primaryColor.withValues(alpha: 0.15),
                backgroundColor: AppTheme.surfaceColor,
                labelStyle: TextStyle(
                  color: isSelected ? AppTheme.primaryColor : AppTheme.textSecondary,
                  fontWeight: FontWeight.bold,
                ),
                onSelected: (_) {
                  setState(() {
                    _selectedQuestionFilter = null;
                  });
                },
              ),
            );
          }

          final qId = questionIds[index - 1];
          final isSelected = _selectedQuestionFilter == qId;
          final hasUploaded = uploadsMap.containsKey(qId);

          return Padding(
            padding: const EdgeInsets.only(right: 8.0),
            child: ChoiceChip(
              avatar: Icon(
                hasUploaded ? Icons.check_circle_rounded : Icons.radio_button_unchecked_rounded,
                size: 14,
                color: hasUploaded ? AppTheme.successColor : AppTheme.textSecondary,
              ),
              label: Text('Q$qId'),
              selected: isSelected,
              selectedColor: AppTheme.primaryColor.withValues(alpha: 0.15),
              backgroundColor: AppTheme.surfaceColor,
              labelStyle: TextStyle(
                color: isSelected ? AppTheme.primaryColor : AppTheme.textSecondary,
                fontWeight: FontWeight.bold,
              ),
              onSelected: (_) {
                setState(() {
                  _selectedQuestionFilter = qId;
                });
              },
            ),
          );
        },
      ),
    );
  }

  Widget _buildQuestionsList(ExamModel exam, AsyncValue<SubmissionModel> submissionsState) {
    final sections = exam.sections;
    final examToken = exam.token;

    if (sections.isEmpty) {
      return const Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.lock_clock_outlined, size: 48, color: AppTheme.textSecondary),
            SizedBox(height: 16),
            Text(
              'Question paper is pending approval or upload.',
              style: TextStyle(fontWeight: FontWeight.w600, color: AppTheme.textSecondary),
            ),
          ],
        ),
      );
    }

    return Column(
      children: [
        _buildQuestionFilterChips(exam, submissionsState),
        Expanded(
          child: submissionsState.when(
            loading: () => const Center(child: CircularProgressIndicator()),
            error: (err, stack) => Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(Icons.wifi_off_rounded, size: 48, color: AppTheme.errorColor),
                  const SizedBox(height: 12),
                  const Text('Failed to sync submissions status.'),
                  const SizedBox(height: 12),
                  ElevatedButton(
                    onPressed: () => ref.refresh(examSubmissionsProvider(exam.id)),
                    child: const Text('Retry Connection'),
                  ),
                ],
              ),
            ),
            data: (submission) {
              final uploadsMap = submission.uploads;
              return ListView.builder(
                padding: const EdgeInsets.only(left: 20, right: 20, top: 10, bottom: 20),
                itemCount: sections.length,
                itemBuilder: (context, sectionIndex) {
                  final section = sections[sectionIndex];
                  var questions = section.questions;
                  final sectionLabel = section.title;

                  if (_selectedQuestionFilter != null) {
                    questions = questions.where((q) {
                      if (q.questionId == _selectedQuestionFilter) return true;
                      if (q.children != null) {
                        return q.children!.any((sub) => sub.questionId == _selectedQuestionFilter);
                      }
                      return false;
                    }).toList();
                  }

                  if (questions.isEmpty) return const SizedBox.shrink();

                  return Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Padding(
                        padding: const EdgeInsets.only(top: 8.0, bottom: 12.0),
                        child: Row(
                          children: [
                            Text(
                              'SECTION $sectionLabel',
                              style: const TextStyle(
                                fontSize: 14,
                                fontWeight: FontWeight.w800,
                                color: AppTheme.primaryColor,
                                letterSpacing: 0.5,
                              ),
                            ),
                            const SizedBox(width: 12),
                            const Expanded(child: Divider(color: AppTheme.outlineColor, height: 1)),
                          ],
                        ),
                      ),
                      ...questions.map((q) {
                        return _buildQuestionItem(q, uploadsMap);
                      }),
                      const SizedBox(height: 16),
                    ],
                  );
                },
              );
            },
          ),
        ),
        
        // Finalize Submit Bottom Area
        Container(
          padding: const EdgeInsets.only(left: 24, right: 24, top: 20, bottom: 20),
          decoration: const BoxDecoration(
            color: AppTheme.surfaceColor,
            border: Border(top: BorderSide(color: AppTheme.outlineColor)),
          ),
          child: ElevatedButton(
            onPressed: _isFinalizing || _secondsRemaining <= 0
                ? null
                : () {
                    _showFinalizeDialog(context, examToken);
                  },
            style: ElevatedButton.styleFrom(
              backgroundColor: AppTheme.successColor,
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                _isFinalizing
                    ? const SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                      )
                    : const Icon(Icons.cloud_done_rounded, color: Colors.white),
                const SizedBox(width: 12),
                Text(_isFinalizing ? 'Finalizing Exam...' : 'Finalize & Submit Exam'),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildLocalScansPreview(String qId) {
    final localScans = ref.watch(questionScansProvider)[qId] ?? [];
    if (localScans.isEmpty) return const SizedBox.shrink();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const SizedBox(height: 12),
        Row(
          children: [
            const Icon(Icons.collections_bookmark_outlined, size: 12, color: AppTheme.textSecondary),
            const SizedBox(width: 6),
            Text(
              '${localScans.length} Scanned Page${localScans.length == 1 ? "" : "s"}',
              style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: AppTheme.textSecondary, letterSpacing: 0.3),
            ),
          ],
        ),
        const SizedBox(height: 8),
        SizedBox(
          height: 68,
          child: ListView.builder(
            scrollDirection: Axis.horizontal,
            itemCount: localScans.length,
            itemBuilder: (context, index) {
              return Container(
                width: 48,
                margin: const EdgeInsets.only(right: 8),
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: AppTheme.outlineColor, width: 1.5),
                ),
                clipBehavior: Clip.antiAlias,
                child: Stack(
                  fit: StackFit.expand,
                  children: [
                    Image.file(File(localScans[index]), fit: BoxFit.cover),
                    Positioned(
                      left: 2,
                      bottom: 2,
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1),
                        decoration: BoxDecoration(
                          color: Colors.black.withValues(alpha: 0.75),
                          borderRadius: BorderRadius.circular(3),
                        ),
                        child: Text(
                          'P${index + 1}',
                          style: const TextStyle(color: Colors.white, fontSize: 8, fontWeight: FontWeight.bold),
                        ),
                      ),
                    ),
                  ],
                ),
              );
            },
          ),
        ),
      ],
    );
  }

  Widget _buildQuestionItem(QuestionModel q, Map<String, String> uploadsMap) {
    final questionId = q.questionId;
    final text = q.text;
    final marks = q.marks.toStringAsFixed(0);
    final hasUploaded = uploadsMap.containsKey(questionId);
    
    final children = q.children;
    final localScans = ref.watch(questionScansProvider)[questionId] ?? [];
    final hasLocalScans = localScans.isNotEmpty;

    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppTheme.surfaceColor,
        borderRadius: BorderRadius.circular(AppTheme.borderRadiusMedium),
        border: Border.all(
          color: hasUploaded ? AppTheme.successColor.withValues(alpha: 0.3) : AppTheme.outlineColor,
          width: hasUploaded ? 1.5 : 1,
        ),
        boxShadow: AppTheme.softShadow,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Question $questionId',
                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: AppTheme.textPrimary),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: (hasUploaded ? AppTheme.successColor : AppTheme.textSecondary).withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Row(
                  children: [
                    Icon(
                      hasUploaded ? Icons.check_circle_rounded : Icons.radio_button_unchecked_rounded,
                      size: 12,
                      color: hasUploaded ? AppTheme.successColor : AppTheme.textSecondary,
                    ),
                    const SizedBox(width: 4),
                    Text(
                      hasUploaded ? 'UPLOADED' : 'PENDING',
                      style: TextStyle(
                        color: hasUploaded ? AppTheme.successColor : AppTheme.textSecondary,
                        fontSize: 9,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            text,
            style: const TextStyle(fontSize: 14, color: AppTheme.textPrimary, height: 1.4),
          ),
          
          if (children == null || children.isEmpty) ...[
            _buildLocalScansPreview(questionId),
          ],
          
          const SizedBox(height: 12),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                '[$marks Marks]',
                style: const TextStyle(fontSize: 12, color: AppTheme.primaryColor, fontWeight: FontWeight.bold),
              ),
              if (children == null || children.isEmpty) // Only upload at leaf nodes
                ElevatedButton.icon(
                  onPressed: () => _triggerScanForQuestion(q),
                  icon: Icon(hasLocalScans ? Icons.edit_note_rounded : Icons.camera_alt_rounded, size: 14),
                  label: Text(hasLocalScans ? 'Manage Pages' : 'Upload Scan'),
                  style: ElevatedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                    minimumSize: Size.zero,
                    tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                    backgroundColor: hasLocalScans ? Colors.white : AppTheme.primaryColor,
                    foregroundColor: hasLocalScans ? AppTheme.primaryColor : Colors.white,
                    side: hasLocalScans ? const BorderSide(color: AppTheme.primaryColor) : null,
                  ),
                ),
            ],
          ),
          
          // Render Sub-questions if present (S1-Q1a, S1-Q1b...)
          if (children != null && children.isNotEmpty) ...[
            const SizedBox(height: 16),
            const Divider(height: 1, color: AppTheme.outlineColor),
            const SizedBox(height: 12),
            ...children.map((subQ) {
              final subId = subQ.questionId;
              final subText = subQ.text;
              final subMarks = subQ.marks.toStringAsFixed(0);
              final subUploaded = uploadsMap.containsKey(subId);
              final subLocalScans = ref.watch(questionScansProvider)[subId] ?? [];
              final subHasScans = subLocalScans.isNotEmpty;

              return Container(
                margin: const EdgeInsets.only(bottom: 12, left: 12),
                padding: const EdgeInsets.only(left: 12),
                decoration: const BoxDecoration(
                  border: Border(left: BorderSide(color: AppTheme.outlineColor, width: 2)),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          'Sub-question $subId',
                          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: AppTheme.textPrimary),
                        ),
                        Icon(
                          subUploaded ? Icons.check_circle_rounded : Icons.radio_button_unchecked_rounded,
                          size: 14,
                          color: subUploaded ? AppTheme.successColor : AppTheme.textSecondary,
                        ),
                      ],
                    ),
                    const SizedBox(height: 6),
                    Text(
                      subText,
                      style: const TextStyle(fontSize: 13, color: AppTheme.textSecondary),
                    ),
                    
                    _buildLocalScansPreview(subId),
                    
                    const SizedBox(height: 8),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          '[$subMarks Marks]',
                          style: const TextStyle(fontSize: 11, color: AppTheme.primaryColor, fontWeight: FontWeight.bold),
                        ),
                        ElevatedButton.icon(
                          onPressed: () => _triggerScanForQuestion(subQ),
                          icon: Icon(subHasScans ? Icons.edit_note_rounded : Icons.camera_alt_rounded, size: 12),
                          label: Text(subHasScans ? 'Manage Pages' : 'Upload'),
                          style: ElevatedButton.styleFrom(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                            minimumSize: Size.zero,
                            tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                            backgroundColor: subHasScans ? Colors.white : AppTheme.primaryColor,
                            foregroundColor: subHasScans ? AppTheme.primaryColor : Colors.white,
                            side: subHasScans ? const BorderSide(color: AppTheme.primaryColor, width: 1) : null,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              );
            }),
          ],
        ],
      ),
    );
  }

  Widget _buildHeroCard(String title, String code, String type, String sem, String course, String department, String marks) {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: AppTheme.surfaceColor,
        borderRadius: BorderRadius.circular(AppTheme.borderRadiusLarge),
        boxShadow: AppTheme.softShadow,
        border: Border.all(color: AppTheme.outlineColor),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                decoration: BoxDecoration(
                  color: AppTheme.primaryColor.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  code,
                  style: const TextStyle(
                    color: AppTheme.primaryColor,
                    fontSize: 12,
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: AppTheme.successColor.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: const Row(
                  children: [
                    Icon(Icons.check_circle_rounded, size: 12, color: AppTheme.successColor),
                    SizedBox(width: 4),
                    Text(
                      'SECURE',
                      style: TextStyle(
                        color: AppTheme.successColor,
                        fontSize: 10,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          Text(
            title,
            style: const TextStyle(
              fontSize: 22,
              fontWeight: FontWeight.w800,
              color: AppTheme.textPrimary,
              letterSpacing: -0.5,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            department != 'N/A'
                ? '$type • $course • $department (Sem $sem)'
                : '$type • $course (Sem $sem)',
            style: const TextStyle(color: AppTheme.textSecondary, fontSize: 13, fontWeight: FontWeight.w500),
          ),
          const SizedBox(height: 24),
          const Divider(height: 1, color: AppTheme.outlineColor),
          const SizedBox(height: 24),
          Row(
            children: [
              _buildDetailItem(Icons.star_outline_rounded, 'Maximum Marks', '$marks Marks'),
              const Spacer(),
              _buildDetailItem(Icons.auto_stories_outlined, 'Expected', 'Single Scanned Page'),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildDetailItem(IconData icon, String label, String value) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Icon(icon, size: 14, color: AppTheme.textSecondary),
            const SizedBox(width: 6),
            Text(
              label.toUpperCase(),
              style: const TextStyle(
                fontSize: 10,
                fontWeight: FontWeight.w700,
                color: AppTheme.textSecondary,
                letterSpacing: 0.5,
              ),
            ),
          ],
        ),
        const SizedBox(height: 4),
        Text(
          value,
          style: const TextStyle(
            fontSize: 15,
            fontWeight: FontWeight.w600,
            color: AppTheme.textPrimary,
          ),
        ),
      ],
    );
  }

  Widget _buildTimerCard(String endFormatted) {
    final isTimeUp = _secondsRemaining <= 0;
    
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: AppTheme.surfaceColor,
        borderRadius: BorderRadius.circular(AppTheme.borderRadiusLarge),
        boxShadow: AppTheme.premiumShadow,
        border: Border.all(color: isTimeUp ? AppTheme.errorColor.withValues(alpha: 0.15) : AppTheme.primaryColor.withValues(alpha: 0.1)),
      ),
      child: Column(
        children: [
          Text(
            isTimeUp ? 'EXAMINATION ENDED' : 'TIME REMAINING TO SUBMIT',
            style: TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w800,
              color: isTimeUp ? AppTheme.errorColor : AppTheme.textSecondary,
              letterSpacing: 1,
            ),
          ),
          const SizedBox(height: 16),
          AnimatedBuilder(
            animation: _pulseController,
            builder: (context, child) {
              return Container(
                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
                decoration: BoxDecoration(
                  color: (isTimeUp ? AppTheme.errorColor : AppTheme.primaryColor).withValues(alpha: 0.05),
                  borderRadius: BorderRadius.circular(100),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(
                      Icons.timer_outlined,
                      color: isTimeUp ? AppTheme.errorColor : AppTheme.primaryColor,
                      size: 24,
                    ),
                    const SizedBox(width: 10),
                    Text(
                      _formatTime(_secondsRemaining),
                      style: TextStyle(
                        fontSize: 28,
                        fontWeight: FontWeight.w800,
                        color: isTimeUp ? AppTheme.errorColor : AppTheme.textPrimary,
                        letterSpacing: -0.5,
                        fontFeatures: const [FontFeature.tabularFigures()],
                      ),
                    ),
                  ],
                ),
              );
            },
          ),
          const SizedBox(height: 16),
          Text(
            'The portal will accept answer uploads until:\n$endFormatted.',
            textAlign: TextAlign.center,
            style: const TextStyle(
              color: AppTheme.textSecondary,
              fontSize: 12,
              height: 1.5,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildRequirementSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Requirements',
          style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
        ),
        const SizedBox(height: 12),
        _buildRequirementItem(Icons.camera_alt_outlined, 'Live camera capture of handwritten answer scripts'),
        _buildRequirementItem(Icons.cloud_upload_outlined, '15-minute dedicated secure upload session'),
        _buildRequirementItem(Icons.verified_user_outlined, 'Verified academic integrity check'),
      ],
    );
  }

  Widget _buildRequirementItem(IconData icon, String text) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: AppTheme.primaryColor.withValues(alpha: 0.05),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Icon(icon, size: 16, color: AppTheme.primaryColor),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              text,
              style: const TextStyle(
                fontSize: 13,
                color: AppTheme.textSecondary,
                fontWeight: FontWeight.w500,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class QrScanDialog extends StatefulWidget {
  final String examToken;
  final Function(String) onVerified;

  const QrScanDialog({
    super.key,
    required this.examToken,
    required this.onVerified,
  });

  @override
  State<QrScanDialog> createState() => _QrScanDialogState();
}

class _QrScanDialogState extends State<QrScanDialog> {
  late MobileScannerController _scannerController;
  String? _scanError;

  @override
  void initState() {
    super.initState();
    _scannerController = MobileScannerController(
      detectionSpeed: DetectionSpeed.noDuplicates,
      facing: CameraFacing.back,
    );
  }

  @override
  void dispose() {
    _scannerController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      backgroundColor: AppTheme.surfaceColor,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(AppTheme.borderRadiusLarge),
        side: const BorderSide(color: AppTheme.outlineColor),
      ),
      title: const Row(
        children: [
          Icon(Icons.qr_code_scanner_rounded, color: AppTheme.primaryColor, size: 24),
          SizedBox(width: 12),
          Text(
            'Two-Step QR Verify',
            style: TextStyle(color: AppTheme.textPrimary, fontWeight: FontWeight.bold, fontSize: 18),
          ),
        ],
      ),
      content: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text(
              'To finalize and lock your exam script, point your camera at the Exam QR Code projected in the exam hall.',
              style: TextStyle(color: AppTheme.textSecondary, fontSize: 13, height: 1.4),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 20),
            Container(
              height: 220,
              width: 220,
              decoration: BoxDecoration(
                color: Colors.black.withValues(alpha: 0.08),
                borderRadius: BorderRadius.circular(AppTheme.borderRadiusMedium),
                border: Border.all(color: AppTheme.primaryColor.withValues(alpha: 0.3)),
              ),
              clipBehavior: Clip.antiAlias,
              child: Stack(
                children: [
                  MobileScanner(
                    controller: _scannerController,
                    onDetect: (capture) {
                      final List<Barcode> barcodes = capture.barcodes;
                      for (final barcode in barcodes) {
                        final rawValue = barcode.rawValue;
                        if (rawValue != null) {
                          if (rawValue.trim() == widget.examToken.trim()) {
                            Navigator.pop(context); // Close dialog
                            widget.onVerified(widget.examToken);
                            return;
                          } else {
                            setState(() {
                              _scanError = 'Mismatched QR code. Please scan the correct Exam QR.';
                            });
                          }
                        }
                      }
                    },
                  ),
                  // Viewfinder Reticle Overlay
                  Center(
                    child: Container(
                      width: 160,
                      height: 160,
                      decoration: BoxDecoration(
                        border: Border.all(color: AppTheme.primaryColor, width: 2),
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                  ),
                ],
              ),
            ),
            if (_scanError != null) ...[
              const SizedBox(height: 16),
              Text(
                _scanError!,
                style: const TextStyle(color: AppTheme.errorColor, fontSize: 12, fontWeight: FontWeight.bold),
                textAlign: TextAlign.center,
              ),
            ],
          ],
        ),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context),
          child: const Text('Cancel', style: TextStyle(color: AppTheme.textSecondary, fontWeight: FontWeight.bold)),
        ),
      ],
    );
  }
}
