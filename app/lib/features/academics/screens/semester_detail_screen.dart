import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/models/course_summary_model.dart';
import '../../../core/models/timetable_category_model.dart';
import '../providers/academics_providers.dart';

class SemesterDetailScreen extends ConsumerStatefulWidget {
  final String semesterId;

  const SemesterDetailScreen({
    required this.semesterId,
    super.key,
  });

  @override
  ConsumerState<SemesterDetailScreen> createState() => _SemesterDetailScreenState();
}

class _SemesterDetailScreenState extends ConsumerState<SemesterDetailScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final coursesAsync = ref.watch(coursesProvider(widget.semesterId));
    final timetableAsync = ref.watch(timetableProvider(widget.semesterId));

    return Scaffold(
      backgroundColor: AppTheme.backgroundColor,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_rounded, color: AppTheme.textPrimary),
          onPressed: () => context.pop(),
        ),
        title: Text(
          'Semester Progress',
          style: Theme.of(context).textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.bold,
                color: AppTheme.textPrimary,
              ),
        ),
      ),
      body: Column(
        children: [
          // View Mode Switcher
          Container(
            margin: const EdgeInsets.symmetric(horizontal: 20.0, vertical: 8.0),
            padding: const EdgeInsets.all(4.0),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(AppTheme.borderRadiusLarge),
              border: Border.all(color: AppTheme.outlineVariant.withValues(alpha: 0.5)),
            ),
            child: TabBar(
              controller: _tabController,
              indicator: BoxDecoration(
                color: AppTheme.primaryColor,
                borderRadius: BorderRadius.circular(AppTheme.borderRadiusMedium),
              ),
              indicatorSize: TabBarIndicatorSize.tab,
              labelColor: Colors.white,
              unselectedLabelColor: AppTheme.textSecondary,
              labelStyle: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
              unselectedLabelStyle: const TextStyle(fontWeight: FontWeight.w500, fontSize: 13),
              dividerColor: Colors.transparent,
              tabs: const [
                Tab(text: 'COURSES MODE'),
                Tab(text: 'TIMETABLE MODE'),
              ],
            ),
          ),
          const SizedBox(height: 12),

          Expanded(
            child: TabBarView(
              controller: _tabController,
              children: [
                // Courses Mode
                coursesAsync.when(
                  data: (courses) => _buildCoursesList(courses),
                  loading: () => const Center(child: CircularProgressIndicator()),
                  error: (err, stack) => _buildErrorWidget(err, () => ref.refresh(coursesProvider(widget.semesterId).future)),
                ),

                // Timetable Mode
                timetableAsync.when(
                  data: (categories) => _buildTimetableList(categories),
                  loading: () => const Center(child: CircularProgressIndicator()),
                  error: (err, stack) => _buildErrorWidget(err, () => ref.refresh(timetableProvider(widget.semesterId).future)),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildCoursesList(List<CourseSummaryModel> courses) {
    if (courses.isEmpty) {
      return const Center(child: Text('No courses found for this semester.'));
    }
    return ListView.builder(
      padding: const EdgeInsets.symmetric(horizontal: 20.0),
      itemCount: courses.length,
      itemBuilder: (context, index) {
        final course = courses[index];
        return Container(
          margin: const EdgeInsets.only(bottom: 16),
          decoration: BoxDecoration(
            color: AppTheme.surfaceColor,
            borderRadius: BorderRadius.circular(AppTheme.borderRadius2XL),
            boxShadow: AppTheme.softShadow,
          ),
          child: InkWell(
            onTap: () {
              context.push('/academics/course/${course.courseId}');
            },
            borderRadius: BorderRadius.circular(AppTheme.borderRadius2XL),
            child: Padding(
              padding: const EdgeInsets.all(18.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: AppTheme.primaryColor.withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Text(
                          course.courseCode,
                          style: const TextStyle(
                            color: AppTheme.primaryColor,
                            fontSize: 12,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                      Text(
                        '${course.credits} Credits',
                        style: const TextStyle(
                          color: AppTheme.textSecondary,
                          fontSize: 12,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),
                  Text(
                    course.courseName,
                    style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                      color: AppTheme.textPrimary,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      const Icon(Icons.person_outline_rounded, size: 14, color: AppTheme.outlineColor),
                      const SizedBox(width: 4),
                      Text(
                        course.facultyName,
                        style: const TextStyle(
                          fontSize: 12,
                          color: AppTheme.textSecondary,
                        ),
                      ),
                    ],
                  ),
                  const Divider(height: 24, thickness: 0.7),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      _MiniStatItem(
                        label: 'Completed',
                        value: '${course.completedExams}',
                        color: AppTheme.successColor,
                      ),
                      _MiniStatItem(
                        label: 'Upcoming',
                        value: '${course.upcomingExams}',
                        color: AppTheme.primaryColor,
                      ),
                      _MiniStatItem(
                        label: 'Missed',
                        value: '${course.missedExams}',
                        color: course.missedExams > 0 ? AppTheme.errorColor : AppTheme.textSecondary,
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }

  Widget _buildTimetableList(List<TimetableCategoryModel> categories) {
    if (categories.isEmpty) {
      return const Center(child: Text('No timetable schedules found.'));
    }
    return ListView.builder(
      padding: const EdgeInsets.symmetric(horizontal: 20.0),
      itemCount: categories.length,
      itemBuilder: (context, index) {
        final cat = categories[index];
        IconData categoryIcon = Icons.event_note_rounded;
        Color accentColor = AppTheme.primaryColor;

        if (cat.code == 'END_SEM') {
          categoryIcon = Icons.quiz_rounded;
          accentColor = AppTheme.secondaryColor;
        } else if (cat.code == 'MID_SEM') {
          categoryIcon = Icons.assignment_rounded;
          accentColor = AppTheme.tertiaryColor;
        }

        return Container(
          margin: const EdgeInsets.only(bottom: 16),
          decoration: BoxDecoration(
            color: AppTheme.surfaceColor,
            borderRadius: BorderRadius.circular(AppTheme.borderRadius2XL),
            boxShadow: AppTheme.softShadow,
          ),
          child: InkWell(
            onTap: () {
              context.push('/academics/timetable/${cat.categoryId}?semId=${widget.semesterId}');
            },
            borderRadius: BorderRadius.circular(AppTheme.borderRadius2XL),
            child: Padding(
              padding: const EdgeInsets.all(18.0),
              child: Row(
                children: [
                  Container(
                    width: 48,
                    height: 48,
                    decoration: BoxDecoration(
                      color: accentColor.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Icon(categoryIcon, color: accentColor, size: 24),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          cat.categoryName,
                          style: const TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.bold,
                            color: AppTheme.textPrimary,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          '${cat.examCount} Subjects Scheduled',
                          style: const TextStyle(
                            fontSize: 12,
                            color: AppTheme.textSecondary,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const Icon(Icons.arrow_forward_ios_rounded, size: 14, color: AppTheme.outlineColor),
                ],
              ),
            ),
          ),
        );
      },
    );
  }

  Widget _buildErrorWidget(Object err, VoidCallback onRetry) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(20.0),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.error_outline_rounded, size: 48, color: AppTheme.errorColor),
            const SizedBox(height: 12),
            const Text(
              'Failed to load details.',
              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
            ),
            const SizedBox(height: 8),
            Text(err.toString(), textAlign: TextAlign.center, style: const TextStyle(fontSize: 12)),
            const SizedBox(height: 16),
            ElevatedButton(
              onPressed: onRetry,
              child: const Text('Retry'),
            ),
          ],
        ),
      ),
    );
  }
}

class _MiniStatItem extends StatelessWidget {
  final String label;
  final String value;
  final Color color;

  const _MiniStatItem({
    required this.label,
    required this.value,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: const TextStyle(
            fontSize: 11,
            color: AppTheme.textSecondary,
          ),
        ),
        const SizedBox(height: 2),
        Row(
          children: [
            Container(
              width: 6,
              height: 6,
              decoration: BoxDecoration(
                color: color,
                shape: BoxShape.circle,
              ),
            ),
            const SizedBox(width: 6),
            Text(
              value,
              style: const TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.bold,
                color: AppTheme.textPrimary,
              ),
            ),
          ],
        ),
      ],
    );
  }
}
