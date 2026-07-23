import 'package:flutter/material.dart';
import '../../../../core/theme/app_theme.dart';

// =============================================================================
// UPLOAD ERROR CARD
// Shows offline queue message or upload error with contextual icon.
// =============================================================================
class UploadErrorCard extends StatelessWidget {
  final String errorMessage;
  final bool isOffline;

  const UploadErrorCard({
    super.key,
    required this.errorMessage,
    required this.isOffline,
  });

  Color get _color => isOffline ? Colors.orange.shade700 : AppTheme.errorColor;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: _color.withValues(alpha: 0.05),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: _color.withValues(alpha: 0.2)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(isOffline ? Icons.wifi_off_rounded : Icons.warning_amber_rounded, color: _color),
              const SizedBox(width: 8),
              Text(
                isOffline ? 'Auto-Upload Scheduled' : 'Upload Failed',
                style: TextStyle(fontWeight: FontWeight.bold, color: _color, fontSize: 16),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(errorMessage, style: const TextStyle(color: AppTheme.textPrimary, fontSize: 13, height: 1.4)),
        ],
      ),
    );
  }
}
