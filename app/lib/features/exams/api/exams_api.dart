import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/network/base_api_client.dart';

class ExamsApi {
  final BaseApiClient _client;
  ExamsApi(this._client);

  Future<Response> getExam(String token) async {
    try {
      return await _client.dio.post('/student/get-exam', data: {'token': token});
    } on DioException catch (e) {
      _client.handleDioException(e);
      rethrow;
    }
  }

  Future<Response> getStudentTimetableAndExams() async {
    try {
      return await _client.dio.get('/student/timetable-exams');
    } on DioException catch (e) {
      _client.handleDioException(e);
      rethrow;
    }
  }
}

final examsApiProvider = Provider<ExamsApi>((ref) {
  final client = ref.watch(baseApiClientProvider);
  return ExamsApi(client);
});
