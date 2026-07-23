import 'package:flutter/material.dart';
import '../../../../core/theme/app_theme.dart';
import '../models/dashboard_data_model.dart';

// =============================================================================
// RECENT ACTIVITY TIMELINE
// Grouped timeline (Today / Yesterday / Earlier) of recent user events.
// =============================================================================
class RecentActivityTimeline extends StatelessWidget {
  final List<DashboardRecentActivity> activities;

  const RecentActivityTimeline({super.key, required this.activities});

  @override
  Widget build(BuildContext context) {
    if (activities.isEmpty) {
      return const _EmptyActivityState();
    }

    final groups = _groupActivities(activities);

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: AppTheme.surfaceColor,
        borderRadius: BorderRadius.circular(AppTheme.borderRadiusLarge),
        border: Border.all(color: AppTheme.outlineVariant.withValues(alpha: 0.3)),
        boxShadow: AppTheme.softShadow,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          for (final entry in groups.entries) ...[
            _TimelineGroupHeader(label: entry.key),
            const SizedBox(height: 12),
            ...entry.value.map((act) => _TimelineItem(activity: act)),
            const SizedBox(height: 12),
          ],
        ],
      ),
    );
  }

  Map<String, List<DashboardRecentActivity>> _groupActivities(List<DashboardRecentActivity> items) {
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    final yesterday = today.subtract(const Duration(days: 1));

    final map = <String, List<DashboardRecentActivity>>{};
    final seenTitles = <String>{};

    for (final item in items) {
      if (seenTitles.contains(item.title)) continue;
      seenTitles.add(item.title);

      final date = DateTime(item.timestamp.year, item.timestamp.month, item.timestamp.day);
      final key = date == today
          ? 'TODAY'
          : (date == yesterday ? 'YESTERDAY' : 'EARLIER THIS WEEK');

      map.putIfAbsent(key, () => []).add(item);
    }
    return map;
  }
}

class _TimelineGroupHeader extends StatelessWidget {
  final String label;

  const _TimelineGroupHeader({required this.label});

  @override
  Widget build(BuildContext context) {
    return Text(
      label,
      style: const TextStyle(
        fontSize: 9,
        fontWeight: FontWeight.w900,
        color: AppTheme.textSecondary,
        letterSpacing: 1,
      ),
    );
  }
}

class _TimelineItem extends StatelessWidget {
  final DashboardRecentActivity activity;

  const _TimelineItem({required this.activity});

  @override
  Widget build(BuildContext context) {
    final (icon, color) = _iconAndColor(activity.type);

    return Padding(
      padding: const EdgeInsets.only(bottom: 12.0),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(6),
            decoration: BoxDecoration(color: color.withValues(alpha: 0.1), shape: BoxShape.circle),
            child: Icon(icon, color: color, size: 14),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              activity.title,
              style: const TextStyle(fontSize: 13, color: AppTheme.textPrimary, fontWeight: FontWeight.w500),
            ),
          ),
        ],
      ),
    );
  }

  (IconData, Color) _iconAndColor(String type) {
    return switch (type) {
      'submission' => (Icons.cloud_done_rounded, AppTheme.successColor),
      'result'     => (Icons.workspace_premium_rounded, AppTheme.primaryColor),
      'token'      => (Icons.vpn_key_rounded, Colors.orange),
      _            => (Icons.notifications_rounded, AppTheme.textSecondary),
    };
  }
}

class _EmptyActivityState extends StatelessWidget {
  const _EmptyActivityState();

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: AppTheme.surfaceColor,
        borderRadius: BorderRadius.circular(AppTheme.borderRadiusLarge),
        border: Border.all(color: AppTheme.outlineVariant.withValues(alpha: 0.3)),
      ),
      child: const Center(
        child: Text(
          'No recent system activity recorded.',
          style: TextStyle(color: AppTheme.textSecondary, fontSize: 13),
        ),
      ),
    );
  }
}
