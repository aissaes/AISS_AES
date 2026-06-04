import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../../auth/providers/auth_provider.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/app_logo.dart';
import '../../../core/widgets/app_loading_indicator.dart';
import '../../profile/repositories/student_repository_impl.dart';
import '../providers/dashboard_provider.dart';
import '../models/dashboard_data_model.dart';

class DashboardScreen extends ConsumerWidget {
  const DashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authState = ref.watch(authProvider);
    final dashboardState = ref.watch(dashboardDataProvider);

    // Resolve actual cached student details for high-fidelity personalized experience
    final studentProfile = ref.watch(studentRepositoryProvider).getCachedProfile() ?? authState.student;
    final String displayName = studentProfile?.name ?? 'Student';

    return Scaffold(
      backgroundColor: AppTheme.backgroundColor,
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: () async {
            ref.invalidate(dashboardDataProvider);
            await ref.read(dashboardDataProvider.future);
          },
          color: AppTheme.primaryColor,
          child: Center(
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 600),
              child: CustomScrollView(
                physics: const AlwaysScrollableScrollPhysics(),
                slivers: [
                  _buildAppBar(context, displayName),
                  SliverPadding(
                    padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 24),
                    sliver: SliverList(
                      delegate: SliverChildListDelegate([
                        _buildWelcomeHeader(context, displayName, authState.isOffline),
                        const SizedBox(height: 24),
                        
                        dashboardState.when(
                          data: (data) => Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              // Hero Priority Card (Section 1)
                              _SmartPriorityCard(priorityCard: data.priorityCard),
                              const SizedBox(height: 28),

                              // Semester Snapshot Grid (Section 2)
                              const _SectionHeader(title: 'SEMESTER SNAPSHOT'),
                              const SizedBox(height: 16),
                              _SemesterSnapshotGrid(snapshot: data.semesterSnapshot),
                              const SizedBox(height: 28),

                              // Latest Result Preview (Section 4)
                              if (data.latestResult != null) ...[
                                const _SectionHeader(title: 'LATEST RESULT'),
                                const SizedBox(height: 16),
                                _LatestResultPreviewCard(result: data.latestResult!),
                                const SizedBox(height: 28),
                              ],

                              // Recent Activity Timeline (Section 3)
                              const _SectionHeader(title: 'RECENT ACTIVITY'),
                              const SizedBox(height: 16),
                              _RecentActivityTimeline(activities: data.recentActivity),
                            ],
                          ),
                          loading: () => const Center(
                            child: Padding(
                              padding: EdgeInsets.symmetric(vertical: 80.0),
                              child: AppLoadingIndicator(size: 60, logoSize: 28),
                            ),
                          ),
                          error: (error, stackTrace) => _buildErrorState(context, ref, error),
                        ),
                        
                        const SizedBox(height: 100), // Bottom padding for floating navigation bar
                      ]),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildAppBar(BuildContext context, String name) {
    final initials = name.isNotEmpty
        ? name.split(' ').map((e) => e[0]).take(2).join('').toUpperCase()
        : 'S';

    return SliverAppBar(
      floating: true,
      backgroundColor: AppTheme.backgroundColor.withValues(alpha: 0.8),
      surfaceTintColor: Colors.transparent,
      flexibleSpace: ClipRect(
        child: BackdropFilter(
          filter: ImageFilter.blur(sigmaX: 10, sigmaY: 10),
          child: Container(color: Colors.transparent),
        ),
      ),
      leading: Padding(
        padding: const EdgeInsets.only(left: 20.0),
        child: Center(
          child: CircleAvatar(
            radius: 18,
            backgroundColor: AppTheme.primaryColor.withValues(alpha: 0.1),
            child: Text(
              initials,
              style: const TextStyle(
                color: AppTheme.primaryColor,
                fontSize: 12,
                fontWeight: FontWeight.w800,
              ),
            ),
          ),
        ),
      ),
      title: const Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          AppLogo(size: 24),
          SizedBox(width: 8),
          Text(
            'AISS AES',
            style: TextStyle(
              fontWeight: FontWeight.w900,
              color: AppTheme.primaryColor,
              fontSize: 18,
              letterSpacing: -0.5,
            ),
          ),
        ],
      ),
      actions: const [
        Icon(Icons.verified_user_rounded, color: AppTheme.successColor, size: 20),
        SizedBox(width: 24),
      ],
    );
  }

