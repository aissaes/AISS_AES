import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/network/base_api_client.dart';

class AuthApi {
  final BaseApiClient _client;
  AuthApi(this._client);

  Future<Response> login(String email, String password) async {
    try {
      return await _client.dio.post('/student/auth/login', data: {
        'email': email,
        'password': password,
      });
    } on DioException catch (e) {
      _client.handleDioException(e);
      rethrow;
    }
  }

  Future<void> logout() async {
    try {
      await _client.dio.post('/student/auth/logout');
    } catch (_) {
      // Offline logout handles local cache clearance
    }
  }

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

final authApiProvider = Provider<AuthApi>((ref) {
  final client = ref.watch(baseApiClientProvider);
  return AuthApi(client);
});
