import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:package_info_plus/package_info_plus.dart';

import '../../../core/theme/app_theme.dart';
import '../../../shared/widgets/app_logo.dart';
import '../../../shared/widgets/app_loading_indicator.dart';
import '../../../core/models/student_model.dart';

import '../services/student_service.dart';
import '../providers/profile_provider.dart';

import '../widgets/profile_header_card.dart';
import '../widgets/academic_passport_card.dart';
import '../widgets/account_security_section.dart';

final versionStringProvider = FutureProvider<String>((ref) async {
  try {
    final packageInfo = await PackageInfo.fromPlatform();
    return 'Version ${packageInfo.version} (Build ${packageInfo.buildNumber})';
  } catch (e) {
    return 'Version 1.1.0 (Build 3)';
  }
});

class ProfileScreen extends ConsumerWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final profileAsync = ref.watch(studentProfileProvider);
    final cachedProfile = ref.watch(studentServiceProvider).getCachedProfile();

    return PopScope(
      canPop: Navigator.of(context).canPop(),
      onPopInvokedWithResult: (didPop, result) async {
        if (didPop) return;
        if (context.mounted) {
          try {
            StatefulNavigationShell.of(context).goBranch(0);
          } catch (_) {}
        }
      },
      child: Scaffold(
        backgroundColor: AppTheme.backgroundColor,
        body: SafeArea(
          child: Center(
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 600),
              child: CustomScrollView(
                slivers: [
                  _buildAppBar(context),
                  SliverPadding(
                    padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
                    sliver: SliverList(
                      delegate: SliverChildListDelegate([
                        profileAsync.when(
                          loading: () => const Center(
                            child: Padding(
                              padding: EdgeInsets.symmetric(vertical: 40),
                              child: AppLoadingIndicator(size: 50, logoSize: 24),
                            ),
                          ),
                          error: (err, stack) {
                            if (cachedProfile != null) {
                              return _buildProfileContent(context, ref, cachedProfile, isCached: true);
                            }
                            return _buildUnavailableState(context);
                          },
                          data: (profile) => _buildProfileContent(context, ref, profile),
                        ),
                      ]),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildAppBar(BuildContext context) {
    return SliverAppBar(
      floating: true,
      backgroundColor: AppTheme.backgroundColor.withValues(alpha: 0.8),
      surfaceTintColor: Colors.transparent,
      leading: const Padding(
        padding: EdgeInsets.all(12.0),
        child: AppLogo(size: 24),
      ),
      title: const Text(
        'Student Profile',
        style: TextStyle(fontWeight: FontWeight.w800, fontSize: 18),
      ),
    );
  }

  Widget _buildProfileContent(
    BuildContext context,
    WidgetRef ref,
    StudentModel student, {
    bool isCached = false,
  }) {
    final versionAsync = ref.watch(versionStringProvider);

    return Column(
      children: [
        ProfileHeaderCard(student: student, isCached: isCached),
        const SizedBox(height: 28),
        AcademicPassportCard(student: student),
        const SizedBox(height: 28),
        const AccountSecuritySection(),
        const SizedBox(height: 24),
        Center(
          child: versionAsync.when(
            data: (version) => Text(
              version,
              style: const TextStyle(
                fontSize: 11,
                color: AppTheme.textSecondary,
                fontWeight: FontWeight.w500,
              ),
            ),
            loading: () => const SizedBox(height: 14),
            error: (err, stack) => const Text(
              'Version 1.1.0 (Build 3)',
              style: TextStyle(
                fontSize: 11,
                color: AppTheme.textSecondary,
                fontWeight: FontWeight.w500,
              ),
            ),
          ),
        ),
        const SizedBox(height: 120),
      ],
    );
  }

  Widget _buildUnavailableState(BuildContext context) {
    return const Center(
      child: Padding(
        padding: EdgeInsets.symmetric(vertical: 40),
        child: Column(
          children: [
            Icon(Icons.person_off_rounded, size: 60, color: Colors.grey),
            SizedBox(height: 16),
            Text(
              'Profile Data Unavailable',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            SizedBox(height: 8),
            Text(
              'Unable to retrieve student details offline.',
              style: TextStyle(color: AppTheme.textSecondary),
            ),
          ],
        ),
      ),
    );
  }
}
