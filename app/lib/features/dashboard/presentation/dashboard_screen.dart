import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../auth/providers/auth_provider.dart';
import '../../exams/providers/exam_provider.dart';
import '../../exams/providers/student_results_provider.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/repositories/student_repository.dart';

class DashboardScreen extends ConsumerWidget {
  const DashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authState = ref.watch(authProvider);
    final activeExam = ref.watch(activeExamProvider);
    
    // Resolve actual cached student details for high-fidelity personalized experience
    final studentProfile = ref.watch(studentRepositoryProvider).getCachedProfile();
    final String displayName = studentProfile?['name'] ?? authState.userName ?? 'Student';
    
    return Scaffold(
      backgroundColor: AppTheme.backgroundColor,
      body: SafeArea(
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 600),
            child: CustomScrollView(
              slivers: [
                _buildAppBar(context, displayName),
                SliverPadding(
                  padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 24),
                  sliver: SliverList(
                    delegate: SliverChildListDelegate([
                      _buildHeader(context, displayName),
                      const SizedBox(height: 16),
                      _buildAcademicCard(context, studentProfile),
                      const SizedBox(height: 32),
                      
                      // Dynamic Section: Unlocked Active Exam Script Checklist
                      if (activeExam != null) ...[
                        _buildSectionHeader(
                          context,
                          title: 'Active Examination',
                          actionText: 'View Details',
                          onActionTap: () => context.go('/exams'),
                        ),
                        const SizedBox(height: 16),
                        _buildActiveExamCard(context, activeExam),
                        const SizedBox(height: 32),
                      ],

                      // Grid of Quick Actions
                      _buildSectionDivider('QUICK ACTIONS'),
                      const SizedBox(height: 20),
                      _buildQuickActionsGrid(context, activeExam != null),
                      const SizedBox(height: 32),
                      if (studentProfile != null) ...[
                        _buildEnrolledCoursesList(context, studentProfile),
                        const SizedBox(height: 32),
                      ],

                      // If no active exam, render timetable and upcoming exams overview
                      if (activeExam == null) ...[
                        _buildSectionDivider('TIMETABLE & UPCOMING EXAMS'),
                        const SizedBox(height: 16),
                        ref.watch(studentTimetableAndExamsProvider).when(
                          data: (data) {
                            final List<dynamic> exams = data['exams'] ?? [];
                            if (exams.isEmpty) {
                              return _buildEmptyState(context, displayName);
                            }
                            
                            // Let's filter upcoming exams (where date is in the future or today)
                            final now = DateTime.now();
                            final today = DateTime(now.year, now.month, now.day);
                            final upcomingExams = exams.where((exam) {
                              if (exam['date'] == null) return false;
                              final examDate = DateTime.parse(exam['date']);
                              return examDate.isAfter(today) || examDate.isAtSameMomentAs(today);
                            }).toList();
                            
                            if (upcomingExams.isEmpty) {
                              return _buildEmptyState(context, displayName);
                            }
                            
                            return ListView.separated(
                              shrinkWrap: true,
                              physics: const NeverScrollableScrollPhysics(),
                              itemCount: upcomingExams.length.clamp(0, 3), // Show max 3
                              separatorBuilder: (context, index) => const SizedBox(height: 12),
                              itemBuilder: (context, index) {
                                final exam = upcomingExams[index];
                                final dateStr = DateTime.parse(exam['date']).toLocal().toString().split(' ').first;
                                final subjectName = exam['subjectName'] ?? 'Subject';
                                final subjectCode = exam['subjectCode'] ?? 'Code';
                                final examType = exam['examType'] ?? 'Exam';
                                
                                return Container(
                                  padding: const EdgeInsets.all(16),
                                  decoration: BoxDecoration(
                                    color: AppTheme.surfaceColor,
                                    borderRadius: BorderRadius.circular(AppTheme.borderRadiusMedium),
                                    border: Border.all(color: AppTheme.outlineColor.withValues(alpha: 0.15)),
                                  ),
                                  child: Row(
                                    children: [
                                      Container(
                                        padding: const EdgeInsets.all(10),
                                        decoration: BoxDecoration(
                                          color: AppTheme.primaryColor.withValues(alpha: 0.1),
                                          shape: BoxShape.circle,
                                        ),
                                        child: const Icon(
                                          Icons.calendar_today_rounded,
                                          color: AppTheme.primaryColor,
                                          size: 20,
                                        ),
                                      ),
                                      const SizedBox(width: 16),
                                      Expanded(
                                        child: Column(
                                          crossAxisAlignment: CrossAxisAlignment.start,
                                          children: [
                                            Text(
                                              subjectName,
                                              style: const TextStyle(
                                                fontWeight: FontWeight.w700,
                                                fontSize: 14,
                                                color: AppTheme.textPrimary,
                                              ),
                                            ),
                                            const SizedBox(height: 4),
                                            Text(
                                              '$subjectCode • $examType',
                                              style: const TextStyle(
                                                color: AppTheme.textSecondary,
                                                fontSize: 12,
                                              ),
                                            ),
                                          ],
                                        ),
                                      ),
                                      Column(
                                        crossAxisAlignment: CrossAxisAlignment.end,
                                        children: [
                                          Text(
                                            dateStr,
                                            style: const TextStyle(
                                              fontWeight: FontWeight.bold,
                                              fontSize: 13,
                                              color: AppTheme.primaryColor,
                                            ),
                                          ),
                                          const SizedBox(height: 4),
                                          const Text(
                                            'Upcoming',
                                            style: TextStyle(
                                              color: AppTheme.textSecondary,
                                              fontSize: 11,
                                            ),
                                          ),
                                        ],
                                      ),
                                    ],
                                  ),
                                );
                              },
                            );
                          },
                          loading: () => const Center(
                            child: Padding(
                              padding: EdgeInsets.all(24.0),
                              child: CircularProgressIndicator(),
                            ),
                          ),
                          error: (err, stack) => Center(
                            child: Padding(
                              padding: const EdgeInsets.all(24.0),
                              child: Text(
                                'Error loading schedule: $err',
                                style: const TextStyle(color: Colors.red),
                              ),
                            ),
                          ),
                        ),
                      ],
                      
                      const SizedBox(height: 120), // Bottom padding for floating navigation bar
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

  Widget _buildAppBar(BuildContext context, String name) {
    final initials = name.isNotEmpty
        ? name.split(' ').map((e) => e[0]).take(2).join('').toUpperCase()
        : 'S';

    return SliverAppBar(
      floating: true,
      backgroundColor: AppTheme.backgroundColor.withValues(alpha: 0.8),
      surfaceTintColor: Colors.transparent,
      flexibleSpace: ClipRect(
        child: BackdropFilter(
          filter: ImageFilter.blur(sigmaX: 10, sigmaY: 10),
          child: Container(color: Colors.transparent),
        ),
      ),
      leading: Padding(
        padding: const EdgeInsets.only(left: 20.0),
        child: Center(
          child: CircleAvatar(
            radius: 18,
            backgroundColor: AppTheme.primaryColor.withValues(alpha: 0.1),
            child: Text(
              initials,
              style: const TextStyle(
                color: AppTheme.primaryColor,
                fontSize: 12,
                fontWeight: FontWeight.w800,
              ),
            ),
          ),
        ),
      ),
      title: const Text(
        'AISS AES',
        style: TextStyle(
          fontWeight: FontWeight.w900,
          color: AppTheme.primaryColor,
          fontSize: 18,
          letterSpacing: -0.5,
        ),
      ),
      actions: const [
        Icon(Icons.verified_user_rounded, color: AppTheme.successColor, size: 20),
        SizedBox(width: 24),
      ],
    );
  }

  Widget _buildHeader(BuildContext context, String displayName) {
    final firstName = displayName.split(' ').first;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Welcome, $firstName 👋',
          style: Theme.of(context).textTheme.displayLarge?.copyWith(
            fontSize: 28,
            fontWeight: FontWeight.w900,
            letterSpacing: -0.5,
          ),
        ),
        const SizedBox(height: 4),
        const Text(
          'University Script Scanning & Evaluation Portal',
          style: TextStyle(
            color: AppTheme.textSecondary,
            fontSize: 14,
            fontWeight: FontWeight.w500,
          ),
        ),
      ],
    );
  }

  Widget _buildSectionHeader(BuildContext context, {required String title, required String actionText, required VoidCallback onActionTap}) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          title,
          style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppTheme.textPrimary),
        ),
        TextButton(
          onPressed: onActionTap,
          style: TextButton.styleFrom(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            minimumSize: Size.zero,
            tapTargetSize: MaterialTapTargetSize.shrinkWrap,
          ),
          child: Text(actionText),
        ),
      ],
    );
  }

  Widget _buildActiveExamCard(BuildContext context, Map<String, dynamic> exam) {
    final subjectName = exam['subjectName'] ?? 'Examination';
    final subjectCode = exam['subjectCode'] ?? 'CODE';
    final examType = exam['examType'] ?? 'Exam';
    
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: AppTheme.surfaceColor,
        borderRadius: BorderRadius.circular(AppTheme.borderRadiusLarge),
        boxShadow: AppTheme.premiumShadow,
        border: Border.all(color: AppTheme.successColor.withValues(alpha: 0.2), width: 1.5),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: AppTheme.successColor.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: const Text(
                  'LIVE & UNLOCKED',
                  style: TextStyle(
                    color: AppTheme.successColor,
                    fontSize: 9,
                    fontWeight: FontWeight.w900,
                    letterSpacing: 0.5,
                  ),
                ),
              ),
              const Spacer(),
              Text(
                subjectCode,
                style: const TextStyle(color: AppTheme.textSecondary, fontSize: 12, fontWeight: FontWeight.bold),
              ),
            ],
          ),
          const SizedBox(height: 16),
          Text(
            subjectName,
            style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 20, color: AppTheme.textPrimary),
          ),
          const SizedBox(height: 4),
          Text(
            examType,
            style: const TextStyle(color: AppTheme.textSecondary, fontSize: 13),
          ),
          const SizedBox(height: 20),
          ElevatedButton.icon(
            onPressed: () => context.go('/exams'),
            icon: const Icon(Icons.document_scanner_rounded, size: 18),
            label: const Text('Open Script Checklists'),
            style: ElevatedButton.styleFrom(
              backgroundColor: AppTheme.primaryColor,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppTheme.borderRadiusMedium)),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildQuickActionsGrid(BuildContext context, bool hasActiveExam) {
    return GridView.count(
      crossAxisCount: 2,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      crossAxisSpacing: 16,
      mainAxisSpacing: 16,
      childAspectRatio: 1.4,
      children: [
        _buildActionCard(
          context,
          icon: Icons.qr_code_scanner_rounded,
          title: 'Scan Paper',
          subtitle: 'Submit scripts',
          color: const Color(0xFFE8EAF6),
          iconColor: AppTheme.primaryColor,
          onTap: () {
            if (hasActiveExam) {
              context.go('/exams');
            } else {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(
                  content: Text('Please unlock an active exam with a token first under the Exams tab.'),
                  behavior: SnackBarBehavior.floating,
                ),
              );
            }
          },
        ),
        _buildActionCard(
          context,
          icon: Icons.checklist_rounded,
          title: 'Timetables',
          subtitle: 'Exams schedule',
          color: const Color(0xFFE0F2F1),
          iconColor: Colors.teal,
          onTap: () => context.go('/exams'),
        ),
        _buildActionCard(
          context,
          icon: Icons.history_edu_rounded,
          title: 'Results',
          subtitle: 'Academic grades',
          color: const Color(0xFFFFF3E0),
          iconColor: Colors.orange,
          onTap: () {
            context.push('/results');
          },
        ),
        _buildActionCard(
          context,
          icon: Icons.account_circle_outlined,
          title: 'My Profile',
          subtitle: 'Roll ID & Branch',
          color: const Color(0xFFFCE4EC),
          iconColor: Colors.pink,
          onTap: () => context.go('/profile'),
        ),
      ],
    );
  }

  Widget _buildActionCard(
    BuildContext context, {
    required IconData icon,
    required String title,
    required String subtitle,
    required Color color,
    required Color iconColor,
    required VoidCallback onTap,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: color,
          borderRadius: BorderRadius.circular(AppTheme.borderRadiusLarge),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, size: 28, color: iconColor),
            const SizedBox(height: 12),
            Text(
              title,
              style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 15, color: AppTheme.textPrimary),
            ),
            const SizedBox(height: 2),
            Text(
              subtitle,
              style: TextStyle(color: AppTheme.textSecondary.withValues(alpha: 0.7), fontSize: 11, fontWeight: FontWeight.w500),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildEmptyState(BuildContext context, String studentName) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 32, horizontal: 20),
      decoration: BoxDecoration(
        color: AppTheme.surfaceColor,
        borderRadius: BorderRadius.circular(AppTheme.borderRadiusLarge),
        border: Border.all(color: AppTheme.outlineColor.withValues(alpha: 0.15)),
      ),
      child: Column(
        children: [
          Icon(
            Icons.task_alt_rounded,
            size: 56,
            color: AppTheme.primaryColor.withValues(alpha: 0.4),
          ),
          const SizedBox(height: 20),
          Text(
            'Welcome, $studentName',
            style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: AppTheme.textPrimary),
          ),
          const SizedBox(height: 8),
          const Text(
            'No exams active or unlocked yet.\nTap Scan to submit your first paper.',
            textAlign: TextAlign.center,
            style: TextStyle(
              color: AppTheme.textSecondary,
              fontSize: 13,
              height: 1.5,
            ),
          ),
          const SizedBox(height: 24),
          ElevatedButton(
            onPressed: () => context.go('/exams'),
            style: ElevatedButton.styleFrom(
              minimumSize: const Size(200, 48),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppTheme.borderRadiusMedium)),
            ),
            child: const Text('Unlock Exam with Token'),
          ),
        ],
      ),
    );
  }

  Widget _buildSectionDivider(String label) {
    return Row(
      children: [
        Text(
          label,
          style: const TextStyle(
            fontSize: 10,
            fontWeight: FontWeight.w900,
            color: AppTheme.textSecondary,
            letterSpacing: 1,
          ),
        ),
        const SizedBox(width: 16),
        const Expanded(child: Divider(color: AppTheme.outlineColor, height: 1)),
      ],
    );
  }

  Widget _buildAcademicCard(BuildContext context, Map<String, dynamic>? student) {
    if (student == null) return const SizedBox.shrink();

    final String department = (student['departments'] is List && (student['departments'] as List).isNotEmpty)
        ? (student['departments'] as List).join(', ')
        : (student['department'] ?? 'N/A');
    final String semester = student['semester'] is Map
        ? (student['semester']['semesterName'] ?? 'N/A')
        : (student['semester']?.toString() ?? 'N/A');
    final String collegeName = student['collegeId'] is Map
        ? (student['collegeId']['collegeName'] ?? 'N/A')
        : 'N/A';

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(AppTheme.borderRadiusLarge),
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            AppTheme.primaryColor,
            AppTheme.primaryContainer,
          ],
        ),
        boxShadow: [
          BoxShadow(
            color: AppTheme.primaryColor.withValues(alpha: 0.3),
            blurRadius: 20,
            offset: const Offset(0, 10),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                semester.toUpperCase(),
                style: const TextStyle(
                  color: Colors.white70,
                  fontSize: 11,
                  fontWeight: FontWeight.w900,
                  letterSpacing: 1.5,
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(100),
                ),
                child: const Row(
                  children: [
                    Icon(
                      Icons.shield_rounded,
                      color: Colors.white,
                      size: 12,
                    ),
                    SizedBox(width: 4),
                    Text(
                      'VERIFIED STUDENT',
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 9,
                        fontWeight: FontWeight.w800,
                        letterSpacing: 0.5,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          Text(
            department,
            style: const TextStyle(
              color: Colors.white,
              fontSize: 22,
              fontWeight: FontWeight.w900,
              letterSpacing: -0.5,
            ),
          ),
          if (collegeName != 'N/A') ...[
            const SizedBox(height: 6),
            Text(
              collegeName.toUpperCase(),
              style: const TextStyle(
                color: Colors.white70,
                fontSize: 11,
                fontWeight: FontWeight.w600,
                letterSpacing: 0.5,
              ),
            ),
          ],
          const SizedBox(height: 24),
          Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'STUDENT ID',
                      style: TextStyle(
                        color: Colors.white54,
                        fontSize: 10,
                        fontWeight: FontWeight.bold,
                        letterSpacing: 0.5,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      student['rollNumber'] ?? student['_id'] ?? 'N/A',
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 14,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                  ],
                ),
              ),
              if (student['cgpa'] != null)
                Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    const Text(
                      'CURR. CGPA',
                      style: TextStyle(
                        color: Colors.white54,
                        fontSize: 10,
                        fontWeight: FontWeight.bold,
                        letterSpacing: 0.5,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      student['cgpa'].toString(),
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 16,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                  ],
                ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildEnrolledCoursesList(BuildContext context, Map<String, dynamic> student) {
    final List<dynamic> courses = student['courses'] ?? [];
    
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _buildSectionDivider('ENROLLED COURSES'),
        const SizedBox(height: 20),
        if (courses.isEmpty)
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: AppTheme.surfaceColor,
              borderRadius: BorderRadius.circular(AppTheme.borderRadiusMedium),
              border: Border.all(color: AppTheme.outlineColor.withValues(alpha: 0.15)),
            ),
            child: const Center(
              child: Text(
                'No courses enrolled for this semester.',
                style: TextStyle(
                  color: AppTheme.textSecondary,
                  fontSize: 13,
                ),
              ),
            ),
          )
        else
          ListView.separated(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: courses.length,
            separatorBuilder: (context, index) => const SizedBox(height: 12),
            itemBuilder: (context, index) {
              final course = courses[index];
              final String courseName = course['courseName'] ?? 'Course';
              final String courseCode = course['courseCode'] ?? 'CODE';
              final int credits = course['credits'] ?? 3;
              final faculty = course['assignedFaculty'];
              final String facultyName = faculty != null ? faculty['name'] ?? 'Assigned Faculty' : 'No Instructor Assigned';

              return Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: AppTheme.surfaceColor,
                  borderRadius: BorderRadius.circular(AppTheme.borderRadiusLarge),
                  border: Border.all(color: AppTheme.outlineColor.withValues(alpha: 0.15)),
                  boxShadow: AppTheme.softShadow,
                ),
                child: Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: AppTheme.primaryColor.withValues(alpha: 0.08),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: const Icon(
                        Icons.book_outlined,
                        color: AppTheme.primaryColor,
                        size: 22,
                      ),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                decoration: BoxDecoration(
                                  color: AppTheme.primaryColor.withValues(alpha: 0.1),
                                  borderRadius: BorderRadius.circular(4),
                                ),
                                child: Text(
                                  courseCode,
                                  style: const TextStyle(
                                    color: AppTheme.primaryColor,
                                    fontSize: 10,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                              ),
                              const SizedBox(width: 8),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                decoration: BoxDecoration(
                                  color: Colors.teal.withValues(alpha: 0.1),
                                  borderRadius: BorderRadius.circular(4),
                                ),
                                child: Text(
                                  '$credits Credits',
                                  style: const TextStyle(
                                    color: Colors.teal,
                                    fontSize: 10,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 6),
                          Text(
                            courseName,
                            style: const TextStyle(
                              fontWeight: FontWeight.w800,
                              fontSize: 15,
                              color: AppTheme.textPrimary,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Row(
                            children: [
                              Icon(
                                Icons.person_outline_rounded,
                                size: 13,
                                color: AppTheme.textSecondary.withValues(alpha: 0.7),
                              ),
                              const SizedBox(width: 4),
                              Expanded(
                                child: Text(
                                  facultyName,
                                  style: TextStyle(
                                    color: AppTheme.textSecondary.withValues(alpha: 0.8),
                                    fontSize: 12,
                                    fontWeight: FontWeight.w500,
                                  ),
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              );
            },
          ),
      ],
    );
  }
}
