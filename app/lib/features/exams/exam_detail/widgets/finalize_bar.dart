import 'package:flutter/material.dart';
import '../../../../core/theme/app_theme.dart';

// =============================================================================
// FINALIZE BAR
// Fixed bottom action bar with the "Finalize & Submit" button.
// =============================================================================
class FinalizeBar extends StatelessWidget {
  final bool isFinalizing;
  final bool isTimeUp;
  final VoidCallback onFinalize;

  const FinalizeBar({
    super.key,
    required this.isFinalizing,
    required this.isTimeUp,
    required this.onFinalize,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 20),
      decoration: const BoxDecoration(
        color: AppTheme.surfaceColor,
        border: Border(top: BorderSide(color: AppTheme.outlineColor)),
      ),
      child: ElevatedButton(
        onPressed: (isFinalizing || isTimeUp) ? null : onFinalize,
        style: ElevatedButton.styleFrom(backgroundColor: AppTheme.successColor),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            isFinalizing
                ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                : const Icon(Icons.cloud_done_rounded, color: Colors.white),
            const SizedBox(width: 12),
            Text(isFinalizing ? 'Finalizing Exam...' : 'Finalize & Submit Exam'),
          ],
        ),
      ),
    );
  }
}
