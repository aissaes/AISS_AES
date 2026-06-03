import '../../../core/models/semester_model.dart';
import '../../../core/models/course_summary_model.dart';
import '../../../core/models/course_detail_model.dart';
import '../../../core/models/timetable_category_model.dart';

abstract class AcademicsRepository {
  Future<List<SemesterModel>> getSemesters();
  Future<List<CourseSummaryModel>> getSemesterCourses(String semesterId);
  Future<List<TimetableCategoryModel>> getSemesterTimetableCategories(String semesterId);
  Future<List<CategoryExamModel>> getTimetableCategoryExams(String semesterId, String categoryId);
  Future<CourseDetailModel> getCourseDetail(String courseId);
}
