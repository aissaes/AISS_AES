import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../config/app_config.dart';
import 'local_storage_service.dart';
import '../providers/storage_providers.dart';

class OfflineException implements Exception {
  final String message;
  OfflineException([this.message = 'No internet connection or server is offline.']);
  @override
  String toString() => message;
}

class ApiException implements Exception {
  final String message;
  final int? statusCode;
  ApiException(this.message, {this.statusCode});
  @override
  String toString() => message;
}

class ApiService {
  final Dio _dio;
  final LocalStorageService _storageService;

  ApiService(this._storageService) : _dio = Dio(BaseOptions(
    baseUrl: AppConfig.apiBaseUrl,
    connectTimeout: AppConfig.connectionTimeout,
    receiveTimeout: AppConfig.receiveTimeout,
    contentType: 'application/json',
  )) {
    _dio.interceptors.add(InterceptorsWrapper(
      onRequest: (options, handler) async {
        final token = await _storageService.getToken();
        if (token != null) {
          options.headers['Authorization'] = 'Bearer $token';
          options.headers['Cookie'] = 'token=$token';
        }
        return handler.next(options);
      },
      onError: (error, handler) {
        if (error.type == DioExceptionType.connectionTimeout ||
            error.type == DioExceptionType.sendTimeout ||
            error.type == DioExceptionType.receiveTimeout ||
            error.type == DioExceptionType.connectionError) {
          return handler.next(DioException(
            requestOptions: error.requestOptions,
            error: OfflineException(),
            type: error.type,
            message: 'Server unreachable or offline.',
          ));
        }
        return handler.next(error);
      },
    ));
  }

  Future<Response> post(String path, {dynamic data, Options? options, ProgressCallback? onSendProgress}) async {
    try {
      return await _dio.post(path, data: data, options: options, onSendProgress: onSendProgress);
    } on DioException catch (e) {
      _handleDioException(e);
      rethrow;
    }
  }

  Future<Response> get(String path, {Map<String, dynamic>? queryParameters, Options? options}) async {
    try {
      return await _dio.get(path, queryParameters: queryParameters, options: options);
    } on DioException catch (e) {
      _handleDioException(e);
      rethrow;
    }
  }

  Future<Response> put(String path, {dynamic data, Options? options}) async {
    try {
      return await _dio.put(path, data: data, options: options);
    } on DioException catch (e) {
      _handleDioException(e);
      rethrow;
    }
  }

  void _handleDioException(DioException e) {
    if (e.error is OfflineException) {
      throw e.error as OfflineException;
    }
    
    final response = e.response;
    if (response != null) {
      final data = response.data;
      String errMsg = 'An unexpected error occurred';
      if (data is Map) {
        errMsg = data['message'] ?? data['error'] ?? errMsg;
      }
      throw ApiException(errMsg, statusCode: response.statusCode);
    } else {
      throw OfflineException('Network error: server is unreachable.');
    }
  }

  // --- Student Auth APIs ---
  Future<Map<String, dynamic>> login(String email, String password) async {
    final response = await post('/student/auth/login', data: {
      'email': email,
      'password': password,
    });
    
    final data = Map<String, dynamic>.from(response.data);
    
    // Fallback: extract token from Set-Cookie if it's not in the JSON body
    if (data['token'] == null) {
      final setCookie = response.headers.map['set-cookie'] ?? response.headers.map['Set-Cookie'];
      if (setCookie != null && setCookie.isNotEmpty) {
        for (final cookie in setCookie) {
          if (cookie.contains('token=')) {
            final tokenPart = cookie.split('token=').last.split(';').first;
            data['token'] = tokenPart;
            break;
          }
        }
      }
    }
    
    return data;
  }

  Future<void> logout() async {
    try {
      await post('/student/auth/logout');
    } catch (_) {
      // Even if network fails, we want to clear local storage
    }
  }

  Future<void> changePassword(String oldPassword, String newPassword) async {
    await put('/student/auth/change-password', data: {
      'oldPassword': oldPassword,
      'newPassword': newPassword,
    });
  }

  Future<void> forgotPassword(String email) async {
    await post('/student/auth/forgot-password', data: {'email': email});
  }

  Future<void> resetForgottenPassword(String email, String otp, String newPassword) async {
    await post('/student/auth/reset-forgotten-password', data: {
      'email': email,
      'otp': otp,
      'newPassword': newPassword,
    });
  }

  // --- Exam & Upload APIs ---
  Future<Map<String, dynamic>> getExam(String token) async {
    final response = await post('/student/get-exam', data: {'token': token});
    return response.data;
  }

  Future<Map<String, dynamic>> startUploadSession(String token) async {
    final response = await post('/student/start-session', data: {'token': token});
    return response.data;
  }

  Future<Map<String, dynamic>> getStudentSubmissions(String examId) async {
    final response = await get('/student/exam-submissions/$examId/answers');
    return response.data;
  }

  Future<Map<String, dynamic>> uploadAnswerPage({
    required String token,
    required String questionId,
    required String filePath,
    required Function(double) onProgress,
  }) async {
    final fileName = filePath.split('/').last;
    final formData = FormData.fromMap({
      'token': token,
      'questionNo': questionId,
      'file': await MultipartFile.fromFile(filePath, filename: fileName),
    });

    final response = await post(
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
    return response.data;
  }

  Future<Map<String, dynamic>> finalizeSubmission(String token) async {
    final response = await post('/answer/finalize', data: {'token': token});
    return response.data;
  }

  // --- Student Timetable & Results APIs ---
  Future<Map<String, dynamic>> getStudentTimetableAndExams() async {
    final response = await get('/student/timetable-exams');
    return response.data;
  }

  Future<Map<String, dynamic>> getStudentResults() async {
    final response = await get('/results/student/my-exams');
    return response.data;
  }

  Future<Map<String, dynamic>> getStudentDetailedResult(String examId) async {
    final response = await get('/results/student/exam/$examId');
    return response.data;
  }
}

final apiServiceProvider = Provider<ApiService>((ref) {
  final storageService = ref.watch(localStorageServiceProvider);
  return ApiService(storageService);
});
