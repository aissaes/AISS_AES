import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/models/semester_model.dart';
import '../../../core/models/course_summary_model.dart';
import '../../../core/models/course_detail_model.dart';
import '../../../core/models/timetable_category_model.dart';
import '../repositories/academics_repository_impl.dart';

final semestersProvider = FutureProvider<List<SemesterModel>>((ref) async {
  final repo = ref.watch(academicsRepositoryProvider);
  return repo.getSemesters();
});

final coursesProvider = FutureProvider.family<List<CourseSummaryModel>, String>((ref, semesterId) async {
  final repo = ref.watch(academicsRepositoryProvider);
  return repo.getSemesterCourses(semesterId);
});

final timetableProvider = FutureProvider.family<List<TimetableCategoryModel>, String>((ref, semesterId) async {
  final repo = ref.watch(academicsRepositoryProvider);
  return repo.getSemesterTimetableCategories(semesterId);
});

// A tuple type (semesterId, categoryId) for family queries
final timetableExamsProvider = FutureProvider.family<List<CategoryExamModel>, (String, String)>((ref, args) async {
  final repo = ref.watch(academicsRepositoryProvider);
  return repo.getTimetableCategoryExams(args.$1, args.$2);
});

final courseDetailProvider = FutureProvider.family<CourseDetailModel, String>((ref, courseId) async {
  final repo = ref.watch(academicsRepositoryProvider);
  return repo.getCourseDetail(courseId);
});
