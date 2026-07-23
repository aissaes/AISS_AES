import 'package:flutter/material.dart';
import '../../../../core/theme/app_theme.dart';

// =============================================================================
// FINALIZE SUBMISSION DIALOG
// QR scan trigger dialog to verify and lock submission.
// =============================================================================
class FinalizeSubmissionDialog extends StatelessWidget {
  final String examToken;
  final VoidCallback onScanQr;

  const FinalizeSubmissionDialog({
    super.key,
    required this.examToken,
    required this.onScanQr,
  });

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
          Icon(Icons.verified_rounded, color: AppTheme.successColor, size: 22),
          SizedBox(width: 12),
          Expanded(
            child: Text(
              'Finalize & Submit',
              style: TextStyle(color: AppTheme.textPrimary, fontWeight: FontWeight.bold, fontSize: 16),
              overflow: TextOverflow.ellipsis,
            ),
          ),
        ],
      ),
      content: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Text(
              'Scan the projected Exam QR code in your examination hall to finalize and securely lock your submission.',
              style: TextStyle(color: AppTheme.textSecondary, fontSize: 13, height: 1.4),
            ),
            const SizedBox(height: 20),
            ElevatedButton.icon(
              onPressed: onScanQr,
              icon: const Icon(Icons.qr_code_scanner_rounded, size: 18),
              label: const Text('Scan Exam QR Code'),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppTheme.primaryColor,
                foregroundColor: Colors.white,
                minimumSize: const Size(0, 44),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(AppTheme.borderRadiusMedium),
                ),
              ),
            ),
          ],
        ),
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
