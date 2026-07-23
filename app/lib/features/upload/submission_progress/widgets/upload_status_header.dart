import 'package:flutter/material.dart';
import '../../../../core/theme/app_theme.dart';

// =============================================================================
// UPLOAD STATUS HEADER
// Title and subtitle that change based on upload state.
// =============================================================================
class UploadStatusHeader extends StatelessWidget {
  final bool isError;
  final bool isOffline;

  const UploadStatusHeader({
    super.key,
    required this.isError,
    required this.isOffline,
  });

  @override
  Widget build(BuildContext context) {
    final title = isOffline
        ? 'Saved Locally (Offline)'
        : (isError ? 'Upload Interrupted' : 'Uploading Answer');
    final subtitle = isOffline
        ? 'Your answer is securely saved on your device & queued for upload.'
        : (isError ? 'Your captured answer page is preserved.' : 'Please keep the app open until finished.');

    return Column(
      children: [
        Text(title, style: const TextStyle(fontSize: 26, fontWeight: FontWeight.w800, letterSpacing: -0.5)),
        const SizedBox(height: 8),
        Text(subtitle, textAlign: TextAlign.center, style: const TextStyle(color: AppTheme.textSecondary, fontSize: 14)),
      ],
    );
  }
}
