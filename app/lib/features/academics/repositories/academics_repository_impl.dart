import 'dart:convert';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/models/semester_model.dart';
import '../../../../core/models/course_summary_model.dart';
import '../../../../core/models/course_detail_model.dart';
import '../../../../core/models/timetable_category_model.dart';
import '../../../../core/services/local_storage_service.dart';
import '../../../../core/providers/storage_providers.dart';
import '../../../../core/errors/app_exception.dart';
import '../api/academics_api.dart';
import 'academics_repository.dart';

class AcademicsRepositoryImpl implements AcademicsRepository {
  final AcademicsApi _api;
  final LocalStorageService _storage;

  AcademicsRepositoryImpl(this._api, this._storage);

  static const String _semestersKey = 'academics_semesters';
  static String _coursesKey(String semId) => 'academics_courses_sem_$semId';
  static String _categoriesKey(String semId) => 'academics_timetable_categories_sem_$semId';
  static String _examsKey(String semId, String catId) => 'academics_timetable_exams_sem_${semId}_cat_$catId';
  static String _courseDetailKey(String courseId) => 'academics_course_detail_$courseId';

  @override
  Future<List<SemesterModel>> getSemesters() async {
    try {
      final response = await _api.getSemesters();
      final data = Map<String, dynamic>.from(response.data);
      if (data['success'] == true) {
        final List<dynamic> raw = data['semesters'] ?? [];
        await _storage.saveString(_semestersKey, jsonEncode(raw));
        return raw.map((e) => SemesterModel.fromJson(Map<String, dynamic>.from(e))).toList();
      }
      throw ApiException(data['message']?.toString() ?? 'Failed to load semesters.');
    } catch (e) {
      final cachedStr = _storage.getString(_semestersKey);
      if (cachedStr != null) {
        final List<dynamic> raw = jsonDecode(cachedStr);
        return raw.map((e) => SemesterModel.fromJson(Map<String, dynamic>.from(e))).toList();
      }
      rethrow;
    }
  }

  @override
  Future<List<CourseSummaryModel>> getSemesterCourses(String semesterId) async {
    final key = _coursesKey(semesterId);
    try {
      final response = await _api.getSemesterCourses(semesterId);
      final data = Map<String, dynamic>.from(response.data);
      if (data['success'] == true) {
        final List<dynamic> raw = data['courses'] ?? [];
        await _storage.saveString(key, jsonEncode(raw));
        return raw.map((e) => CourseSummaryModel.fromJson(Map<String, dynamic>.from(e))).toList();
      }
      throw ApiException(data['message']?.toString() ?? 'Failed to load courses.');
    } catch (e) {
      final cachedStr = _storage.getString(key);
      if (cachedStr != null) {
        final List<dynamic> raw = jsonDecode(cachedStr);
        return raw.map((e) => CourseSummaryModel.fromJson(Map<String, dynamic>.from(e))).toList();
      }
      rethrow;
    }
  }

  @override
  Future<List<TimetableCategoryModel>> getSemesterTimetableCategories(String semesterId) async {
    final key = _categoriesKey(semesterId);
    try {
      final response = await _api.getSemesterTimetableCategories(semesterId);
      final data = Map<String, dynamic>.from(response.data);
      if (data['success'] == true) {
        final List<dynamic> raw = data['categories'] ?? [];
        await _storage.saveString(key, jsonEncode(raw));
        return raw.map((e) => TimetableCategoryModel.fromJson(Map<String, dynamic>.from(e))).toList();
      }
      throw ApiException(data['message']?.toString() ?? 'Failed to load timetable categories.');
    } catch (e) {
      final cachedStr = _storage.getString(key);
      if (cachedStr != null) {
        final List<dynamic> raw = jsonDecode(cachedStr);
        return raw.map((e) => TimetableCategoryModel.fromJson(Map<String, dynamic>.from(e))).toList();
      }
      rethrow;
    }
  }

  @override
  Future<List<CategoryExamModel>> getTimetableCategoryExams(String semesterId, String categoryId) async {
    final key = _examsKey(semesterId, categoryId);
    try {
      final response = await _api.getTimetableCategoryExams(semesterId, categoryId);
      final data = Map<String, dynamic>.from(response.data);
      if (data['success'] == true) {
        final List<dynamic> raw = data['exams'] ?? [];
        await _storage.saveString(key, jsonEncode(raw));
        return raw.map((e) => CategoryExamModel.fromJson(Map<String, dynamic>.from(e))).toList();
      }
      throw ApiException(data['message']?.toString() ?? 'Failed to load exams.');
    } catch (e) {
      final cachedStr = _storage.getString(key);
      if (cachedStr != null) {
        final List<dynamic> raw = jsonDecode(cachedStr);
        return raw.map((e) => CategoryExamModel.fromJson(Map<String, dynamic>.from(e))).toList();
      }
      rethrow;
    }
  }

  @override
  Future<CourseDetailModel> getCourseDetail(String courseId) async {
    final key = _courseDetailKey(courseId);
    try {
      final response = await _api.getCourseDetail(courseId);
      final data = Map<String, dynamic>.from(response.data);
      if (data['success'] == true) {
        await _storage.saveString(key, jsonEncode(data));
        return CourseDetailModel.fromJson(data);
      }
      throw ApiException(data['message']?.toString() ?? 'Failed to load course details.');
    } catch (e) {
      final cachedStr = _storage.getString(key);
      if (cachedStr != null) {
        final Map<String, dynamic> raw = jsonDecode(cachedStr);
        return CourseDetailModel.fromJson(raw);
      }
      rethrow;
    }
  }
}

final academicsRepositoryProvider = Provider<AcademicsRepository>((ref) {
  final api = ref.watch(academicsApiProvider);
  final storage = ref.watch(localStorageServiceProvider);
  return AcademicsRepositoryImpl(api, storage);
});