  Widget _buildWelcomeHeader(BuildContext context, String displayName, bool isOffline) {
    final firstName = displayName.split(' ').first;
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Welcome, $firstName 👋',
              style: Theme.of(context).textTheme.displayLarge?.copyWith(
                    fontSize: 26,
                    fontWeight: FontWeight.w900,
                    letterSpacing: -0.5,
                  ),
            ),
            const SizedBox(height: 4),
            Text(
              isOffline ? 'Offline — Viewing Cached Data' : 'System Secure & Online',
              style: TextStyle(
                color: isOffline ? Colors.orange.shade800 : AppTheme.textSecondary,
                fontSize: 13,
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
        ),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
          decoration: BoxDecoration(
            color: AppTheme.successColor.withValues(alpha: 0.1),
            borderRadius: BorderRadius.circular(100),
          ),
          child: const Row(
            children: [
              Icon(Icons.shield_rounded, color: AppTheme.successColor, size: 12),
              SizedBox(width: 4),
              Text(
                'VERIFIED',
                style: TextStyle(
                  color: AppTheme.successColor,
                  fontSize: 9,
                  fontWeight: FontWeight.w900,
                  letterSpacing: 0.5,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildErrorState(BuildContext context, WidgetRef ref, Object error) {
    return Container(
      padding: const EdgeInsets.all(24),
      margin: const EdgeInsets.only(top: 20),
      decoration: BoxDecoration(
        color: AppTheme.surfaceColor,
        borderRadius: BorderRadius.circular(AppTheme.borderRadius2XL),
        border: Border.all(color: AppTheme.errorColor.withValues(alpha: 0.15)),
      ),
      child: Column(
        children: [
          const Icon(Icons.error_outline_rounded, color: AppTheme.errorColor, size: 48),
          const SizedBox(height: 16),
          const Text(
            'Failed to sync Control Center',
            style: TextStyle(fontWeight: FontWeight.w800, fontSize: 16, color: AppTheme.textPrimary),
          ),
          const SizedBox(height: 8),
          Text(
            error.toString(),
            textAlign: TextAlign.center,
            style: const TextStyle(fontSize: 12, color: AppTheme.textSecondary),
          ),
          const SizedBox(height: 20),
          ElevatedButton.icon(
            onPressed: () => ref.invalidate(dashboardDataProvider),
            icon: const Icon(Icons.refresh_rounded, size: 18),
            label: const Text('Try Refreshing'),
            style: ElevatedButton.styleFrom(
              minimumSize: const Size(180, 44),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppTheme.borderRadiusLarge)),
            ),
          ),
        ],
      ),
    );
  }
}

class _SectionHeader extends StatelessWidget {
  final String title;

  const _SectionHeader({required this.title});

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Text(
          title,
          style: const TextStyle(
            fontSize: 11,
            fontWeight: FontWeight.w900,
            color: AppTheme.outlineColor,
            letterSpacing: 1.2,
          ),
        ),
        const SizedBox(width: 12),
        const Expanded(child: Divider(color: AppTheme.outlineVariant, height: 1, thickness: 0.5)),
      ],
    );
  }
}

// ==========================================
// 1. SMART PRIORITY CARD
// ==========================================
class _SmartPriorityCard extends StatelessWidget {
  final DashboardPriorityCard priorityCard;

  const _SmartPriorityCard({required this.priorityCard});

  @override
  Widget build(BuildContext context) {
    switch (priorityCard.type) {
      case 'live_exam':
        return _buildLiveExamCard(context, priorityCard.data);
      case 'upcoming_exam':
        return _buildUpcomingExamCard(context, priorityCard.data);
      case 'result':
        return _buildResultPublishedCard(context, priorityCard.data);
      case 'overview':
      default:
        return _buildDefaultOverviewCard(context, priorityCard.data);
    }
  }

