import 'package:flutter/material.dart';
import '../../core/theme/app_theme.dart';

// =============================================================================
// APP ERROR CARD
// Universal error view card for network/sync/data failure states.
// =============================================================================
class AppErrorCard extends StatelessWidget {
  final String title;
  final String message;
  final String buttonLabel;
  final VoidCallback? onRetry;
  final IconData icon;

  const AppErrorCard({
    super.key,
    this.title = 'Sync Failure',
    required this.message,
    this.buttonLabel = 'Try Again',
    this.onRetry,
    this.icon = Icons.error_outline_rounded,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: AppTheme.surfaceColor,
        borderRadius: BorderRadius.circular(AppTheme.borderRadius2XL),
        border: Border.all(color: AppTheme.errorColor.withValues(alpha: 0.15)),
        boxShadow: AppTheme.softShadow,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, color: AppTheme.errorColor, size: 48),
          const SizedBox(height: 16),
          Text(
            title,
            style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16, color: AppTheme.textPrimary),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 8),
          Text(
            message,
            textAlign: TextAlign.center,
            style: const TextStyle(fontSize: 12, color: AppTheme.textSecondary, height: 1.4),
          ),
          if (onRetry != null) ...[
            const SizedBox(height: 20),
            ElevatedButton.icon(
              onPressed: onRetry,
              icon: const Icon(Icons.refresh_rounded, size: 18),
              label: Text(buttonLabel),
              style: ElevatedButton.styleFrom(
                minimumSize: const Size(180, 44),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppTheme.borderRadiusLarge)),
              ),
            ),
          ],
        ],
      ),
    );
  }
}
