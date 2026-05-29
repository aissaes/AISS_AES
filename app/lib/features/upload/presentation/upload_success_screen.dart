import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/theme/app_theme.dart';

class UploadSuccessScreen extends ConsumerWidget {
  const UploadSuccessScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Scaffold(
      backgroundColor: AppTheme.backgroundColor,
      body: SafeArea(
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 500),
            child: Padding(
              padding: const EdgeInsets.all(32.0),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Spacer(),
                  _buildSuccessAnimation(),
                  const SizedBox(height: 40),
                  const Text(
                    'Submission Successful!',
                    style: TextStyle(
                      fontSize: 28,
                      fontWeight: FontWeight.w800,
                      letterSpacing: -0.5,
                    ),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 12),
                  const Text(
                    'Your exam script for Data Structures (CS301) has been received and verified.',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      color: AppTheme.textSecondary,
                      fontSize: 15,
                      height: 1.5,
                    ),
                  ),
                  const SizedBox(height: 48),
                  _buildReceiptCard(),
                  const Spacer(),
                  ElevatedButton(
                    onPressed: () {
                      context.go('/dashboard');
                    },
                    child: const Text('Return to Dashboard'),
                  ),
                  const SizedBox(height: 16),
                  TextButton.icon(
                    onPressed: () {},
                    icon: const Icon(Icons.file_download_outlined),
                    label: const Text('Download Receipt'),
                    style: TextButton.styleFrom(foregroundColor: AppTheme.textSecondary),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildSuccessAnimation() {
    return Container(
      width: 120,
      height: 120,
      decoration: BoxDecoration(
        color: AppTheme.successColor.withValues(alpha: 0.1),
        shape: BoxShape.circle,
      ),
      child: Center(
        child: Container(
          width: 80,
          height: 80,
          decoration: const BoxDecoration(
            color: AppTheme.successColor,
            shape: BoxShape.circle,
            boxShadow: [
              BoxShadow(
                color: Color(0x4D10B981),
                blurRadius: 20,
                offset: Offset(0, 8),
              ),
            ],
          ),
          child: const Icon(
            Icons.check_rounded,
            color: Colors.white,
            size: 48,
          ),
        ),
      ),
    );
  }

  Widget _buildReceiptCard() {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: AppTheme.surfaceColor,
        borderRadius: BorderRadius.circular(AppTheme.borderRadiusLarge),
        border: Border.all(color: AppTheme.outlineColor),
      ),
      child: Column(
        children: [
          _buildReceiptRow('Submission ID', '#AES-98234-X'),
          const Padding(
            padding: EdgeInsets.symmetric(vertical: 16),
            child: Divider(height: 1, color: AppTheme.outlineColor),
          ),
          _buildReceiptRow('Date', 'Oct 24, 2023'),
          const SizedBox(height: 12),
          _buildReceiptRow('Time', '11:15 AM'),
          const SizedBox(height: 12),
          _buildReceiptRow('Status', 'VERIFIED', color: AppTheme.successColor),
        ],
      ),
    );
  }

  Widget _buildReceiptRow(String label, String value, {Color? color}) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          label,
          style: const TextStyle(
            fontSize: 13,
            color: AppTheme.textSecondary,
            fontWeight: FontWeight.w500,
          ),
        ),
        Text(
          value,
          style: TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w700,
            color: color ?? AppTheme.textPrimary,
          ),
        ),
      ],
    );
  }
}
