import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/theme/app_theme.dart';
import '../../shared/widgets/app_loading_indicator.dart';
import '../../shared/widgets/app_error_card.dart';
import '../auth/providers/auth_provider.dart';
import '../profile/services/student_service.dart';
import 'models/dashboard_data_model.dart';
import 'providers/dashboard_provider.dart';
import 'widgets/dashboard_app_bar.dart';
import 'widgets/dashboard_welcome_header.dart';
import 'widgets/latest_result_preview_card.dart';
import 'widgets/recent_activity_timeline.dart';
import 'widgets/semester_snapshot_grid.dart';
import 'widgets/smart_priority_card.dart';

// =============================================================================
// DASHBOARD SCREEN
// High-level orchestrator assembling header, priority card, semester snapshot,
// latest result, and recent activity timeline into a single sliver scroll view.
// =============================================================================
class DashboardScreen extends ConsumerWidget {
  const DashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authState = ref.watch(authProvider);
    final dashboardState = ref.watch(dashboardDataProvider);
    final studentProfile = ref.watch(studentServiceProvider).getCachedProfile() ?? authState.student;
    final displayName = studentProfile?.name ?? 'Student';

    return Scaffold(
      backgroundColor: AppTheme.backgroundColor,
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: () => _refresh(ref),
          color: AppTheme.primaryColor,
          child: Center(
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 600),
              child: CustomScrollView(
                physics: const AlwaysScrollableScrollPhysics(),
                slivers: [
                  DashboardAppBar(displayName: displayName),
                  SliverPadding(
                    padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 24),
                    sliver: SliverList(
                      delegate: SliverChildListDelegate([
                        DashboardWelcomeHeader(
                          displayName: displayName,
                          isOffline: authState.isOffline,
                        ),
                        const SizedBox(height: 24),
                        dashboardState.when(
                          data: (data) => _DashboardBody(data: data),
                          loading: () => const _DashboardLoadingState(),
                          error: (error, _) => _DashboardErrorState(error: error, ref: ref),
                        ),
                        const SizedBox(height: 100),
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

  Future<void> _refresh(WidgetRef ref) async {
    try {
      await ref.read(authProvider.notifier).verifyToken();
    } catch (_) {}
    ref.invalidate(dashboardDataProvider);
    await ref.read(dashboardDataProvider.future);
  }
}

class _DashboardBody extends StatelessWidget {
  final DashboardData data;

  const _DashboardBody({required this.data});

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SmartPriorityCard(priorityCard: data.priorityCard),
        const SizedBox(height: 28),

        const _SectionHeader(title: 'SEMESTER SNAPSHOT'),
        const SizedBox(height: 16),
        SemesterSnapshotGrid(snapshot: data.semesterSnapshot),
        const SizedBox(height: 28),

        if (data.latestResult != null) ...[
          const _SectionHeader(title: 'LATEST RESULT'),
          const SizedBox(height: 16),
          LatestResultPreviewCard(result: data.latestResult!),
          const SizedBox(height: 28),
        ],

        const _SectionHeader(title: 'RECENT ACTIVITY'),
        const SizedBox(height: 16),
        RecentActivityTimeline(activities: data.recentActivity),
      ],
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
        const Expanded(
          child: Divider(color: AppTheme.outlineVariant, height: 1, thickness: 0.5),
        ),
      ],
    );
  }
}

class _DashboardLoadingState extends StatelessWidget {
  const _DashboardLoadingState();

  @override
  Widget build(BuildContext context) {
    return const Center(
      child: Padding(
        padding: EdgeInsets.symmetric(vertical: 80.0),
        child: AppLoadingIndicator(size: 60, logoSize: 28),
      ),
    );
  }
}

class _DashboardErrorState extends StatelessWidget {
  final Object error;
  final WidgetRef ref;

  const _DashboardErrorState({required this.error, required this.ref});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(top: 20),
      child: AppErrorCard(
        title: 'Failed to sync Control Center',
        message: error.toString(),
        buttonLabel: 'Try Refreshing',
        onRetry: () => ref.invalidate(dashboardDataProvider),
      ),
    );
  }
}
