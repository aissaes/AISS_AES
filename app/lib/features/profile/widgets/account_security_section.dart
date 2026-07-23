import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/app_theme.dart';
import '../../auth/providers/auth_provider.dart';
import '../../../shared/dialogs/confirmation_dialog.dart';

class AccountSecuritySection extends ConsumerWidget {
  const AccountSecuritySection({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authNotifier = ref.read(authProvider.notifier);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'ACCOUNT & SECURITY',
          style: TextStyle(
            fontSize: 11,
            fontWeight: FontWeight.w900,
            color: AppTheme.primaryColor,
            letterSpacing: 1.2,
          ),
        ),
        const SizedBox(height: 16),
        Container(
          decoration: BoxDecoration(
            color: AppTheme.surfaceColor,
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: AppTheme.outlineColor.withValues(alpha: 0.12)),
            boxShadow: AppTheme.softShadow,
          ),
          child: Column(
            children: [
              ListTile(
                leading: Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: AppTheme.primaryColor.withValues(alpha: 0.08),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: const Icon(Icons.lock_reset_rounded, color: AppTheme.primaryColor, size: 20),
                ),
                title: const Text('Change Account Password', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                subtitle: const Text('Update your password securely', style: TextStyle(fontSize: 12, color: AppTheme.textSecondary)),
                trailing: const Icon(Icons.arrow_forward_ios_rounded, size: 14, color: AppTheme.textSecondary),
                onTap: () => context.push('/change-password'),
              ),
              const Divider(height: 1, indent: 60),
              ListTile(
                leading: Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: Colors.red.withValues(alpha: 0.08),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: const Icon(Icons.logout_rounded, color: Colors.red, size: 20),
                ),
                title: const Text('Log Out of Account', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: Colors.red)),
                subtitle: const Text('Sign out of your session on this device', style: TextStyle(fontSize: 12, color: AppTheme.textSecondary)),
                onTap: () async {
                  final confirm = await ConfirmationDialog.show(
                    context,
                    title: 'Sign Out?',
                    message: 'Are you sure you want to sign out of AISS AES?',
                    type: ConfirmationDialogType.danger,
                    confirmText: 'Log Out',
                    icon: Icons.logout_rounded,
                  );
                  if (confirm && context.mounted) {
                    await authNotifier.logout();
                  }
                },
              ),
            ],
          ),
        ),
      ],
    );
  }
}
