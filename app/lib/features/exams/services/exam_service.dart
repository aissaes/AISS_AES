import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/network/base_api_client.dart';
import '../../../core/errors/app_exception.dart';
import '../models/exam_model.dart';
import '../models/exam_result_model.dart';

class ExamService {
  final BaseApiClient _client;

  ExamService(this._client);

  Future<ExamModel> getExamByToken(String token) async {
    try {
      final response = await _client.dio.post('/student/get-exam', data: {'token': token});
      final data = Map<String, dynamic>.from(response.data);
      if (data['success'] == true && data['message'] is Map) {
        final examMap = Map<String, dynamic>.from(data['message']);
        return ExamModel.fromJson(examMap);
      }
      throw ApiException(data['message']?.toString() ?? 'Failed to unlock exam.');
    } on DioException catch (e) {
      _client.handleDioException(e);
      rethrow;
    }
  }

  Future<List<ExamModel>> getStudentTimetableAndExams() async {
    try {
      final response = await _client.dio.get('/student/timetable-exams');
      final data = Map<String, dynamic>.from(response.data);
      final List<dynamic> examsRaw = data['exams'] ?? [];
      return examsRaw.map((e) => ExamModel.fromJson(Map<String, dynamic>.from(e))).toList();
    } on DioException catch (e) {
      _client.handleDioException(e);
      rethrow;
    }
  }

  Future<List<ExamResultModel>> getStudentResults() async {
    try {
      final response = await _client.dio.get('/results/student/my-exams');
      final data = Map<String, dynamic>.from(response.data);
      final List<dynamic> examsRaw = data['exams'] ?? [];
      return examsRaw.map((e) => ExamResultModel.fromJson(Map<String, dynamic>.from(e))).toList();
    } on DioException catch (e) {
      _client.handleDioException(e);
      rethrow;
    }
  }

  Future<ExamResultModel> getStudentDetailedResult(String examId) async {
    try {
      final response = await _client.dio.get('/results/student/exam/$examId');
      final data = Map<String, dynamic>.from(response.data);
      return ExamResultModel.fromJson(data);
    } on DioException catch (e) {
      _client.handleDioException(e);
      rethrow;
    }
  }
}

final examServiceProvider = Provider<ExamService>((ref) {
  final client = ref.watch(baseApiClientProvider);
  return ExamService(client);
});
