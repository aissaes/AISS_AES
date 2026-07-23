import 'dart:convert';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:dio/dio.dart';
import '../../../core/models/semester_model.dart';
import '../../../core/models/course_summary_model.dart';
import '../../../core/models/course_detail_model.dart';
import '../../../core/models/timetable_category_model.dart';
import '../../../core/storage/local_storage_service.dart';
import '../../../core/providers/storage_providers.dart';
import '../../../core/network/base_api_client.dart';
import '../../../core/errors/app_exception.dart';

class AcademicsService {
  final BaseApiClient _client;
  final LocalStorageService _storage;

  AcademicsService(this._client, this._storage);

  static const String _semestersKey = 'academics_semesters';
  static String _coursesKey(String semId) => 'academics_courses_sem_$semId';
  static String _categoriesKey(String semId) => 'academics_timetable_categories_sem_$semId';
  static String _examsKey(String semId, String catId) => 'academics_timetable_exams_sem_${semId}_cat_$catId';
  static String _courseDetailKey(String courseId) => 'academics_course_detail_$courseId';

  Future<List<SemesterModel>> getSemesters() async {
    try {
      final response = await _client.dio.get('/student/academics/semesters');
      final data = Map<String, dynamic>.from(response.data);
      if (data['success'] == true && data['semesters'] != null) {
        final List<dynamic> raw = data['semesters'];
        final semesters = raw.map((e) => SemesterModel.fromJson(Map<String, dynamic>.from(e))).toList();
        await _storage.saveString(_semestersKey, jsonEncode(raw));
        return semesters;
      }
      throw ApiException(data['message']?.toString() ?? 'Failed to load semesters.');
    } on DioException catch (e) {
      final cachedJson = _storage.getString(_semestersKey);
      if (cachedJson != null) {
        final List<dynamic> raw = jsonDecode(cachedJson);
        return raw.map((e) => SemesterModel.fromJson(Map<String, dynamic>.from(e))).toList();
      }
      _client.handleDioException(e);
      rethrow;
    }
  }

  Future<List<CourseSummaryModel>> getSemesterCourses(String semesterId) async {
    final key = _coursesKey(semesterId);
    try {
      final response = await _client.dio.get('/student/academics/semesters/$semesterId/courses');
      final data = Map<String, dynamic>.from(response.data);
      if (data['success'] == true && data['courses'] != null) {
        final List<dynamic> raw = data['courses'];
        final courses = raw.map((e) => CourseSummaryModel.fromJson(Map<String, dynamic>.from(e))).toList();
        await _storage.saveString(key, jsonEncode(raw));
        return courses;
      }
      throw ApiException(data['message']?.toString() ?? 'Failed to load courses.');
    } on DioException catch (e) {
      final cachedJson = _storage.getString(key);
      if (cachedJson != null) {
        final List<dynamic> raw = jsonDecode(cachedJson);
        return raw.map((e) => CourseSummaryModel.fromJson(Map<String, dynamic>.from(e))).toList();
      }
      _client.handleDioException(e);
      rethrow;
    }
  }

  Future<List<TimetableCategoryModel>> getSemesterTimetableCategories(String semesterId) async {
    final key = _categoriesKey(semesterId);
    try {
      final response = await _client.dio.get('/student/academics/semesters/$semesterId/timetable');
      final data = Map<String, dynamic>.from(response.data);
      if (data['success'] == true && data['categories'] != null) {
        final List<dynamic> raw = data['categories'];
        final categories = raw.map((e) => TimetableCategoryModel.fromJson(Map<String, dynamic>.from(e))).toList();
        await _storage.saveString(key, jsonEncode(raw));
        return categories;
      }
      throw ApiException(data['message']?.toString() ?? 'Failed to load timetable categories.');
    } on DioException catch (e) {
      final cachedJson = _storage.getString(key);
      if (cachedJson != null) {
        final List<dynamic> raw = jsonDecode(cachedJson);
        return raw.map((e) => TimetableCategoryModel.fromJson(Map<String, dynamic>.from(e))).toList();
      }
      _client.handleDioException(e);
      rethrow;
    }
  }

  Future<List<CategoryExamModel>> getTimetableCategoryExams(String semesterId, String categoryId) async {
    final key = _examsKey(semesterId, categoryId);
    try {
      final response = await _client.dio.get('/student/academics/semesters/$semesterId/timetable/$categoryId/exams');
      final data = Map<String, dynamic>.from(response.data);
      if (data['success'] == true && data['exams'] != null) {
        final List<dynamic> raw = data['exams'];
        final exams = raw.map((e) => CategoryExamModel.fromJson(Map<String, dynamic>.from(e))).toList();
        await _storage.saveString(key, jsonEncode(raw));
        return exams;
      }
      throw ApiException(data['message']?.toString() ?? 'Failed to load category exams.');
    } on DioException catch (e) {
      final cachedJson = _storage.getString(key);
      if (cachedJson != null) {
        final List<dynamic> raw = jsonDecode(cachedJson);
        return raw.map((e) => CategoryExamModel.fromJson(Map<String, dynamic>.from(e))).toList();
      }
      _client.handleDioException(e);
      rethrow;
    }
  }

  Future<CourseDetailModel> getCourseDetail(String courseId) async {
    final key = _courseDetailKey(courseId);
    try {
      final response = await _client.dio.get('/student/academics/courses/$courseId');
      final data = Map<String, dynamic>.from(response.data);
      if (data['success'] == true && data['course'] != null) {
        final rawMap = Map<String, dynamic>.from(data['course']);
        final courseDetail = CourseDetailModel.fromJson(rawMap);
        await _storage.saveString(key, jsonEncode(rawMap));
        return courseDetail;
      }
      throw ApiException(data['message']?.toString() ?? 'Failed to load course details.');
    } on DioException catch (e) {
      final cachedJson = _storage.getString(key);
      if (cachedJson != null) {
        final rawMap = Map<String, dynamic>.from(jsonDecode(cachedJson));
        return CourseDetailModel.fromJson(rawMap);
      }
      _client.handleDioException(e);
      rethrow;
    }
  }
}

final academicsServiceProvider = Provider<AcademicsService>((ref) {
  final client = ref.watch(baseApiClientProvider);
  final storage = ref.watch(localStorageServiceProvider);
  return AcademicsService(client, storage);
});
