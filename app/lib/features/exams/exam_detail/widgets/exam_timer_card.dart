import 'package:flutter/material.dart';
import '../../../../core/theme/app_theme.dart';

// =============================================================================
// EXAM TIMER CARD
// Animated pulsing countdown display with deadline note.
// =============================================================================
class ExamTimerCard extends StatelessWidget {
  final int secondsRemaining;
  final String endFormatted;
  final AnimationController pulseController;

  const ExamTimerCard({
    super.key,
    required this.secondsRemaining,
    required this.endFormatted,
    required this.pulseController,
  });

  String _formatTime(int seconds) {
    if (seconds <= 0) return '00:00:00';
    final h = seconds ~/ 3600;
    final m = (seconds % 3600) ~/ 60;
    final s = seconds % 60;
    return '${h.toString().padLeft(2, '0')}:${m.toString().padLeft(2, '0')}:${s.toString().padLeft(2, '0')}';
  }

  @override
  Widget build(BuildContext context) {
    final isTimeUp = secondsRemaining <= 0;
    final activeColor = isTimeUp ? AppTheme.errorColor : AppTheme.primaryColor;

    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: AppTheme.surfaceColor,
        borderRadius: BorderRadius.circular(AppTheme.borderRadiusLarge),
        boxShadow: AppTheme.premiumShadow,
        border: Border.all(color: activeColor.withValues(alpha: 0.1)),
      ),
      child: Column(
        children: [
          Text(
            isTimeUp ? 'EXAMINATION ENDED' : 'TIME REMAINING TO SUBMIT',
            style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: isTimeUp ? AppTheme.errorColor : AppTheme.textSecondary, letterSpacing: 1),
          ),
          const SizedBox(height: 16),
          AnimatedBuilder(
            animation: pulseController,
            builder: (context, _) => Container(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
              decoration: BoxDecoration(
                color: activeColor.withValues(alpha: 0.05),
                borderRadius: BorderRadius.circular(100),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(Icons.timer_outlined, color: activeColor, size: 24),
                  const SizedBox(width: 10),
                  Text(
                    _formatTime(secondsRemaining),
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
            ),
          ),
          const SizedBox(height: 16),
          Text(
            'The portal will accept answer uploads until:\n$endFormatted.',
            textAlign: TextAlign.center,
            style: const TextStyle(color: AppTheme.textSecondary, fontSize: 12, height: 1.5),
          ),
        ],
      ),
    );
  }
}
