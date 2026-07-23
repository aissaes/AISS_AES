import 'package:flutter/material.dart';
import '../../../../core/theme/app_theme.dart';
import '../../models/exam_model.dart';

// =============================================================================
// UNLOCK EXAM DIALOG
// QR scan trigger dialog for unlocking an exam.
// =============================================================================
class UnlockExamDialog extends StatelessWidget {
  final ExamModel exam;
  final VoidCallback onScanQr;

  const UnlockExamDialog({
    super.key,
    required this.exam,
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
      title: Row(
        children: [
          const Icon(Icons.lock_open_rounded, color: AppTheme.primaryColor, size: 22),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              'Unlock ${exam.subjectCode}',
              style: const TextStyle(color: AppTheme.textPrimary, fontWeight: FontWeight.bold, fontSize: 16),
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
            Text(
              'To unlock the answer sheet upload session for ${exam.subjectName}, point your camera at the projected Exam QR code in your examination hall.',
              style: const TextStyle(color: AppTheme.textSecondary, fontSize: 13, height: 1.4),
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
