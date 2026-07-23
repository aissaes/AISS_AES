import 'package:flutter/material.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../shared/widgets/app_badge.dart';

// =============================================================================
// WELCOME HEADER
// Personalized greeting + online/offline status badge using AppBadge.
// =============================================================================
class DashboardWelcomeHeader extends StatelessWidget {
  final String displayName;
  final bool isOffline;

  const DashboardWelcomeHeader({
    super.key,
    required this.displayName,
    required this.isOffline,
  });

  @override
  Widget build(BuildContext context) {
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
        AppBadge.soft(
          icon: const Icon(Icons.shield_rounded, color: AppTheme.successColor, size: 12),
          label: 'VERIFIED',
          color: AppTheme.successColor,
          borderRadius: 100,
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
        ),
      ],
    );
  }
}
