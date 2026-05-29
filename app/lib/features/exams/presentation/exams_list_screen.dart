import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/repositories/exam_repository.dart';
import '../providers/exam_provider.dart';

import 'package:mobile_scanner/mobile_scanner.dart';
import '../../../shared/widgets/response_dialog.dart';
import '../providers/student_results_provider.dart';

class ExamsListScreen extends ConsumerStatefulWidget {
  const ExamsListScreen({super.key});

  @override
  ConsumerState<ExamsListScreen> createState() => _ExamsListScreenState();
}

class _ExamsListScreenState extends ConsumerState<ExamsListScreen> {
  final _tokenController = TextEditingController();
  DateTime? _selectedDate;

  @override
  void dispose() {
    _tokenController.dispose();
    super.dispose();
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
      final examData = await examRepo.getExamByToken(token);
      
      ref.read(activeExamProvider.notifier).state = examData;
      _tokenController.clear();
      if (mounted) {
        context.push('/exams/detail');
      }
    } catch (e) {
      if (mounted) {
        ResponseDialog.show(
          context,
          title: 'Unlock Failed',
          message: e.toString(),
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

  void _showUnlockDialog(BuildContext context, Map<String, dynamic> exam) {
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
                  'Unlock ${exam['subjectCode']}',
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
                'Unlock answer sheet upload session for ${exam['subjectName']}. Enter the department token or scan the projected exam QR code.',
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
    return Scaffold(
      backgroundColor: AppTheme.backgroundColor,
      body: SafeArea(
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 600),
            child: CustomScrollView(
              slivers: [
                _buildAppBar(context),
                SliverPadding(
                  padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 20),
                  sliver: SliverList(
                    delegate: SliverChildListDelegate([
                      _buildHeader(context),
                      const SizedBox(height: 24),
                      
                      ref.watch(studentTimetableAndExamsProvider).when(
                        data: (data) {
                          final List<dynamic> exams = data['exams'] ?? [];
                          if (exams.isEmpty) {
                            return _buildNoExamsPlaceholder();
                          }
                          
                          // Collect all unique exam dates for the horizontal timeline strip
                          final sortedDates = exams.map((exam) {
                            final parsedDate = DateTime.parse(exam['date']).toLocal();
                            return DateTime(parsedDate.year, parsedDate.month, parsedDate.day);
                          }).toSet().toList()..sort();
                          
                          // Filter exams by selected date
                          final filteredExams = _selectedDate == null
                              ? exams
                              : exams.where((exam) {
                                  final parsedDate = DateTime.parse(exam['date']).toLocal();
                                  final examDay = DateTime(parsedDate.year, parsedDate.month, parsedDate.day);
                                  return examDay.isAtSameMomentAs(_selectedDate!);
                                }).toList();

                          return Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              // Gorgeous Horizontal Date timeline scroll selector
                              const Text(
                                'SELECT DATE FILTER',
                                style: TextStyle(
                                  fontSize: 10,
                                  fontWeight: FontWeight.w900,
                                  color: AppTheme.textSecondary,
                                  letterSpacing: 1,
                                ),
                              ),
                              const SizedBox(height: 10),
                              SizedBox(
                                height: 64,
                                child: ListView.separated(
                                  scrollDirection: Axis.horizontal,
                                  itemCount: sortedDates.length + 1, // +1 for "ALL"
                                  separatorBuilder: (context, index) => const SizedBox(width: 8),
                                  itemBuilder: (context, index) {
                                    final isAll = index == 0;
                                    final isSelected = isAll 
                                        ? _selectedDate == null 
                                        : _selectedDate?.isAtSameMomentAs(sortedDates[index - 1]) ?? false;
                                        
                                    final cardColor = isSelected ? AppTheme.primaryColor : AppTheme.surfaceColor;
                                    final textColor = isSelected ? Colors.white : AppTheme.textPrimary;
                                    final subColor = isSelected ? Colors.white70 : AppTheme.textSecondary;

                                    if (isAll) {
                                      return GestureDetector(
                                        onTap: () => setState(() => _selectedDate = null),
                                        child: Container(
                                          width: 64,
                                          decoration: BoxDecoration(
                                            color: cardColor,
                                            borderRadius: BorderRadius.circular(16),
                                            boxShadow: AppTheme.softShadow,
                                            border: Border.all(
                                              color: isSelected ? Colors.transparent : AppTheme.outlineColor.withValues(alpha: 0.15),
                                            ),
                                          ),
                                          child: Center(
                                            child: Text(
                                              'ALL',
                                              style: TextStyle(
                                                fontWeight: FontWeight.w900,
                                                color: textColor,
                                                fontSize: 12,
                                                letterSpacing: 0.5,
                                              ),
                                            ),
                                          ),
                                        ),
                                      );
                                    }

                                    final date = sortedDates[index - 1];
                                    final dayLabel = _getDayAbbreviation(date.weekday);
                                    final dayNumber = date.day.toString();

                                    return GestureDetector(
                                      onTap: () => setState(() => _selectedDate = date),
                                      child: Container(
                                        width: 58,
                                        decoration: BoxDecoration(
                                          color: cardColor,
                                          borderRadius: BorderRadius.circular(16),
                                          boxShadow: AppTheme.softShadow,
                                          border: Border.all(
                                            color: isSelected ? Colors.transparent : AppTheme.outlineColor.withValues(alpha: 0.15),
                                          ),
                                        ),
                                        child: Column(
                                          mainAxisAlignment: MainAxisAlignment.center,
                                          children: [
                                            Text(
                                              dayLabel,
                                              style: TextStyle(
                                                fontSize: 9,
                                                fontWeight: FontWeight.bold,
                                                color: subColor,
                                                letterSpacing: 0.5,
                                              ),
                                            ),
                                            const SizedBox(height: 2),
                                            Text(
                                              dayNumber,
                                              style: TextStyle(
                                                fontSize: 16,
                                                fontWeight: FontWeight.w900,
                                                color: textColor,
                                                height: 1.1,
                                              ),
                                            ),
                                          ],
                                        ),
                                      ),
                                    );
                                  },
                                ),
                              ),
                              const SizedBox(height: 28),
                              
                              _buildSectionDivider('EXAM TIMETABLE'),
                              const SizedBox(height: 16),

                              if (filteredExams.isEmpty)
                                const Center(
                                  child: Padding(
                                    padding: EdgeInsets.symmetric(vertical: 32.0),
                                    child: Text(
                                      'No exams scheduled on this date.',
                                      style: TextStyle(color: AppTheme.textSecondary, fontSize: 13, fontWeight: FontWeight.w500),
                                    ),
                                  ),
                                )
                              else
                                ListView.separated(
                                  shrinkWrap: true,
                                  physics: const NeverScrollableScrollPhysics(),
                                  itemCount: filteredExams.length,
                                  separatorBuilder: (context, index) => const SizedBox(height: 14),
                                  itemBuilder: (context, index) {
                                    final exam = filteredExams[index];
                                    final dateStr = DateTime.parse(exam['date']).toLocal().toString().split(' ').first;
                                    final subjectName = exam['subjectName'] ?? 'Subject';
                                    final subjectCode = exam['subjectCode'] ?? 'Code';
                                    final examType = exam['examType'] ?? 'Exam';
                                    final maxMarks = exam['maxMarks'] ?? 100;
                                    final facultyName = exam['assignedFaculty']?['name'] ?? 'Faculty';
                                    
                                    // Check if exam is live
                                    final now = DateTime.now();
                                    final startTime = exam['startTime'] != null ? DateTime.parse(exam['startTime']) : null;
                                    final endTime = exam['endTime'] != null ? DateTime.parse(exam['endTime']) : null;
                                    
                                    bool isLive = false;
                                    if (startTime != null && endTime != null) {
                                      isLive = now.isAfter(startTime) && now.isBefore(endTime);
                                    }

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
                                                  color: isLive 
                                                      ? AppTheme.successColor.withValues(alpha: 0.1) 
                                                      : AppTheme.primaryColor.withValues(alpha: 0.08),
                                                  borderRadius: BorderRadius.circular(6),
                                                ),
                                                child: Text(
                                                  isLive ? 'LIVE' : 'SCHEDULED',
                                                  style: TextStyle(
                                                    color: isLive ? AppTheme.successColor : AppTheme.primaryColor,
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
                                            '$examType • Max Marks: $maxMarks',
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
                                                // Always require QR scan or manual token entry
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
                            ],
                          );
                        },
                        loading: () => const Center(
                          child: Padding(
                            padding: EdgeInsets.all(32.0),
                            child: CircularProgressIndicator(),
                          ),
                        ),
                        error: (err, stack) => Center(
                          child: Padding(
                            padding: const EdgeInsets.all(24.0),
                            child: Text(
                              'Error loading timetable: $err',
                              style: const TextStyle(color: Colors.red),
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(height: 120),
                    ]),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  String _getDayAbbreviation(int weekday) {
    switch (weekday) {
      case DateTime.monday: return 'MON';
      case DateTime.tuesday: return 'TUE';
      case DateTime.wednesday: return 'WED';
      case DateTime.thursday: return 'THU';
      case DateTime.friday: return 'FRI';
      case DateTime.saturday: return 'SAT';
      case DateTime.sunday: return 'SUN';
      default: return '';
    }
  }

  Widget _buildAppBar(BuildContext context) {
    return SliverAppBar(
      floating: true,
      backgroundColor: AppTheme.backgroundColor.withValues(alpha: 0.8),
      surfaceTintColor: Colors.transparent,
      centerTitle: true,
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
