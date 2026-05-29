import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../auth/providers/auth_provider.dart';
import '../../../core/theme/app_theme.dart';
import '../../../shared/widgets/primary_button.dart';
import '../../../core/repositories/student_repository.dart';

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
                            child: CircularProgressIndicator(),
                          ),
                        ),
                        error: (err, stack) {
                          if (cachedProfile != null) {
                            return _buildProfileContent(context, ref, cachedProfile, isCached: true);
                          }
                          return _buildUnavailableState();
                        },
                        data: (profile) => _buildProfileContent(context, ref, profile),
                      ),
                      
                      const SizedBox(height: 32),
                      PrimaryButton(
                        text: 'Logout',
                        onPressed: () => ref.read(authProvider.notifier).logout(),
                        backgroundColor: AppTheme.errorColor.withValues(alpha: 0.1),
                        textColor: AppTheme.errorColor,
                        icon: Icons.logout_rounded,
                      ),
                      const SizedBox(height: 120), // Bottom padding for floating nav
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
    final String department = (student['departments'] is List && (student['departments'] as List).isNotEmpty)
        ? (student['departments'] as List).join(', ')
        : (student['department'] ?? 'N/A');
    final String course = (student['courses'] is List && (student['courses'] as List).isNotEmpty)
        ? (student['courses'] as List).map((c) => c is Map ? (c['courseCode'] ?? c['courseName'] ?? '') : c.toString()).where((s) => s.isNotEmpty).join(', ')
        : (student['course'] ?? 'N/A');
    final String semester = student['semester'] is Map
        ? (student['semester']['semesterName'] ?? 'N/A')
        : (student['semester']?.toString() ?? 'N/A');
    final String cgpa = student['cgpa']?.toString() ?? 'N/A';
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
          value: '$course • $department',
          color: AppTheme.secondaryColor,
        ),
        const SizedBox(height: 12),
        _buildDetailCard(
          icon: Icons.calendar_month_outlined,
          title: 'Current Semester',
          value: semester.toLowerCase().contains('semester') ? semester : 'Semester $semester',
          color: Colors.orange,
        ),
        const SizedBox(height: 12),
        if (cgpa != 'N/A')
          _buildDetailCard(
            icon: Icons.stars_rounded,
            title: 'Cumulative GPA (CGPA)',
            value: cgpa,
            color: AppTheme.successColor,
          ),
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
                  style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 14, color: AppTheme.textPrimary),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildUnavailableState() {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 40, horizontal: 24),
      decoration: BoxDecoration(
        color: AppTheme.surfaceColor,
        borderRadius: BorderRadius.circular(AppTheme.borderRadiusLarge),
        border: Border.all(color: AppTheme.outlineColor.withValues(alpha: 0.15)),
      ),
      child: const Column(
        children: [
          Icon(
            Icons.account_circle_rounded,
            size: 64,
            color: AppTheme.outlineColor,
          ),
          SizedBox(height: 20),
          Text(
            'Profile information unavailable',
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.bold,
              color: AppTheme.textPrimary,
            ),
          ),
          SizedBox(height: 8),
          Text(
            'Connect to the university network or secure internet connection to sync student records.',
            textAlign: TextAlign.center,
            style: TextStyle(
              color: AppTheme.textSecondary,
              fontSize: 12,
              height: 1.5,
            ),
          ),
        ],
      ),
    );
  }
}
