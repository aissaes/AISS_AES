import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../auth/providers/auth_provider.dart';
import '../../../core/theme/app_theme.dart';
import '../../../shared/widgets/primary_button.dart';
import '../../../core/repositories/student_repository.dart';
import '../../../core/widgets/app_logo.dart';
import '../../../core/widgets/app_loading_indicator.dart';

final studentProfileProvider = FutureProvider<Map<String, dynamic>>((ref) async {
  final studentRepo = ref.watch(studentRepositoryProvider);
  return await studentRepo.getProfile();
});

class ProfileScreen extends ConsumerWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final profileAsync = ref.watch(studentProfileProvider);
    final cachedProfile = ref.watch(studentRepositoryProvider).getCachedProfile();

    return Scaffold(
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
                          return _buildUnavailableState(context, ref);
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
    Map<String, dynamic> student, 
    {bool isCached = false}
  ) {
    final String name = student['name'] ?? 'Student';
    final String email = student['email'] ?? 'N/A';
    final String rollNo = student['rollNumber'] ?? student['_id'] ?? 'N/A';
    
    // Robustly parse department
    final deptRaw = student['department'];
    final String department;
    if (student['departments'] is List && (student['departments'] as List).isNotEmpty) {
      department = (student['departments'] as List).join(', ');
    } else if (deptRaw is Map) {
      department = deptRaw['name'] ?? deptRaw['code'] ?? 'N/A';
    } else if (deptRaw is String && deptRaw.length == 24 && RegExp(r'^[0-9a-fA-F]{24}$').hasMatch(deptRaw)) {
      department = 'N/A';
    } else {
      department = deptRaw?.toString() ?? 'N/A';
    }

    // Robustly parse course
    final courseRaw = student['course'];
    final String course;
    if (student['courses'] is List && (student['courses'] as List).isNotEmpty) {
      course = (student['courses'] as List)
          .map((c) => c is Map ? (c['courseCode'] ?? c['courseName'] ?? '') : c.toString())
          .where((s) => s.isNotEmpty && !(s.length == 24 && RegExp(r'^[0-9a-fA-F]{24}$').hasMatch(s)))
          .join(', ');
    } else if (courseRaw is Map) {
      course = courseRaw['courseName'] ?? courseRaw['courseCode'] ?? 'N/A';
    } else if (courseRaw is String && courseRaw.length == 24 && RegExp(r'^[0-9a-fA-F]{24}$').hasMatch(courseRaw)) {
      course = 'N/A';
    } else {
      course = courseRaw?.toString() ?? 'N/A';
    }

    // Combine course and department details
    final String courseDeptDisplay;
    if (course != 'N/A' && department != 'N/A') {
      courseDeptDisplay = '$course • $department';
    } else if (course != 'N/A') {
      courseDeptDisplay = course;
    } else {
      courseDeptDisplay = department;
    }

    // Robustly parse semester
    final semesterRaw = student['semester'];
    final String semester;
    if (semesterRaw is Map) {
      semester = semesterRaw['semesterName'] ?? semesterRaw['semesterNumber']?.toString() ?? 'N/A';
    } else if (semesterRaw is String && semesterRaw.length == 24 && RegExp(r'^[0-9a-fA-F]{24}$').hasMatch(semesterRaw)) {
      semester = 'N/A';
    } else {
      semester = semesterRaw?.toString() ?? 'N/A';
    }

    final String collegeName = student['collegeId'] is Map
        ? (student['collegeId']['collegeName'] ?? 'N/A')
        : 'N/A';

    final initials = name.isNotEmpty
        ? name.split(' ').map((e) => e[0]).take(2).join('').toUpperCase()
        : 'S';

    return Column(
      children: [
        // Profile Header Avatar Card
        Container(
          width: 110,
          height: 110,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            border: Border.all(color: Colors.white, width: 4),
            boxShadow: AppTheme.premiumShadow,
            gradient: const LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [AppTheme.primaryColor, AppTheme.primaryContainer],
            ),
          ),
          child: Center(
            child: Text(
              initials,
              style: const TextStyle(
                fontSize: 32,
                fontWeight: FontWeight.w900,
                color: Colors.white,
                letterSpacing: -1,
              ),
            ),
          ),
        ),
        const SizedBox(height: 20),
        
        Text(
          name,
          textAlign: TextAlign.center,
          style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w900, letterSpacing: -0.5),
        ),
        const SizedBox(height: 4),
        Text(
          email,
          style: const TextStyle(color: AppTheme.textSecondary, fontSize: 14, fontWeight: FontWeight.w500),
        ),
        if (collegeName != 'N/A') ...[
          const SizedBox(height: 6),
          Text(
            collegeName.toUpperCase(),
            style: const TextStyle(
              color: AppTheme.primaryColor,
              fontSize: 11,
              fontWeight: FontWeight.w900,
              letterSpacing: 1,
            ),
          ),
        ],
        const SizedBox(height: 16),
        
        if (isCached)
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
            decoration: BoxDecoration(
              color: Colors.orange.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(100),
            ),
            child: const Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(Icons.offline_pin_rounded, color: Colors.orange, size: 14),
                SizedBox(width: 6),
                Text(
                  'Offline Cached Data',
                  style: TextStyle(
                    color: Colors.orange,
                    fontSize: 11,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ],
            ),
          ),
          
        const SizedBox(height: 32),
        
        // Detailed Information List
        const Align(
          alignment: Alignment.centerLeft,
          child: Text(
            'Academic details',
            style: TextStyle(fontSize: 15, fontWeight: FontWeight.w800, color: AppTheme.textSecondary, letterSpacing: 0.5),
          ),
        ),
        const SizedBox(height: 12),
        
        _buildDetailCard(
          icon: Icons.badge_outlined,
          title: 'Student ID / Roll No.',
          value: rollNo,
          color: AppTheme.primaryColor,
        ),
        const SizedBox(height: 12),
        _buildDetailCard(
          icon: Icons.school_outlined,
          title: 'Course & Department',
          value: courseDeptDisplay,
          color: AppTheme.secondaryColor,
        ),
        const SizedBox(height: 12),
        _buildDetailCard(
          icon: Icons.calendar_month_outlined,
          title: 'Current Semester',
          value: semester == 'N/A'
              ? 'N/A'
              : (semester.toLowerCase().contains('semester') ? semester : 'Semester $semester'),
          color: Colors.orange,
        ),
        const SizedBox(height: 32),
        
        // Action Buttons
        PrimaryButton(
          text: 'Change Password',
          onPressed: () => context.push('/change-password'),
          backgroundColor: AppTheme.primaryColor.withValues(alpha: 0.1),
          textColor: AppTheme.primaryColor,
          icon: Icons.key_rounded,
        ),
        const SizedBox(height: 12),
        PrimaryButton(
          text: 'Logout',
          onPressed: () => ref.read(authProvider.notifier).logout(),
          backgroundColor: AppTheme.errorColor.withValues(alpha: 0.1),
          textColor: AppTheme.errorColor,
          icon: Icons.logout_rounded,
        ),
        const SizedBox(height: 120), // Bottom padding for floating nav
      ],
    );
  }

  Widget _buildDetailCard({
    required IconData icon,
    required String title,
    required String value,
    required Color color,
  }) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppTheme.surfaceColor,
        borderRadius: BorderRadius.circular(AppTheme.borderRadiusLarge),
        border: Border.all(color: AppTheme.outlineColor.withValues(alpha: 0.15)),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(icon, color: color, size: 20),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(color: AppTheme.textSecondary, fontSize: 11, fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 2),
                Text(
                  value,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 14, color: AppTheme.textPrimary),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildUnavailableState(BuildContext context, WidgetRef ref) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 40, horizontal: 24),
      decoration: BoxDecoration(
        color: AppTheme.surfaceColor,
        borderRadius: BorderRadius.circular(AppTheme.borderRadiusLarge),
        border: Border.all(color: AppTheme.outlineColor.withValues(alpha: 0.15)),
      ),
      child: Column(
        children: [
          const Icon(
            Icons.account_circle_rounded,
            size: 64,
            color: AppTheme.outlineColor,
          ),
          const SizedBox(height: 20),
          const Text(
            'Profile information unavailable',
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.bold,
              color: AppTheme.textPrimary,
            ),
          ),
          const SizedBox(height: 8),
          const Text(
            'Connect to the university network or secure internet connection to sync student records.',
            textAlign: TextAlign.center,
            style: TextStyle(
              color: AppTheme.textSecondary,
              fontSize: 12,
              height: 1.5,
            ),
          ),
          const SizedBox(height: 32),
          PrimaryButton(
            text: 'Logout',
            onPressed: () => ref.read(authProvider.notifier).logout(),
            backgroundColor: AppTheme.errorColor.withValues(alpha: 0.1),
            textColor: AppTheme.errorColor,
            icon: Icons.logout_rounded,
          ),
          const SizedBox(height: 80), // Bottom padding for floating nav inside container
        ],
      ),
    );
  }
}

