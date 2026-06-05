import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../../../core/theme/app_theme.dart';
import '../providers/exam_provider.dart';
import '../providers/student_results_provider.dart';
import '../repositories/exam_repository_impl.dart';
import '../../auth/providers/auth_provider.dart';
import '../../../core/widgets/app_logo.dart';
import '../../../core/widgets/app_loading_indicator.dart';
import '../../../shared/widgets/response_dialog.dart';
import '../../../core/models/exam_model.dart';
import '../../../core/models/exam_state.dart';
import '../../../core/models/exam_result_model.dart';
import 'package:mobile_scanner/mobile_scanner.dart';

class ExamsListScreen extends ConsumerStatefulWidget {
  const ExamsListScreen({super.key});

  @override
  ConsumerState<ExamsListScreen> createState() => _ExamsListScreenState();
}

class _ExamsListScreenState extends ConsumerState<ExamsListScreen> with WidgetsBindingObserver {
  final TextEditingController _tokenController = TextEditingController();
  String _selectedTab = '';

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _tokenController.dispose();
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      ref.invalidate(studentTimetableAndExamsProvider);
    }
  }

  void _unlockExamWithToken(String token) async {
    if (token.isEmpty) {
      ResponseDialog.show(
        context,
        title: 'Token Required',
        message: 'Please enter a valid exam token to unlock your examination.',
        type: ResponseDialogType.warning,
      );
      return;
    }

    try {
      final examRepo = ref.read(examRepositoryProvider);
      final data = await examRepo.getExamByToken(token);
      ref.read(activeExamProvider.notifier).state = ExamState(exam: data);
      _tokenController.clear();
      if (mounted) {
        context.push('/exams/detail');
      }
    } catch (exception) {
      if (mounted) {
        ResponseDialog.show(
          context,
          title: 'Unlock Failed',
          message: exception.toString().replaceAll('Exception: ', '').replaceAll('ApiException: ', ''),
          type: ResponseDialogType.error,
        );
      }
    }
  }

  void _scanExamQr() async {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (dialogContext) {
        return TokenQrScanDialog(
          onScanned: (scannedToken) {
            if (mounted) {
              _unlockExamWithToken(scannedToken.trim());
            }
          },
        );
      },
    );
  }

  void _showUnlockDialog(BuildContext context, ExamModel exam) {
    _tokenController.clear();
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
          title: Row(
            children: [
              const Icon(Icons.lock_open_rounded, color: AppTheme.primaryColor, size: 22),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  'Unlock ${exam.subjectCode}',
                  style: const TextStyle(color: AppTheme.textPrimary, fontWeight: FontWeight.bold, fontSize: 16),
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
                Text(
                  'Unlock answer sheet upload session for ${exam.subjectName}. Enter the department token or scan the projected exam QR code.',
                  style: const TextStyle(color: AppTheme.textSecondary, fontSize: 13, height: 1.4),
                ),
                const SizedBox(height: 20),
                TextField(
                  controller: _tokenController,
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
                    _scanExamQr();
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
                final token = _tokenController.text.trim();
                Navigator.pop(dialogContext);
                _unlockExamWithToken(token);
              },
              style: ElevatedButton.styleFrom(
                minimumSize: const Size(90, 38),
              ),
              child: const Text('Unlock'),
            ),
          ],
        );
      },
    );
  }

  int _getSelectedIndex() {
    switch (_selectedTab) {
      case 'live':
        return 0;
      case 'upcoming':
        return 1;
      case 'history':
      default:
        return 2;
    }
  }

  void _setSelectedTabByIndex(int index) {
    setState(() {
      if (index == 0) _selectedTab = 'live';
      if (index == 1) _selectedTab = 'upcoming';
      if (index == 2) _selectedTab = 'history';
    });
  }

  Widget _buildSegmentedControl() {
    final tabs = ['Live', 'Upcoming', 'History'];
    final selectedIndex = _getSelectedIndex();

    return Container(
      height: 46,
      padding: const EdgeInsets.all(4),
      decoration: BoxDecoration(
        color: AppTheme.outlineVariant.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(12),
      ),
      child: LayoutBuilder(
        builder: (context, constraints) {
          final tabWidth = constraints.maxWidth / 3;
          return Stack(
            children: [
              // Sliding active pill
              AnimatedPositioned(
                duration: const Duration(milliseconds: 220),
                curve: Curves.easeInOutCubic,
                left: selectedIndex * tabWidth,
                width: tabWidth,
                height: 38,
                child: Container(
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(10),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.05),
                        blurRadius: 4,
                        offset: const Offset(0, 2),
                      ),
                    ],
                  ),
                ),
              ),
              // Tab labels
              Row(
                children: List.generate(tabs.length, (index) {
                  final isSelected = selectedIndex == index;
                  return Expanded(
                    child: GestureDetector(
                      behavior: HitTestBehavior.opaque,
                      onTap: () => _setSelectedTabByIndex(index),
                      child: Center(
                        child: Text(
                          tabs[index],
                          style: TextStyle(
                            fontSize: 13,
                            fontWeight: isSelected ? FontWeight.bold : FontWeight.w600,
                            color: isSelected 
                                ? AppTheme.primaryColor 
                                : AppTheme.textSecondary,
                          ),
                        ),
                      ),
                    ),
                  );
                }),
              ),
            ],
          );
        },
      ),
    );
  }

  Widget _buildLiveExamCard(BuildContext context, ExamModel exam) {
    final dateStr = exam.date != null 
        ? DateFormat('EEE, MMM d, yyyy').format(exam.date!.toLocal())
        : 'N/A';
    final subjectName = exam.subjectName;
    final subjectCode = exam.subjectCode;
    final examType = exam.examType;
    final maxMarks = exam.maxMarks;
    
    final startTime = exam.startTime;
    final endTime = exam.endTime;
    String timingsStr = 'N/A';
    if (startTime != null && endTime != null) {
      try {
        final startFormatted = DateFormat('hh:mm a').format(startTime.toLocal());
        final endFormatted = DateFormat('hh:mm a').format(endTime.toLocal());
        timingsStr = '$startFormatted - $endFormatted';
      } catch (_) {}
    }

    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: AppTheme.surfaceColor,
        borderRadius: BorderRadius.circular(AppTheme.borderRadius2XL),
        boxShadow: AppTheme.premiumShadow,
        border: Border.all(
          color: AppTheme.errorColor.withValues(alpha: 0.6),
          width: 2.0,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: AppTheme.errorColor.withValues(alpha: 0.08),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: const Text(
                  'LIVE NOW',
                  style: TextStyle(
                    color: AppTheme.errorColor,
                    fontSize: 9,
                    fontWeight: FontWeight.w900,
                    letterSpacing: 0.5,
                  ),
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
            '$examType • Max Marks: ${maxMarks.toStringAsFixed(0)}',
            style: const TextStyle(
              color: AppTheme.textSecondary,
              fontSize: 12,
            ),
          ),
          const SizedBox(height: 14),
          const Divider(color: AppTheme.outlineColor, height: 1),
          const SizedBox(height: 14),
          Row(
            children: [
              const Icon(Icons.date_range_rounded, size: 14, color: AppTheme.textSecondary),
              const SizedBox(width: 6),
              Text(
                dateStr,
                style: const TextStyle(fontSize: 12, color: AppTheme.textSecondary, fontWeight: FontWeight.w500),
              ),
              const SizedBox(width: 20),
              const Icon(Icons.access_time_rounded, size: 14, color: AppTheme.textSecondary),
              const SizedBox(width: 6),
              Text(
                timingsStr,
                style: const TextStyle(fontSize: 12, color: AppTheme.textSecondary, fontWeight: FontWeight.w500),
              ),
            ],
          ),
          const SizedBox(height: 16),
          ElevatedButton.icon(
            onPressed: () {
              _showUnlockDialog(context, exam);
            },
            icon: const Icon(Icons.lock_open_rounded, size: 16),
            label: const Text('Unlock script upload'),
            style: ElevatedButton.styleFrom(
              minimumSize: const Size(double.infinity, 44),
              backgroundColor: AppTheme.successColor,
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(AppTheme.borderRadiusMedium),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildUpcomingExamCard(BuildContext context, ExamModel exam) {
    final dateStr = exam.date != null 
        ? DateFormat('EEE, MMM d, yyyy').format(exam.date!.toLocal())
        : 'N/A';
    final subjectName = exam.subjectName;
    final subjectCode = exam.subjectCode;
    final examType = exam.examType;
    final maxMarks = exam.maxMarks;
    final facultyName = exam.facultyName;
    
    final startTime = exam.startTime;
    final endTime = exam.endTime;
    String timingsStr = 'N/A';
    if (startTime != null && endTime != null) {
      try {
        final startFormatted = DateFormat('hh:mm a').format(startTime.toLocal());
        final endFormatted = DateFormat('hh:mm a').format(endTime.toLocal());
        timingsStr = '$startFormatted - $endFormatted';
      } catch (_) {}
    }

    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: AppTheme.surfaceColor,
        borderRadius: BorderRadius.circular(AppTheme.borderRadius2XL),
        boxShadow: AppTheme.softShadow,
        border: Border.all(
          color: AppTheme.outlineColor.withValues(alpha: 0.15),
          width: 1,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: AppTheme.primaryColor.withValues(alpha: 0.08),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: const Text(
                  'UPCOMING',
                  style: TextStyle(
                    color: AppTheme.primaryColor,
                    fontSize: 9,
                    fontWeight: FontWeight.w900,
                    letterSpacing: 0.5,
                  ),
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
            '$examType • Max Marks: ${maxMarks.toStringAsFixed(0)}',
            style: const TextStyle(
              color: AppTheme.textSecondary,
              fontSize: 12,
            ),
          ),
          const SizedBox(height: 14),
          const Divider(color: AppTheme.outlineColor, height: 1),
          const SizedBox(height: 14),
          Row(
            children: [
              const Icon(Icons.date_range_rounded, size: 14, color: AppTheme.textSecondary),
              const SizedBox(width: 6),
              Text(
                dateStr,
                style: const TextStyle(fontSize: 12, color: AppTheme.textSecondary, fontWeight: FontWeight.w500),
              ),
              const SizedBox(width: 20),
              const Icon(Icons.person_outline_rounded, size: 14, color: AppTheme.textSecondary),
              const SizedBox(width: 6),
              Expanded(
                child: Text(
                  facultyName,
                  style: const TextStyle(fontSize: 12, color: AppTheme.textSecondary, fontWeight: FontWeight.w500),
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              const Icon(Icons.access_time_rounded, size: 14, color: AppTheme.textSecondary),
              const SizedBox(width: 6),
              Text(
                timingsStr,
                style: const TextStyle(fontSize: 12, color: AppTheme.textSecondary, fontWeight: FontWeight.w500),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildHistoryExamCard(BuildContext context, ExamModel exam, List<ExamResultModel> results) {
    final dateStr = exam.date != null 
        ? DateFormat('MMM d, yyyy').format(exam.date!.toLocal())
        : 'N/A';
    final subjectName = exam.subjectName;
    final subjectCode = exam.subjectCode;
    final examType = exam.examType;
    final hasSubmitted = exam.hasSubmitted;
    
    // Look up result
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
                    : null, // If missed, it's not clickable
            child: Padding(
              padding: const EdgeInsets.all(18),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      // Status Badge
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
                  
                  // Score section (if submitted)
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
                              Icon(Icons.hourglass_empty_rounded, size: 14, color: Colors.amber[800]),
                              const SizedBox(width: 6),
                              Text(
                                'Pending Evaluation',
                                style: TextStyle(
                                  fontSize: 12,
                                  color: Colors.amber[800],
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

  @override
  Widget build(BuildContext context) {
    final examsAsync = ref.watch(studentTimetableAndExamsProvider);
    final resultsAsync = ref.watch(studentResultsProvider);
    final authState = ref.watch(authProvider);

    return PopScope(
      canPop: Navigator.of(context).canPop(),
      onPopInvokedWithResult: (didPop, result) async {
        if (didPop) return;
        if (context.mounted) {
          try {
            StatefulNavigationShell.of(context).goBranch(0);
          } catch (e) {
            debugPrint('Error navigating to Dashboard branch: $e');
          }
        }
      },
      child: Scaffold(
        backgroundColor: AppTheme.backgroundColor,
        appBar: _buildAppBar(context),
        body: SafeArea(
          child: Center(
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 600),
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const SizedBox(height: 20),
                    _buildHeader(context, authState.isOffline),
                    const SizedBox(height: 24),
                    Expanded(
                      child: RefreshIndicator(
                        onRefresh: () async {
                          try {
                            await ref.read(authProvider.notifier).verifyToken();
                          } catch (_) {}
                          ref.invalidate(studentTimetableAndExamsProvider);
                          ref.invalidate(studentResultsProvider);
                          try {
                            await ref.read(studentTimetableAndExamsProvider.future);
                            await ref.read(studentResultsProvider.future);
                          } catch (_) {}
                        },
                        child: examsAsync.when(
                          data: (exams) {
                            if (exams.isEmpty) {
                              return SingleChildScrollView(
                                physics: const AlwaysScrollableScrollPhysics(
                                  parent: BouncingScrollPhysics(),
                                ),
                                child: SizedBox(
                                  height: 400,
                                  child: Center(
                                    child: _buildNoExamsPlaceholder(),
                                  ),
                                ),
                              );
                            }
                            
                            // Calculate status categories on the fly
                            final now = DateTime.now();
                            final results = resultsAsync.value ?? [];
                            
                            String getExamStatus(ExamModel exam) {
                              final startTime = exam.startTime;
                              final endTime = exam.endTime;

                              if (startTime != null && now.isBefore(startTime)) {
                                return 'upcoming';
                              } else if (startTime != null && endTime != null && now.isAfter(startTime) && now.isBefore(endTime)) {
                                return 'live';
                              } else if (endTime != null && now.isAfter(endTime)) {
                                return exam.hasSubmitted ? 'completed' : 'missed';
                              } else if (exam.date != null) {
                                if (exam.date!.isAfter(now)) {
                                  return 'upcoming';
                                } else {
                                  return exam.hasSubmitted ? 'completed' : 'missed';
                                }
                              }
                              return 'upcoming';
                            }

                            final liveExams = exams.where((e) => getExamStatus(e) == 'live').toList();
                            final upcomingExams = exams.where((e) => getExamStatus(e) == 'upcoming').toList();
                            final historyExams = exams.where((e) => getExamStatus(e) == 'completed' || getExamStatus(e) == 'missed').toList();

                            // Set default tab key on first load or backward compatibility
                            if (_selectedTab.isEmpty || _selectedTab == 'completed' || _selectedTab == 'missed') {
                              if (liveExams.isNotEmpty) {
                                _selectedTab = 'live';
                              } else if (upcomingExams.isNotEmpty) {
                                _selectedTab = 'upcoming';
                              } else {
                                _selectedTab = 'history';
                              }
                            }

                            List<ExamModel> activeList = [];
                            
                            if (_selectedTab == 'live') {
                              activeList = liveExams;
                            } else if (_selectedTab == 'upcoming') {
                              activeList = upcomingExams;
                            } else if (_selectedTab == 'history') {
                              activeList = historyExams;
                            }

                            // Sort active list: upcoming sorted by date ascending; others sorted by date descending (most recent first)
                            if (_selectedTab == 'upcoming') {
                              activeList.sort((a, b) => (a.startTime ?? a.date ?? DateTime.now()).compareTo(b.startTime ?? b.date ?? DateTime.now()));
                            } else {
                              activeList.sort((a, b) => (b.startTime ?? b.date ?? DateTime.now()).compareTo(a.startTime ?? a.date ?? DateTime.now()));
                            }
  
                            return ListView(
                              physics: const AlwaysScrollableScrollPhysics(
                                parent: BouncingScrollPhysics(),
                              ),
                              children: [
                                _buildSegmentedControl(),
                                const SizedBox(height: 24),
                                
                                Row(
                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                  crossAxisAlignment: CrossAxisAlignment.end,
                                  children: [
                                    Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          _selectedTab == 'live' 
                                              ? 'Live Exams' 
                                              : (_selectedTab == 'upcoming' ? 'Upcoming Exams' : 'History'),
                                          style: const TextStyle(
                                            fontSize: 20,
                                            fontWeight: FontWeight.w900,
                                            color: AppTheme.textPrimary,
                                            letterSpacing: -0.5,
                                          ),
                                        ),
                                        const SizedBox(height: 2),
                                        Text(
                                          '${activeList.length} ${activeList.length == 1 ? 'Exam' : 'Exams'}',
                                          style: const TextStyle(
                                            fontSize: 13,
                                            fontWeight: FontWeight.w600,
                                            color: AppTheme.textSecondary,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 16),
  
                                if (activeList.isEmpty)
                                  Center(
                                    child: Padding(
                                      padding: const EdgeInsets.symmetric(vertical: 48.0),
                                      child: Column(
                                        mainAxisAlignment: MainAxisAlignment.center,
                                        children: [
                                          Icon(
                                            _selectedTab == 'live' 
                                                ? Icons.notifications_none_rounded 
                                                : (_selectedTab == 'history' 
                                                    ? Icons.assignment_turned_in_outlined 
                                                    : Icons.event_available_rounded),
                                            size: 40,
                                            color: AppTheme.textSecondary.withValues(alpha: 0.5),
                                          ),
                                          const SizedBox(height: 12),
                                          Text(
                                            'No exams in this category.',
                                            style: TextStyle(
                                              color: AppTheme.textSecondary.withValues(alpha: 0.8),
                                              fontSize: 13,
                                              fontWeight: FontWeight.w500,
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                  )
                                else
                                  ListView.separated(
                                    shrinkWrap: true,
                                    physics: const NeverScrollableScrollPhysics(),
                                    itemCount: activeList.length,
                                    separatorBuilder: (context, index) => const SizedBox(height: 14),
                                    itemBuilder: (context, index) {
                                      final exam = activeList[index];
                                      if (_selectedTab == 'live') {
                                        return _buildLiveExamCard(context, exam);
                                      } else if (_selectedTab == 'upcoming') {
                                        return _buildUpcomingExamCard(context, exam);
                                      } else {
                                        return _buildHistoryExamCard(context, exam, results);
                                      }
                                    },
                                  ),
                                const SizedBox(height: 120),
                              ],
                            );
                          },
                          loading: () => const SingleChildScrollView(
                            physics: AlwaysScrollableScrollPhysics(parent: BouncingScrollPhysics()),
                            child: SizedBox(
                              height: 300,
                              child: Center(
                                child: Padding(
                                  padding: EdgeInsets.all(32.0),
                                  child: AppLoadingIndicator(size: 50, logoSize: 24),
                                ),
                              ),
                            ),
                          ),
                           error: (err, stack) => SingleChildScrollView(
                            physics: const AlwaysScrollableScrollPhysics(parent: BouncingScrollPhysics()),
                            child: Center(
                              child: Padding(
                                padding: const EdgeInsets.symmetric(vertical: 64.0, horizontal: 24.0),
                                child: Container(
                                  padding: const EdgeInsets.all(24),
                                  decoration: BoxDecoration(
                                    color: AppTheme.surfaceColor,
                                    borderRadius: BorderRadius.circular(AppTheme.borderRadius2XL),
                                    border: Border.all(color: AppTheme.errorColor.withValues(alpha: 0.15)),
                                  ),
                                  child: Column(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      const Icon(Icons.error_outline_rounded, color: AppTheme.errorColor, size: 48),
                                      const SizedBox(height: 16),
                                      const Text(
                                        'Sync Failure',
                                        style: TextStyle(fontWeight: FontWeight.w800, fontSize: 16, color: AppTheme.textPrimary),
                                      ),
                                      const SizedBox(height: 8),
                                      Text(
                                        err.toString().contains('Offline') 
                                          ? 'No internet connection or AES server is offline.' 
                                          : 'An unexpected error occurred while syncing your timetable.',
                                        textAlign: TextAlign.center,
                                        style: const TextStyle(fontSize: 12, color: AppTheme.textSecondary),
                                      ),
                                      const SizedBox(height: 20),
                                      ElevatedButton.icon(
                                        onPressed: () => ref.invalidate(studentTimetableAndExamsProvider),
                                        icon: const Icon(Icons.refresh_rounded, size: 18),
                                        label: const Text('Try Again'),
                                        style: ElevatedButton.styleFrom(
                                          minimumSize: const Size(180, 44),
                                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppTheme.borderRadiusLarge)),
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                            ),
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }



  PreferredSizeWidget _buildAppBar(BuildContext context) {
    return AppBar(
      backgroundColor: AppTheme.backgroundColor,
      elevation: 0,
      centerTitle: true,
      leading: const Padding(
        padding: EdgeInsets.all(12.0),
        child: AppLogo(size: 24),
      ),
      title: const Text(
        'My Exams',
        style: TextStyle(
          fontWeight: FontWeight.w800,
          color: AppTheme.textPrimary,
          fontSize: 18,
        ),
      ),
    );
  }

  Widget _buildHeader(BuildContext context, bool isOffline) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Academic Schedule',
          style: Theme.of(context).textTheme.headlineMedium?.copyWith(fontWeight: FontWeight.w900),
        ),
        const SizedBox(height: 4),
        Text(
          isOffline 
              ? 'Offline — Viewing Cached Schedule' 
              : 'Verify tokens and submit your answer scripts securely.',
          style: Theme.of(context).textTheme.bodyMedium?.copyWith(
            color: isOffline ? Colors.orange.shade800 : AppTheme.textSecondary,
            fontWeight: isOffline ? FontWeight.w600 : FontWeight.normal,
          ),
        ),
      ],
    );
  }

  Widget _buildNoExamsPlaceholder() {
    return Container(
      padding: const EdgeInsets.all(28),
      decoration: BoxDecoration(
        color: AppTheme.surfaceColor,
        borderRadius: BorderRadius.circular(AppTheme.borderRadius2XL),
        boxShadow: AppTheme.softShadow,
        border: Border.all(color: AppTheme.outlineColor.withValues(alpha: 0.15)),
      ),
      child: Column(
        children: [
          Icon(
            Icons.vpn_key_outlined,
            size: 48,
            color: AppTheme.primaryColor.withValues(alpha: 0.6),
          ),
          const SizedBox(height: 16),
          const Text(
            'No Exams Assigned Yet',
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.bold,
              color: AppTheme.textPrimary,
            ),
          ),
          const SizedBox(height: 8),
          const Text(
            'You are not currently registered for any upcoming examinations. Contact your department or HOD if you believe this is an error.',
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: 13,
              color: AppTheme.textSecondary,
              height: 1.5,
            ),
          ),
        ],
      ),
    );
  }
}

class TokenQrScanDialog extends StatefulWidget {
  final Function(String) onScanned;

  const TokenQrScanDialog({
    super.key,
    required this.onScanned,
  });

  @override
  State<TokenQrScanDialog> createState() => _TokenQrScanDialogState();
}

class _TokenQrScanDialogState extends State<TokenQrScanDialog> {
  late MobileScannerController _scannerController;

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
            'Scan Department QR',
            style: TextStyle(color: AppTheme.textPrimary, fontWeight: FontWeight.bold, fontSize: 18),
          ),
        ],
      ),
      content: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text(
              'Point your camera at the Exam QR Code provided by your department or supervisor to automatically fill and unlock the exam.',
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
                        if (rawValue != null && rawValue.trim().isNotEmpty) {
                          Navigator.pop(context); // Close dialog
                          widget.onScanned(rawValue.trim());
                          return;
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