  Widget _buildLiveExamCard(BuildContext context, Map<String, dynamic> data) {
    final remainingMins = data['remainingMinutes'] ?? 0;
    
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(AppTheme.borderRadius2XL),
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            Color(0xFFBA1A1A), // Crimson Red
            Color(0xFFE23C3C),
          ],
        ),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFFBA1A1A).withValues(alpha: 0.35),
            blurRadius: 24,
            offset: const Offset(0, 10),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.2),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: const Row(
                  children: [
                    _LivePulseIndicator(),
                    SizedBox(width: 6),
                    Text(
                      'LIVE NOW',
                      style: TextStyle(
                        color: Colors.white,
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
                data['subjectCode'] ?? '',
                style: const TextStyle(color: Colors.white70, fontSize: 12, fontWeight: FontWeight.bold),
              ),
            ],
          ),
          const SizedBox(height: 16),
          Text(
            data['subjectName'] ?? 'Examination',
            style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 22, color: Colors.white, height: 1.2),
          ),
          const SizedBox(height: 6),
          Text(
            data['examType'] ?? '',
            style: const TextStyle(color: Colors.white70, fontSize: 13, fontWeight: FontWeight.w500),
          ),
          const SizedBox(height: 20),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'TIME REMAINING',
                    style: TextStyle(color: Colors.white54, fontSize: 9, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    '$remainingMins Minutes Left',
                    style: const TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold),
                  ),
                ],
              ),
              ElevatedButton(
                onPressed: () => context.go('/exams'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.white,
                  foregroundColor: const Color(0xFFBA1A1A),
                  minimumSize: const Size(120, 46),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppTheme.borderRadiusLarge)),
                  elevation: 0,
                ),
                child: const Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text('Join Exam'),
                    SizedBox(width: 4),
                    Icon(Icons.arrow_forward_rounded, size: 14),
                  ],
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildUpcomingExamCard(BuildContext context, Map<String, dynamic> data) {
    final startsInHours = data['startsInHours'] ?? 0;
    final startTimeStr = data['startTime'] != null 
        ? DateFormat('hh:mm a').format(DateTime.parse(data['startTime']).toLocal())
        : '09:00 AM';

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: AppTheme.surfaceColor,
        borderRadius: BorderRadius.circular(AppTheme.borderRadius2XL),
        border: Border.all(color: Colors.orange.withValues(alpha: 0.3), width: 1.5),
        boxShadow: AppTheme.softShadow,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: Colors.orange.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: const Row(
                  children: [
                    Icon(Icons.access_time_filled_rounded, color: Colors.orange, size: 10),
                    SizedBox(width: 4),
                    Text(
                      'NEXT EXAM',
                      style: TextStyle(
                        color: Colors.orange,
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
                data['subjectCode'] ?? '',
                style: const TextStyle(color: AppTheme.textSecondary, fontSize: 12, fontWeight: FontWeight.bold),
              ),
            ],
          ),
          const SizedBox(height: 16),
          Text(
            data['subjectName'] ?? '',
            style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 20, color: AppTheme.textPrimary, height: 1.2),
          ),
          const SizedBox(height: 6),
          Text(
            'Tomorrow • $startTimeStr',
            style: const TextStyle(color: AppTheme.textSecondary, fontSize: 13),
          ),
          const Divider(height: 32, color: AppTheme.outlineVariant, thickness: 0.5),
          Row(
            children: [
              const Icon(Icons.timer_outlined, color: AppTheme.textSecondary, size: 16),
              const SizedBox(width: 6),
              Text(
                'Starts in $startsInHours Hours',
                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: AppTheme.textPrimary),
              ),
              const Spacer(),
              TextButton(
                onPressed: () => context.go('/exams'),
                style: TextButton.styleFrom(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  minimumSize: Size.zero,
                  tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                ),
                child: const Text('View Token Details'),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildResultPublishedCard(BuildContext context, Map<String, dynamic> data) {
    final marksObtained = data['marksObtained'] ?? 0;
    final maxMarks = data['maxMarks'] ?? 100;
    final examId = data['examId'] ?? '';

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: AppTheme.surfaceColor,
        borderRadius: BorderRadius.circular(AppTheme.borderRadius2XL),
        border: Border.all(color: AppTheme.successColor.withValues(alpha: 0.3), width: 1.5),
        boxShadow: AppTheme.softShadow,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: AppTheme.successColor.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: const Row(
                  children: [
                    Icon(Icons.workspace_premium_rounded, color: AppTheme.successColor, size: 10),
                    SizedBox(width: 4),
                    Text(
                      'RESULT PUBLISHED',
                      style: TextStyle(
                        color: AppTheme.successColor,
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
                data['subjectCode'] ?? '',
                style: const TextStyle(color: AppTheme.textSecondary, fontSize: 12, fontWeight: FontWeight.bold),
              ),
            ],
          ),
          const SizedBox(height: 16),
          Text(
            data['subjectName'] ?? '',
            style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 20, color: AppTheme.textPrimary, height: 1.2),
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: AppTheme.successColor.withValues(alpha: 0.08),
                  shape: BoxShape.circle,
                ),
                child: const Icon(
                  Icons.check_circle_outline_rounded,
                  color: AppTheme.successColor,
                  size: 26,
                ),
              ),
              const SizedBox(width: 16),
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('MARKS OBTAINED', style: TextStyle(color: AppTheme.textSecondary, fontSize: 10, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 4),
                  Text('$marksObtained / $maxMarks', style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 18, color: AppTheme.textPrimary)),
                ],
              ),
              const Spacer(),
              ElevatedButton(
                onPressed: () {
                  if (examId.isNotEmpty) {
                    context.push('/results/detail/$examId');
                  } else {
                    context.go('/results');
                  }
                },
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppTheme.primaryColor,
                  foregroundColor: Colors.white,
                  minimumSize: const Size(110, 44),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppTheme.borderRadiusLarge)),
                  elevation: 0,
                ),
                child: const Text('View Script'),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildDefaultOverviewCard(BuildContext context, Map<String, dynamic> data) {
    final semesterName = data['semesterName'] ?? 'Semester Overview';
    final coursesCount = data['coursesCount'] ?? 0;
    final totalCredits = data['totalCredits'] ?? 0;
    final completedExams = data['completedExams'] ?? 0;
    final totalExams = data['totalExams'] ?? 0;

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(AppTheme.borderRadius2XL),
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            AppTheme.primaryColor,
            AppTheme.primaryContainer,
          ],
        ),
        boxShadow: [
          BoxShadow(
            color: AppTheme.primaryColor.withValues(alpha: 0.3),
            blurRadius: 20,
            offset: const Offset(0, 10),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                semesterName.toString().toUpperCase(),
                style: const TextStyle(
                  color: Colors.white70,
                  fontSize: 11,
                  fontWeight: FontWeight.w900,
                  letterSpacing: 1.5,
                ),
              ),
              const Icon(Icons.dashboard_customize_rounded, color: Colors.white70, size: 16),
            ],
          ),
          const SizedBox(height: 16),
          const Text(
            'Academic Control Center',
            style: TextStyle(
              color: Colors.white,
              fontSize: 22,
              fontWeight: FontWeight.w900,
              letterSpacing: -0.5,
            ),
          ),
          const SizedBox(height: 4),
          const Text(
            'System fully operational. Tap tabs below to view detailed timelines.',
            style: TextStyle(color: Colors.white70, fontSize: 12),
          ),
          const SizedBox(height: 24),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              _buildMetricItem('$coursesCount', 'Courses'),
              _buildMetricItem('$totalCredits', 'Credits'),
              _buildMetricItem('$completedExams / $totalExams', 'Exams Done'),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildMetricItem(String val, String label) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          val,
          style: const TextStyle(
            color: Colors.white,
            fontSize: 20,
            fontWeight: FontWeight.w900,
          ),
        ),
        const SizedBox(height: 2),
        Text(
          label.toUpperCase(),
          style: const TextStyle(
            color: Colors.white54,
            fontSize: 8,
            fontWeight: FontWeight.bold,
            letterSpacing: 0.5,
          ),
        ),
      ],
    );
  }
}

