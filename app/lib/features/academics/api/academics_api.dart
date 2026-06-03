import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/network/base_api_client.dart';

class AcademicsApi {
  final BaseApiClient _client;
  AcademicsApi(this._client);

  Future<Response> getSemesters() async {
    try {
      return await _client.dio.get('/student/academics/semesters');
    } on DioException catch (e) {
      _client.handleDioException(e);
      rethrow;
    }
  }

  Future<Response> getSemesterCourses(String semesterId) async {
    try {
      return await _client.dio.get('/student/academics/semesters/$semesterId/courses');
    } on DioException catch (e) {
      _client.handleDioException(e);
      rethrow;
    }
  }

  Future<Response> getSemesterTimetableCategories(String semesterId) async {
    try {
      return await _client.dio.get('/student/academics/semesters/$semesterId/timetable');
    } on DioException catch (e) {
      _client.handleDioException(e);
      rethrow;
    }
  }

  Future<Response> getTimetableCategoryExams(String semesterId, String categoryId) async {
    try {
      return await _client.dio.get('/student/academics/semesters/$semesterId/timetable/$categoryId/exams');
    } on DioException catch (e) {
      _client.handleDioException(e);
      rethrow;
    }
  }

  Future<Response> getCourseDetail(String courseId) async {
    try {
      return await _client.dio.get('/student/academics/courses/$courseId/detail');
    } on DioException catch (e) {
      _client.handleDioException(e);
      rethrow;
    }
  }
}

final academicsApiProvider = Provider<AcademicsApi>((ref) {
  final client = ref.watch(baseApiClientProvider);
  return AcademicsApi(client);
});
