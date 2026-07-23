import 'package:flutter/material.dart';
import '../../../../core/theme/app_theme.dart';

// =============================================================================
// UPLOAD PROGRESS RING
// Circular progress indicator with icon/percentage in the center.
// =============================================================================
class UploadProgressRing extends StatelessWidget {
  final double progress;
  final bool isError;
  final bool isOffline;

  const UploadProgressRing({
    super.key,
    required this.progress,
    required this.isError,
    required this.isOffline,
  });

  Color get _color => isOffline
      ? Colors.orange.shade700
      : (isError ? AppTheme.errorColor : AppTheme.primaryColor);

  @override
  Widget build(BuildContext context) {
    return Stack(
      alignment: Alignment.center,
      children: [
        SizedBox(
          width: 180,
          height: 180,
          child: CircularProgressIndicator(
            value: isError ? 0.0 : progress,
            strokeWidth: 10,
            backgroundColor: _color.withValues(alpha: 0.1),
            valueColor: AlwaysStoppedAnimation<Color>(_color),
            strokeCap: StrokeCap.round,
          ),
        ),
        _RingCenter(isError: isError, isOffline: isOffline, progress: progress),
      ],
    );
  }
}

class _RingCenter extends StatelessWidget {
  final bool isError;
  final bool isOffline;
  final double progress;

  const _RingCenter({required this.isError, required this.isOffline, required this.progress});

  @override
  Widget build(BuildContext context) {
    if (isOffline) {
      return Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.cloud_off_rounded, size: 44, color: Colors.orange.shade700),
          const SizedBox(height: 4),
          Text('QUEUED', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w900, color: Colors.orange.shade700, letterSpacing: 1)),
        ],
      );
    }

    if (isError) {
      return const Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.warning_amber_rounded, size: 44, color: AppTheme.errorColor),
          SizedBox(height: 4),
          Text('FAILED', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w900, color: AppTheme.errorColor, letterSpacing: 1)),
        ],
      );
    }

    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Text('${(progress * 100).toInt()}%', style: const TextStyle(fontSize: 44, fontWeight: FontWeight.w800, letterSpacing: -1)),
        Text('COMPLETE', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: AppTheme.primaryColor.withValues(alpha: 0.6), letterSpacing: 1)),
      ],
    );
  }
}
