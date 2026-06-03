import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/services/local_storage_service.dart';
import '../../../../core/providers/storage_providers.dart';
import '../../../../core/errors/app_exception.dart';
import '../api/auth_api.dart';
import 'auth_repository.dart';

class AuthRepositoryImpl implements AuthRepository {
  final LocalStorageService _storageService;
  final AuthApi _authApi;

  AuthRepositoryImpl(this._storageService, this._authApi);

  @override
  Future<void> login(String email, String password) async {
    final response = await _authApi.login(email, password);
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
  }

  @override
  Future<void> logout() async {
    try {
      await _authApi.logout();
    } catch (_) {
      // Even if network fails, we want to clear local storage
    } finally {
      await _storageService.clearAuthData();
      await _storageService.clearStudentProfile();
    }
  }

  @override
  bool isLoggedIn() => _storageService.isLoggedIn();

  @override
  Future<String?> getToken() => _storageService.getToken();

  @override
  String? getUserName() => _storageService.getUserName();

  @override
  Future<void> changePassword(String oldPassword, String newPassword) async {
    await _authApi.changePassword(oldPassword, newPassword);
  }

  @override
  Future<void> forgotPassword(String email) async {
    await _authApi.forgotPassword(email);
  }

  @override
  Future<void> resetForgottenPassword(String email, String otp, String newPassword) async {
    await _authApi.resetForgottenPassword(email, otp, newPassword);
  }
}

final authRepositoryProvider = Provider<AuthRepository>((ref) {
  final storageService = ref.watch(localStorageServiceProvider);
  final authApi = ref.watch(authApiProvider);
  return AuthRepositoryImpl(storageService, authApi);
});
