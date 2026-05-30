import 'dart:async';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../services/api_service.dart';
import '../services/local_storage_service.dart';
import '../providers/storage_providers.dart';

abstract class AuthRepository {
  Future<void> login(String email, String password);
  Future<void> logout();
  bool isLoggedIn();
  Future<String?> getToken();
  String? getUserName();
  Future<void> changePassword(String oldPassword, String newPassword);
  Future<void> forgotPassword(String email);
  Future<void> resetForgottenPassword(String email, String otp, String newPassword);
}

class AuthRepositoryImpl implements AuthRepository {
  final LocalStorageService _storageService;
  final ApiService _apiService;

  AuthRepositoryImpl(this._storageService, this._apiService);

  @override
  Future<void> login(String email, String password) async {
    final response = await _apiService.login(email, password);
    final String token = response['token'] ?? '';
    if (token.isEmpty) {
      throw Exception('Invalid login response. No authentication token received.');
    }
    
    final dynamic studentData = response['student'];
    final String name = (studentData is Map && studentData['name'] != null)
        ? studentData['name']
        : 'Student';

    await _storageService.saveAuthData(token: token, userName: name);
    if (studentData is Map) {
      final Map<String, dynamic> typedStudentData = Map<String, dynamic>.from(studentData);
      await _storageService.saveStudentProfile(typedStudentData);
    }
  }

  @override
  Future<void> logout() async {
    await _apiService.logout();
    await _storageService.clearAuthData();
    await _storageService.clearStudentProfile();
  }

  @override
  bool isLoggedIn() => _storageService.isLoggedIn();

  @override
  Future<String?> getToken() => _storageService.getToken();

  @override
  String? getUserName() => _storageService.getUserName();

  @override
  Future<void> changePassword(String oldPassword, String newPassword) async {
    await _apiService.changePassword(oldPassword, newPassword);
  }

  @override
  Future<void> forgotPassword(String email) async {
    await _apiService.forgotPassword(email);
  }

  @override
  Future<void> resetForgottenPassword(String email, String otp, String newPassword) async {
    await _apiService.resetForgottenPassword(email, otp, newPassword);
  }
}

final authRepositoryProvider = Provider<AuthRepository>((ref) {
  final storageService = ref.watch(localStorageServiceProvider);
  final apiService = ref.watch(apiServiceProvider);
  return AuthRepositoryImpl(storageService, apiService);
});
