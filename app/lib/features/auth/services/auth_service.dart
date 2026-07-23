import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/network/base_api_client.dart';
import '../../../core/storage/local_storage_service.dart';
import '../../../core/providers/storage_providers.dart';
import '../../../core/errors/app_exception.dart';

class AuthService {
  final BaseApiClient _client;
  final LocalStorageService _storageService;

  AuthService(this._client, this._storageService);

  Future<void> login(String email, String password) async {
    try {
      final response = await _client.dio.post('/student/auth/login', data: {
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

      final String token = data['token'] ?? '';
      if (token.isEmpty) {
        throw AuthException('Invalid login response. No authentication token received.');
      }
      
      final dynamic studentData = data['student'];
      final String name = (studentData is Map && studentData['name'] != null)
          ? studentData['name']
          : 'Student';

      await _storageService.saveAuthData(token: token, userName: name);
      if (studentData is Map) {
        final Map<String, dynamic> typedStudentData = Map<String, dynamic>.from(studentData);
        await _storageService.saveStudentProfile(typedStudentData);
      }
    } on DioException catch (e) {
      _client.handleDioException(e);
      rethrow;
    }
  }

  Future<void> logout() async {
    try {
      await _client.dio.post('/student/auth/logout');
    } catch (_) {
      // Clear local storage regardless of offline network state
    } finally {
      await _storageService.clearAuthData();
      await _storageService.clearStudentProfile();
    }
  }

  bool isLoggedIn() => _storageService.isLoggedIn();

  Future<String?> getToken() => _storageService.getToken();

  String? getUserName() => _storageService.getUserName();

  Future<void> changePassword(String oldPassword, String newPassword) async {
    try {
      await _client.dio.put('/student/auth/change-password', data: {
        'oldPassword': oldPassword,
        'newPassword': newPassword,
      });
    } on DioException catch (e) {
      _client.handleDioException(e);
      rethrow;
    }
  }

  Future<void> forgotPassword(String email) async {
    try {
      await _client.dio.post('/student/auth/forgot-password', data: {'email': email});
    } on DioException catch (e) {
      _client.handleDioException(e);
      rethrow;
    }
  }

  Future<void> resetForgottenPassword(String email, String otp, String newPassword) async {
    try {
      await _client.dio.post('/student/auth/reset-forgotten-password', data: {
        'email': email,
        'otp': otp,
        'newPassword': newPassword,
      });
    } on DioException catch (e) {
      _client.handleDioException(e);
      rethrow;
    }
  }
}

final authServiceProvider = Provider<AuthService>((ref) {
  final client = ref.watch(baseApiClientProvider);
  final storageService = ref.watch(localStorageServiceProvider);
  return AuthService(client, storageService);
});
