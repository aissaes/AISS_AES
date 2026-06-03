import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/models/semester_model.dart';
import '../providers/academics_providers.dart';

class AcademicsScreen extends ConsumerStatefulWidget {
  const AcademicsScreen({super.key});

  @override
  ConsumerState<AcademicsScreen> createState() => _AcademicsScreenState();
}

class _AcademicsScreenState extends ConsumerState<AcademicsScreen> with WidgetsBindingObserver {
  final TextEditingController _searchController = TextEditingController();
  String _searchQuery = '';

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _searchController.dispose();
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      ref.invalidate(semestersProvider);
    }
  }

  @override
  Widget build(BuildContext context) {
    final semestersAsync = ref.watch(semestersProvider);

    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, result) async {
        if (didPop) return;
        if (context.mounted) {
          try {
            StatefulNavigationShell.of(context).goBranch(0);
          } catch (e) {
            debugPrint('Error navigating to Dashboard branch: $e');
          }
        }
      },
      child: Scaffold(
        backgroundColor: AppTheme.backgroundColor,
        body: SafeArea(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const SizedBox(height: 20),
                Text(
                  'Academics',
                  style: Theme.of(context).textTheme.headlineLarge?.copyWith(
                        fontWeight: FontWeight.w800,
                        color: AppTheme.textPrimary,
                      ),
                ),
                const SizedBox(height: 4),
                Text(
                  'Explore academic history, courses, and exam details',
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        color: AppTheme.textSecondary,
                      ),
                ),
                const SizedBox(height: 20),
                
                // Global Search Bar
                TextField(
                  controller: _searchController,
                  onChanged: (val) {
                    setState(() {
                      _searchQuery = val.trim();
                    });
                  },
                  decoration: InputDecoration(
                    hintText: 'Search course code, faculty, exam type...',
                    prefixIcon: const Icon(Icons.search_rounded, color: AppTheme.outlineColor),
                    suffixIcon: _searchQuery.isNotEmpty
                        ? IconButton(
                            icon: const Icon(Icons.close_rounded, color: AppTheme.outlineColor),
                            onPressed: () {
                              _searchController.clear();
                              setState(() {
                                _searchQuery = '';
                              });
                            },
                          )
                        : null,
                  ),
                ),
                const SizedBox(height: 20),
  
                Expanded(
                  child: RefreshIndicator(
                    onRefresh: () => ref.refresh(semestersProvider.future),
                    child: semestersAsync.when(
                      data: (semesters) {
                        if (semesters.isEmpty) {
                          return const SingleChildScrollView(
                            physics: AlwaysScrollableScrollPhysics(parent: BouncingScrollPhysics()),
                            child: SizedBox(
                              height: 300,
                              child: Center(
                                child: Text('No academic records found.'),
                              ),
                            ),
                          );
                        }

                        if (_searchQuery.isNotEmpty) {
                          return ListView(
                            physics: const AlwaysScrollableScrollPhysics(parent: BouncingScrollPhysics()),
                            children: [
                              _buildSearchResults(semesters),
                            ],
                          );
                        }

                        return ListView.builder(
                          physics: const AlwaysScrollableScrollPhysics(parent: BouncingScrollPhysics()),
                          itemCount: semesters.length,
                          itemBuilder: (context, index) {
                            final semester = semesters[index];
                            return _SemesterCard(semester: semester);
                          },
                        );
                      },
                      loading: () => const SingleChildScrollView(
                        physics: AlwaysScrollableScrollPhysics(parent: BouncingScrollPhysics()),
                        child: SizedBox(
                          height: 300,
                          child: Center(
                            child: CircularProgressIndicator(),
                          ),
                        ),
                      ),
                      error: (err, stack) => SingleChildScrollView(
                        physics: const AlwaysScrollableScrollPhysics(parent: BouncingScrollPhysics()),
                        child: SizedBox(
                          height: 400,
                          child: Center(
                            child: Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                const Icon(Icons.error_outline_rounded, size: 48, color: AppTheme.errorColor),
                                const SizedBox(height: 12),
                                Text(
                                  'Failed to load academic records.',
                                  style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                                        fontWeight: FontWeight.bold,
                                      ),
                                ),
                                const SizedBox(height: 8),
                                Text(err.toString(), textAlign: TextAlign.center, style: const TextStyle(fontSize: 12)),
                                const SizedBox(height: 16),
                                ElevatedButton(
                                  onPressed: () => ref.refresh(semestersProvider.future),
                                  child: const Text('Retry'),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildSearchResults(List<SemesterModel> semesters) {
    // For local search results: we fetch courses and timetable categories for all loaded semesters.
    // However, since it is a global academic search, we can search matches inside courses and categories.
    return Consumer(
      builder: (context, ref, child) {
        // Query courses for semesters
        final List<Widget> results = [];
        final queryLower = _searchQuery.toLowerCase();

        for (final sem in semesters) {
          final coursesAsync = ref.watch(coursesProvider(sem.semesterId));
          final timetableAsync = ref.watch(timetableProvider(sem.semesterId));

          coursesAsync.whenData((courses) {
            final matches = courses.where((c) =>
                c.courseName.toLowerCase().contains(queryLower) ||
                c.courseCode.toLowerCase().contains(queryLower) ||
                c.facultyName.toLowerCase().contains(queryLower));

            for (final c in matches) {
              results.add(
                ListTile(
                  leading: const Icon(Icons.class_rounded, color: AppTheme.primaryColor),
                  title: Text(c.courseName),
                  subtitle: Text('${c.courseCode} • ${c.facultyName} (${sem.semesterName})'),
                  trailing: const Icon(Icons.arrow_forward_ios_rounded, size: 14),
                  onTap: () {
                    context.push('/academics/course/${c.courseId}');
                  },
                ),
              );
            }
          });

          timetableAsync.whenData((categories) {
            final matches = categories.where((cat) =>
                cat.categoryName.toLowerCase().contains(queryLower) ||
                cat.code.toLowerCase().contains(queryLower));

            for (final cat in matches) {
              results.add(
                ListTile(
                  leading: const Icon(Icons.event_note_rounded, color: AppTheme.secondaryColor),
                  title: Text(cat.categoryName),
                  subtitle: Text('Timetable Category • ${cat.examCount} Exams (${sem.semesterName})'),
                  trailing: const Icon(Icons.arrow_forward_ios_rounded, size: 14),
                  onTap: () {
                    context.push('/academics/timetable/${cat.categoryId}?semId=${sem.semesterId}');
                  },
                ),
              );
            }
          });
        }

        if (results.isEmpty) {
          return const Center(
            child: Text('No matching courses or timetable categories found.'),
          );
        }

        return ListView(
          children: results,
        );
      },
    );
  }
}

class _SemesterCard extends StatelessWidget {
  final SemesterModel semester;

  const _SemesterCard({required this.semester});

  @override
  Widget build(BuildContext context) {
    final statusColor = semester.isCurrent
        ? AppTheme.primaryColor
        : (semester.stats.resultStatus == 'Released' ? AppTheme.successColor : Colors.orange.shade700);

    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      decoration: BoxDecoration(
        color: AppTheme.surfaceColor,
        borderRadius: BorderRadius.circular(AppTheme.borderRadius2XL),
        boxShadow: AppTheme.softShadow,
      ),
      child: InkWell(
        onTap: () {
          context.push('/academics/semester/${semester.semesterId}');
        },
        borderRadius: BorderRadius.circular(AppTheme.borderRadius2XL),
        child: Padding(
          padding: const EdgeInsets.all(20.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    semester.semesterName,
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.bold,
                          color: AppTheme.textPrimary,
                        ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: statusColor.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(
                      semester.stats.resultStatus,
                      style: TextStyle(
                        color: statusColor,
                        fontSize: 11,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  _StatItem(label: 'Courses', value: '${semester.stats.coursesCount}'),
                  _StatItem(label: 'Credits', value: '${semester.stats.totalCredits}'),
                  _StatItem(
                    label: 'GPA',
                    value: semester.stats.gpa != null ? semester.stats.gpa!.toStringAsFixed(2) : '--',
                    highlight: semester.stats.gpa != null,
                  ),
                  _StatItem(
                    label: 'Avg Score',
                    value: semester.stats.averagePercentage != null
                        ? '${semester.stats.averagePercentage!.toStringAsFixed(1)}%'
                        : '--',
                    highlight: semester.stats.averagePercentage != null,
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _StatItem extends StatelessWidget {
  final String label;
  final String value;
  final bool highlight;

  const _StatItem({
    required this.label,
    required this.value,
    this.highlight = false,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: const TextStyle(
            fontSize: 12,
            color: AppTheme.textSecondary,
            fontWeight: FontWeight.w500,
          ),
        ),
        const SizedBox(height: 4),
        Text(
          value,
          style: TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.bold,
            color: highlight ? AppTheme.primaryColor : AppTheme.textPrimary,
          ),
        ),
      ],
    );
  }
}
