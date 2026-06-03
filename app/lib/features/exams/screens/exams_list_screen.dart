import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../../../core/theme/app_theme.dart';
import '../providers/exam_provider.dart';
import '../providers/student_results_provider.dart';
import '../repositories/exam_repository_impl.dart';
import '../../../core/widgets/app_logo.dart';
import '../../../core/widgets/app_loading_indicator.dart';
import '../../../shared/widgets/response_dialog.dart';
import '../../../core/models/exam_model.dart';
import '../../../core/models/exam_state.dart';
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
          content: Column(
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

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: false,
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
                    _buildHeader(context),
                    const SizedBox(height: 24),
                    Expanded(
                      child: RefreshIndicator(
                        onRefresh: () async {
                          ref.invalidate(studentTimetableAndExamsProvider);
                          try {
                            await ref.read(studentTimetableAndExamsProvider.future);
                          } catch (_) {}
                        },
                        child: ref.watch(studentTimetableAndExamsProvider).when(
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
                            final completedExams = exams.where((e) => getExamStatus(e) == 'completed').toList();
                            final missedExams = exams.where((e) => getExamStatus(e) == 'missed').toList();

                            // Set default tab key on first load
                            if (_selectedTab.isEmpty) {
                              if (liveExams.isNotEmpty) {
                                _selectedTab = 'live';
                              } else if (upcomingExams.isNotEmpty) {
                                _selectedTab = 'upcoming';
                              } else if (completedExams.isNotEmpty) {
                                _selectedTab = 'completed';
                              } else {
                                _selectedTab = 'upcoming';
                              }
                            }

                            List<ExamModel> activeList = [];
                            Color tabThemeColor = AppTheme.primaryColor;
                            String sectionHeader = 'UPCOMING EXAMS';
                            
                            if (_selectedTab == 'live') {
                              activeList = liveExams;
                              tabThemeColor = AppTheme.errorColor;
                              sectionHeader = 'LIVE EXAMS NOW';
                            } else if (_selectedTab == 'upcoming') {
                              activeList = upcomingExams;
                              tabThemeColor = AppTheme.primaryColor;
                              sectionHeader = 'UPCOMING EXAMS';
                            } else if (_selectedTab == 'completed') {
                              activeList = completedExams;
                              tabThemeColor = AppTheme.successColor;
                              sectionHeader = 'COMPLETED EXAMS';
                            } else if (_selectedTab == 'missed') {
                              activeList = missedExams;
                              tabThemeColor = Colors.orange;
                              sectionHeader = 'MISSED EXAMS';
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
                                // Gmail-style tabs row
                                SizedBox(
                                  height: 40,
                                  child: ListView(
                                    scrollDirection: Axis.horizontal,
                                    physics: const BouncingScrollPhysics(),
                                    children: [
                                      _buildTabButton('Live Now', 'live', liveExams.length, AppTheme.errorColor),
                                      const SizedBox(width: 8),
                                      _buildTabButton('Upcoming', 'upcoming', upcomingExams.length, AppTheme.primaryColor),
                                      const SizedBox(width: 8),
                                      _buildTabButton('Completed', 'completed', completedExams.length, AppTheme.successColor),
                                      const SizedBox(width: 8),
                                      _buildTabButton('Missed', 'missed', missedExams.length, Colors.orange),
                                    ],
                                  ),
                                ),
                                const SizedBox(height: 28),
                                
                                _buildSectionDivider(sectionHeader),
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
                                                : (_selectedTab == 'completed' 
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
                                      
                                      final isLive = getExamStatus(exam) == 'live';
  
                                      String timingsStr = 'N/A';
                                      if (startTime != null && endTime != null) {
                                        try {
                                          final startFormatted = DateFormat('hh:mm a').format(startTime.toLocal());
                                          final endFormatted = DateFormat('hh:mm a').format(endTime.toLocal());
                                          timingsStr = '$startFormatted - $endFormatted';
                                        } catch (_) {}
                                      }
                                      
                                      String statusLabel = 'UPCOMING';
                                      if (_selectedTab == 'live') statusLabel = 'LIVE NOW';
                                      if (_selectedTab == 'completed') statusLabel = 'COMPLETED';
                                      if (_selectedTab == 'missed') statusLabel = 'MISSED';
                                      
                                      return Container(
                                        padding: const EdgeInsets.all(18),
                                        decoration: BoxDecoration(
                                          color: AppTheme.surfaceColor,
                                          borderRadius: BorderRadius.circular(AppTheme.borderRadius2XL),
                                          boxShadow: AppTheme.premiumShadow,
                                          border: Border.all(
                                            color: isLive 
                                                ? AppTheme.successColor.withValues(alpha: 0.6) 
                                                : AppTheme.outlineColor.withValues(alpha: 0.15),
                                            width: isLive ? 2.0 : 1,
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
                                                    color: tabThemeColor.withValues(alpha: 0.08),
                                                    borderRadius: BorderRadius.circular(6),
                                                  ),
                                                  child: Text(
                                                    statusLabel,
                                                    style: TextStyle(
                                                      color: tabThemeColor,
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
                                            if (isLive) ...[
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
                                          ],
                                        ),
                                      );
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
                            child: SizedBox(
                              height: 300,
                              child: Center(
                                child: Padding(
                                  padding: const EdgeInsets.all(24.0),
                                  child: Text(
                                    'Error loading timetable: $err',
                                    style: const TextStyle(color: Colors.red),
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

  Widget _buildTabButton(String label, String tabKey, int count, Color activeColor) {
    final isSelected = _selectedTab == tabKey;
    final cardColor = isSelected ? activeColor : AppTheme.surfaceColor;
    final textColor = isSelected ? Colors.white : AppTheme.textPrimary;
    final dotColor = isSelected ? Colors.white : activeColor;
    return GestureDetector(
      onTap: () => setState(() => _selectedTab = tabKey),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        decoration: BoxDecoration(
          color: cardColor,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: isSelected 
                ? Colors.transparent 
                : AppTheme.outlineColor.withValues(alpha: 0.15),
          ),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 8,
              height: 8,
              decoration: BoxDecoration(
                color: dotColor,
                shape: BoxShape.circle,
              ),
            ),
            const SizedBox(width: 8),
            Text(
              label,
              style: TextStyle(
                fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                color: textColor,
                fontSize: 13,
              ),
            ),
            const SizedBox(width: 8),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
              decoration: BoxDecoration(
                color: isSelected 
                    ? Colors.white.withValues(alpha: 0.2) 
                    : AppTheme.outlineColor.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Text(
                '$count',
                style: TextStyle(
                  fontSize: 10,
                  fontWeight: FontWeight.bold,
                  color: isSelected ? Colors.white : AppTheme.textSecondary,
                ),
              ),
            ),
          ],
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

  Widget _buildHeader(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Academic Schedule',
          style: Theme.of(context).textTheme.headlineMedium?.copyWith(fontWeight: FontWeight.w900),
        ),
        const SizedBox(height: 4),
        Text(
          'Verify tokens and submit your answer scripts securely.',
          style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: AppTheme.textSecondary),
        ),
      ],
    );
  }

  Widget _buildSectionDivider(String label) {
    return Row(
      children: [
        Text(
          label,
          style: const TextStyle(
            fontSize: 11,
            fontWeight: FontWeight.w800,
            color: AppTheme.textSecondary,
            letterSpacing: 1,
          ),
        ),
        const SizedBox(width: 16),
        const Expanded(child: Divider(color: AppTheme.outlineColor, height: 1)),
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
      content: Column(
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
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context),
          child: const Text('Cancel', style: TextStyle(color: AppTheme.textSecondary, fontWeight: FontWeight.bold)),
        ),
      ],
    );
  }
}
