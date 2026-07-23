import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/models/semester_model.dart';
import '../../../core/models/course_summary_model.dart';
import '../../../core/models/course_detail_model.dart';
import '../../../core/models/timetable_category_model.dart';
import '../services/academics_service.dart';

final semestersProvider = FutureProvider<List<SemesterModel>>((ref) async {
  final service = ref.watch(academicsServiceProvider);
  return service.getSemesters();
});

final coursesProvider = FutureProvider.family<List<CourseSummaryModel>, String>((ref, semesterId) async {
  final service = ref.watch(academicsServiceProvider);
  return service.getSemesterCourses(semesterId);
});

final timetableProvider = FutureProvider.family<List<TimetableCategoryModel>, String>((ref, semesterId) async {
  final service = ref.watch(academicsServiceProvider);
  return service.getSemesterTimetableCategories(semesterId);
});

final timetableExamsProvider = FutureProvider.family<List<CategoryExamModel>, (String, String)>((ref, args) async {
  final service = ref.watch(academicsServiceProvider);
  return service.getTimetableCategoryExams(args.$1, args.$2);
});

final courseDetailProvider = FutureProvider.family<CourseDetailModel, String>((ref, courseId) async {
  final service = ref.watch(academicsServiceProvider);
  return service.getCourseDetail(courseId);
});