class _LivePulseIndicator extends StatefulWidget {
  const _LivePulseIndicator();

  @override
  State<_LivePulseIndicator> createState() => _LivePulseIndicatorState();
}

class _LivePulseIndicatorState extends State<_LivePulseIndicator> with SingleTickerProviderStateMixin {
  late AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      duration: const Duration(milliseconds: 800),
      vsync: this,
    )..repeat(reverse: true);
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return FadeTransition(
      opacity: Tween<double>(begin: 0.3, end: 1.0).animate(_controller),
      child: Container(
        width: 8,
        height: 8,
        decoration: const BoxDecoration(
          color: Colors.white,
          shape: BoxShape.circle,
        ),
      ),
    );
  }
}

// ==========================================
// 2. SEMESTER SNAPSHOT GRID
// ==========================================
class _SemesterSnapshotGrid extends StatelessWidget {
  final DashboardSemesterSnapshot snapshot;

  const _SemesterSnapshotGrid({required this.snapshot});

  @override
  Widget build(BuildContext context) {
    return GridView.count(
      crossAxisCount: 2,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      crossAxisSpacing: 16,
      mainAxisSpacing: 16,
      childAspectRatio: 1.9,
      children: [
        _buildSnapshotCard(
          icon: Icons.book_outlined,
          title: 'Courses Enrolled',
          value: '${snapshot.coursesCount}',
          color: const Color(0xFFE8EAF6),
          iconColor: AppTheme.primaryColor,
        ),
        _buildSnapshotCard(
          icon: Icons.badge_outlined,
          title: 'Semester Credits',
          value: '${snapshot.totalCredits}',
          color: const Color(0xFFFFF3E0),
          iconColor: Colors.orange,
        ),
        _buildSnapshotCard(
          icon: Icons.pending_actions_rounded,
          title: 'Upcoming Exams',
          value: '${snapshot.upcomingExams}',
          color: const Color(0xFFE0F2F1),
          iconColor: Colors.teal,
        ),
        _buildSnapshotCard(
          icon: Icons.task_alt_rounded,
          title: 'Exams Completed',
          value: '${snapshot.completedExams}',
          color: const Color(0xFFFCE4EC),
          iconColor: Colors.pink,
        ),
      ],
    );
  }

