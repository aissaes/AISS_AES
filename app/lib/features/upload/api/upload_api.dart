import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/network/base_api_client.dart';

class UploadApi {
  final BaseApiClient _client;
  UploadApi(this._client);

  Future<Response> startUploadSession(String token) async {
    try {
      return await _client.dio.post('/student/start-session', data: {'token': token});
    } on DioException catch (e) {
      _client.handleDioException(e);
      rethrow;
    }
  }

  Future<Response> getStudentSubmissions(String examId) async {
    try {
      return await _client.dio.get('/student/exam-submissions/$examId/answers');
    } on DioException catch (e) {
      _client.handleDioException(e);
      rethrow;
    }
  }

  Future<Response> uploadAnswerPage({
    required String token,
    required String questionId,
    required String filePath,
    required Function(double) onProgress,
  }) async {
    try {
      final fileName = filePath.split('/').last;
      final formData = FormData.fromMap({
        'token': token,
        'questionNo': questionId,
        'file': await MultipartFile.fromFile(filePath, filename: fileName),
      });

      return await _client.dio.post(
        '/answer/upload',
        data: formData,
        options: Options(
          contentType: 'multipart/form-data',
        ),
        onSendProgress: (sent, total) {
          if (total > 0) {
            onProgress(sent / total);
          }
        },
      );
    } on DioException catch (e) {
      _client.handleDioException(e);
      rethrow;
    }
  }

  Future<Response> finalizeSubmission(String token) async {
    try {
      return await _client.dio.post('/answer/finalize', data: {'token': token});
    } on DioException catch (e) {
      _client.handleDioException(e);
      rethrow;
    }
  }
}

final uploadApiProvider = Provider<UploadApi>((ref) {
  final client = ref.watch(baseApiClientProvider);
  return UploadApi(client);
});
