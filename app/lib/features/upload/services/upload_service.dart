import 'dart:io' show File;
import 'dart:typed_data';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:http_parser/http_parser.dart';
import '../../../core/network/base_api_client.dart';
import '../../../core/security/secure_pdf_storage_service.dart';
import '../models/upload_session_model.dart';
import '../models/upload_response_model.dart';
import '../models/submission_model.dart';
import '../models/finalize_submission_model.dart';

class UploadService {
  final BaseApiClient _client;
  UploadService(this._client);

  Future<UploadSessionModel> startUploadSession(String token) async {
    try {
      final response = await _client.dio.post('/student/start-session', data: {'token': token});
      return UploadSessionModel.fromJson(Map<String, dynamic>.from(response.data));
    } on DioException catch (e) {
      _client.handleDioException(e);
      rethrow;
    }
  }

  Future<SubmissionModel> getStudentSubmissions(String examId) async {
    try {
      final response = await _client.dio.get('/student/exam-submissions/$examId/answers');
      return SubmissionModel.fromJson(Map<String, dynamic>.from(response.data));
    } on DioException catch (e) {
      _client.handleDioException(e);
      rethrow;
    }
  }

  Future<UploadResponseModel> uploadAnswerPage({
    required String token,
    required String questionId,
    required String filePath,
    required Function(double) onProgress,
  }) async {
    try {
      final fileName = filePath.split('/').last;
      final extension = filePath.split('.').last.toLowerCase();
      MediaType contentType;
      if (extension == 'pdf') {
        contentType = MediaType('application', 'pdf');
      } else if (extension == 'png') {
        contentType = MediaType('image', 'png');
      } else if (extension == 'jpg' || extension == 'jpeg') {
        contentType = MediaType('image', 'jpeg');
      } else {
        contentType = MediaType('application', 'octet-stream');
      }

      Uint8List fileBytes;
      if (!kIsWeb && extension == 'pdf') {
        try {
          fileBytes = await SecurePdfStorageService.readDecryptedBytes(filePath);
        } catch (_) {
          fileBytes = await File(filePath).readAsBytes();
        }
      } else {
        fileBytes = await File(filePath).readAsBytes();
      }

      final formData = FormData.fromMap({
        'token': token,
        'questionNo': questionId,
        'file': MultipartFile.fromBytes(
          fileBytes,
          filename: fileName,
          contentType: contentType,
        ),
      });

      final response = await _client.dio.post(
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
      return UploadResponseModel.fromJson(Map<String, dynamic>.from(response.data));
    } on DioException catch (e) {
      _client.handleDioException(e);
      rethrow;
    }
  }

  Future<FinalizeSubmissionModel> finalizeSubmission(String token) async {
    try {
      final response = await _client.dio.post('/answer/finalize', data: {'token': token});
      return FinalizeSubmissionModel.fromJson(Map<String, dynamic>.from(response.data));
    } on DioException catch (e) {
      _client.handleDioException(e);
      rethrow;
    }
  }
}

final uploadServiceProvider = Provider<UploadService>((ref) {
  final client = ref.watch(baseApiClientProvider);
  return UploadService(client);
});