  Widget _buildSnapshotCard({
    required IconData icon,
    required String title,
    required String value,
    required Color color,
    required Color iconColor,
  }) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppTheme.surfaceColor,
        borderRadius: BorderRadius.circular(AppTheme.borderRadiusLarge),
        border: Border.all(color: AppTheme.outlineVariant.withValues(alpha: 0.3)),
        boxShadow: AppTheme.softShadow,
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: color,
              borderRadius: BorderRadius.circular(8),
            ),
            child: Icon(icon, color: iconColor, size: 20),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text(
                  value,
                  style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 16, color: AppTheme.textPrimary),
                ),
                const SizedBox(height: 2),
                Text(
                  title,
                  style: const TextStyle(color: AppTheme.textSecondary, fontSize: 10, fontWeight: FontWeight.w500),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

// ==========================================
// 3. LATEST RESULT PREVIEW CARD
// ==========================================
class _LatestResultPreviewCard extends StatelessWidget {
  final DashboardLatestResult result;

  const _LatestResultPreviewCard({required this.result});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppTheme.surfaceColor,
        borderRadius: BorderRadius.circular(AppTheme.borderRadiusLarge),
        border: Border.all(color: AppTheme.outlineVariant.withValues(alpha: 0.3)),
        boxShadow: AppTheme.softShadow,
      ),
      child: InkWell(
        onTap: () {
          if (result.examId.isNotEmpty) {
            context.push('/results/detail/${result.examId}');
          } else {
            context.go('/results');
          }
        },
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: AppTheme.primaryColor.withValues(alpha: 0.08),
                borderRadius: BorderRadius.circular(8),
              ),
              child: const Icon(
                Icons.assignment_turned_in_outlined,
                color: AppTheme.primaryColor,
                size: 20,
              ),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    result.subjectName,
                    style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 14, color: AppTheme.textPrimary),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 2),
                  Text(
                    result.subjectCode,
                    style: const TextStyle(color: AppTheme.textSecondary, fontSize: 11),
                  ),
                ],
              ),
            ),
            Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Text(
                  '${result.marksObtained.toStringAsFixed(0)} / ${result.maxMarks.toStringAsFixed(0)}',
                  style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 13, color: AppTheme.textPrimary),
                ),
                const SizedBox(height: 2),
                const Text(
                  'View Details →',
                  style: TextStyle(color: AppTheme.primaryColor, fontSize: 10, fontWeight: FontWeight.bold),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

// ==========================================
// 4. RECENT ACTIVITY TIMELINE
// ==========================================
class _RecentActivityTimeline extends StatelessWidget {
  final List<DashboardRecentActivity> activities;

  const _RecentActivityTimeline({required this.activities});

  @override
  Widget build(BuildContext context) {
    // 1. Deduplicate activities by title to reduce clutter
    final uniqueActivities = <DashboardRecentActivity>[];
    final seenTitles = <String>{};
    for (final activity in activities) {
      if (!seenTitles.contains(activity.title)) {
        seenTitles.add(activity.title);
        uniqueActivities.add(activity);
      }
    }

    if (uniqueActivities.isEmpty) {
      return Container(
        padding: const EdgeInsets.symmetric(vertical: 32),
        width: double.infinity,
        decoration: BoxDecoration(
          color: AppTheme.surfaceColor,
          borderRadius: BorderRadius.circular(AppTheme.borderRadiusLarge),
          border: Border.all(color: AppTheme.outlineVariant.withValues(alpha: 0.2)),
        ),
        child: const Center(
          child: Text(
            'No recent activity logged.',
            style: TextStyle(color: AppTheme.textSecondary, fontSize: 13),
          ),
        ),
      );
    }

    // 2. Group by date categories: "Today", "Yesterday", "Earlier"
    final now = DateTime.now();
    final todayStart = DateTime(now.year, now.month, now.day);
    final yesterdayStart = todayStart.subtract(const Duration(days: 1));

    final todayActivities = <DashboardRecentActivity>[];
    final yesterdayActivities = <DashboardRecentActivity>[];
    final earlierActivities = <DashboardRecentActivity>[];

    for (final activity in uniqueActivities) {
      final date = activity.timestamp;
      if (date.isAfter(todayStart) || date.isAtSameMomentAs(todayStart)) {
        todayActivities.add(activity);
      } else if (date.isAfter(yesterdayStart) || date.isAtSameMomentAs(yesterdayStart)) {
        yesterdayActivities.add(activity);
      } else {
        earlierActivities.add(activity);
      }
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (todayActivities.isNotEmpty) ...[
          _buildGroupHeader('Today'),
          const SizedBox(height: 12),
          ...todayActivities.map((a) => _ActivityTimelineTile(
                activity: a,
                isLast: a == todayActivities.last && yesterdayActivities.isEmpty && earlierActivities.isEmpty,
                timeStr: _formatTimestamp(a.timestamp),
              )),
          const SizedBox(height: 16),
        ],
        if (yesterdayActivities.isNotEmpty) ...[
          _buildGroupHeader('Yesterday'),
          const SizedBox(height: 12),
          ...yesterdayActivities.map((a) => _ActivityTimelineTile(
                activity: a,
                isLast: a == yesterdayActivities.last && earlierActivities.isEmpty,
                timeStr: _formatTimestamp(a.timestamp),
              )),
          const SizedBox(height: 16),
        ],
        if (earlierActivities.isNotEmpty) ...[
          _buildGroupHeader('Earlier'),
          const SizedBox(height: 12),
          ...earlierActivities.map((a) => _ActivityTimelineTile(
                activity: a,
                isLast: a == earlierActivities.last,
                timeStr: _formatTimestamp(a.timestamp),
              )),
        ],
      ],
    );
  }

  Widget _buildGroupHeader(String label) {
    return Text(
      label.toUpperCase(),
      style: const TextStyle(
        fontSize: 10,
        fontWeight: FontWeight.w900,
        color: AppTheme.outlineColor,
        letterSpacing: 0.8,
      ),
    );
  }

  String _formatTimestamp(DateTime dt) {
    final now = DateTime.now();
    final diff = now.difference(dt);

    if (diff.inMinutes < 60) {
      return '${diff.inMinutes.clamp(1, 59)}m ago';
    } else if (diff.inHours < 24) {
      return '${diff.inHours}h ago';
    } else if (diff.inDays < 7) {
      return '${diff.inDays}d ago';
    } else {
      return DateFormat('MMM dd').format(dt);
    }
  }
}

