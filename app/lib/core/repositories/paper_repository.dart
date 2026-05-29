import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../services/api_service.dart';

abstract class PaperRepository {
  Future<Map<String, dynamic>> startUploadSession(String token);
  Future<Map<String, dynamic>> uploadAnswerPage({
    required String token,
    required String questionId,
    required String filePath,
    required Function(double) onProgress,
  });
  Future<Map<String, dynamic>> getStudentSubmissions(String examId);
  Future<Map<String, dynamic>> finalizeSubmission(String token);
}

class PaperRepositoryImpl implements PaperRepository {
  final ApiService _apiService;

  PaperRepositoryImpl(this._apiService);

  @override
  Future<Map<String, dynamic>> startUploadSession(String token) async {
    return await _apiService.startUploadSession(token);
  }

  @override
  Future<Map<String, dynamic>> uploadAnswerPage({
    required String token,
    required String questionId,
    required String filePath,
    required Function(double) onProgress,
  }) async {
    return await _apiService.uploadAnswerPage(
      token: token,
      questionId: questionId,
      filePath: filePath,
      onProgress: onProgress,
    );
  }

  @override
  Future<Map<String, dynamic>> getStudentSubmissions(String examId) async {
    return await _apiService.getStudentSubmissions(examId);
  }

  @override
  Future<Map<String, dynamic>> finalizeSubmission(String token) async {
    return await _apiService.finalizeSubmission(token);
  }
}

final paperRepositoryProvider = Provider<PaperRepository>((ref) {
  final apiService = ref.watch(apiServiceProvider);
  return PaperRepositoryImpl(apiService);
});
