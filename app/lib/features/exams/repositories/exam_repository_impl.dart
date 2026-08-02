import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/models/exam_model.dart';
import '../../../../core/models/exam_result_model.dart';
import '../../../../core/errors/app_exception.dart';
import '../api/exams_api.dart';
import '../api/results_api.dart';
import 'exam_repository.dart';

class ExamRepositoryImpl implements ExamRepository {
  final ExamsApi _examsApi;
  final ResultsApi _resultsApi;

  ExamRepositoryImpl(this._examsApi, this._resultsApi);

  @override
  Future<ExamModel> getExamByToken(String token) async {
    final response = await _examsApi.getExam(token);
    final data = Map<String, dynamic>.from(response.data);
    if (data['success'] == true && data['message'] is Map) {
      final examMap = Map<String, dynamic>.from(data['message']);
      return ExamModel.fromJson(examMap);
    }
    throw ApiException(data['message']?.toString() ?? 'Failed to unlock exam.');
  }

  @override
  Future<List<ExamModel>> getStudentTimetableAndExams() async {
    final response = await _examsApi.getStudentTimetableAndExams();
    final data = Map<String, dynamic>.from(response.data);
    final List<dynamic> examsRaw = data['exams'] ?? [];
    return examsRaw.map((e) => ExamModel.fromJson(Map<String, dynamic>.from(e))).toList();
  }

  @override
  Future<List<ExamResultModel>> getStudentResults() async {
    final response = await _resultsApi.getStudentResults();
    final data = Map<String, dynamic>.from(response.data);
    final List<dynamic> examsRaw = data['exams'] ?? [];
    return examsRaw.map((e) => ExamResultModel.fromJson(Map<String, dynamic>.from(e))).toList();
  }

  @override
  Future<ExamResultModel> getStudentDetailedResult(String examId) async {
    final response = await _resultsApi.getStudentDetailedResult(examId);
    final data = Map<String, dynamic>.from(response.data);
    return ExamResultModel.fromJson(data);
  }
}

final examRepositoryProvider = Provider<ExamRepository>((ref) {
  final examsApi = ref.watch(examsApiProvider);
  final resultsApi = ref.watch(resultsApiProvider);
  return ExamRepositoryImpl(examsApi, resultsApi);
});