class _ActivityTimelineTile extends StatelessWidget {
  final DashboardRecentActivity activity;
  final bool isLast;
  final String timeStr;

  const _ActivityTimelineTile({
    required this.activity,
    required this.isLast,
    required this.timeStr,
  });

  String _getActivitySubtext(String type) {
    switch (type) {
      case 'submission':
        return 'Answer script submitted successfully.';
      case 'result':
        return 'Evaluation completed & marks published.';
      case 'feedback':
        return 'Constructive evaluation feedback added.';
      case 'token':
        return 'Exam passcode unlocked successfully.';
      default:
        return 'Activity logged successfully.';
    }
  }

  @override
  Widget build(BuildContext context) {
    IconData icon;
    Color iconColor;
    Color circleBg;

    switch (activity.type) {
      case 'submission':
        icon = Icons.task_alt_rounded;
        iconColor = AppTheme.successColor;
        circleBg = AppTheme.successColor.withValues(alpha: 0.1);
        break;
      case 'result':
        icon = Icons.workspace_premium_rounded;
        iconColor = Colors.orange;
        circleBg = Colors.orange.withValues(alpha: 0.1);
        break;
      case 'feedback':
        icon = Icons.rate_review_rounded;
        iconColor = AppTheme.primaryColor;
        circleBg = AppTheme.primaryColor.withValues(alpha: 0.1);
        break;
      case 'token':
        icon = Icons.vpn_key_rounded;
        iconColor = Colors.teal;
        circleBg = Colors.teal.withValues(alpha: 0.1);
        break;
      case 'profile':
      default:
        icon = Icons.shield_rounded;
        iconColor = Colors.indigo;
        circleBg = Colors.indigo.withValues(alpha: 0.1);
        break;
    }

    return IntrinsicHeight(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Timeline node representation
          Column(
            children: [
              Container(
                width: 32,
                height: 32,
                decoration: BoxDecoration(
                  color: circleBg,
                  shape: BoxShape.circle,
                ),
                child: Icon(icon, color: iconColor, size: 16),
              ),
              if (!isLast)
                Expanded(
                  child: Container(
                    width: 1.5,
                    color: AppTheme.outlineVariant.withValues(alpha: 0.4),
                  ),
                ),
            ],
          ),
          const SizedBox(width: 16),
          // Timeline contents
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Expanded(
                      child: Text(
                        activity.title,
                        style: const TextStyle(
                          fontWeight: FontWeight.bold,
                          fontSize: 13,
                          color: AppTheme.textPrimary,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    const SizedBox(width: 8),
                    Text(
                      timeStr,
                      style: const TextStyle(
                        color: AppTheme.textSecondary,
                        fontSize: 11,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 2),
                Text(
                  _getActivitySubtext(activity.type),
                  style: const TextStyle(
                    color: AppTheme.textSecondary,
                    fontSize: 11,
                  ),
                ),
                const SizedBox(height: 16), // space between elements
              ],
            ),
          ),
        ],
      ),
    );
  }
}
