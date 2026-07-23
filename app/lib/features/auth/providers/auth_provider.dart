import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../services/auth_service.dart';
import '../../profile/services/student_service.dart';
import '../../../../core/errors/app_exception.dart';
import '../../../core/models/student_model.dart';
import '../../../../core/network/base_api_client.dart';

class AuthState {
  final bool isAuthenticated;
  final StudentModel? student;
  final bool isLoading;
  final String? errorMessage;
  final bool isOffline;

  AuthState({
    this.isAuthenticated = false,
    this.student,
    this.isLoading = false,
    this.errorMessage,
    this.isOffline = false,
  });

  AuthState copyWith({
    bool? isAuthenticated,
    StudentModel? student,
    bool? isLoading,
    String? errorMessage,
    bool? isOffline,
    bool clearError = false,
  }) {
    return AuthState(
      isAuthenticated: isAuthenticated ?? this.isAuthenticated,
      student: student ?? this.student,
      isLoading: isLoading ?? this.isLoading,
      errorMessage: clearError ? null : (errorMessage ?? this.errorMessage),
      isOffline: isOffline ?? this.isOffline,
    );
  }
}

class AuthNotifier extends StateNotifier<AuthState> {
  final AuthService _authService;
  final StudentService _studentService;

  AuthNotifier(this._authService, this._studentService) : super(AuthState(isLoading: true)) {
    verifyToken();
  }

  Future<void> verifyToken() async {
    state = state.copyWith(isLoading: true, isOffline: false, clearError: true);
    
    final hasToken = _authService.isLoggedIn();
    if (!hasToken) {
      state = state.copyWith(isAuthenticated: false, isLoading: false);
      return;
    }

    try {
      final data = await _studentService.getProfile();
      state = state.copyWith(
        isAuthenticated: true,
        student: data,
        isLoading: false,
      );
    } catch (exception) {
      if (exception is OfflineException || 
          exception.toString().toLowerCase().contains('offline') || 
          exception.toString().toLowerCase().contains('connection') ||
          exception.toString().toLowerCase().contains('unreachable')) {
        final cachedProfile = _studentService.getCachedProfile();
        state = state.copyWith(
          isLoading: false,
          isOffline: true,
          isAuthenticated: cachedProfile != null,
          student: cachedProfile,
        );
      } else {
        await _authService.logout();
        state = state.copyWith(
          isAuthenticated: false,
          isLoading: false,
          errorMessage: 'Session expired or invalid credentials.',
        );
      }
    }
  }

  Future<void> login(String email, String password) async {
    state = state.copyWith(isLoading: true, clearError: true);
    
    try {
      await _authService.login(email, password);
      final data = await _studentService.getProfile();
      state = state.copyWith(
        isAuthenticated: true,
        student: data,
        isLoading: false,
        clearError: true,
      );
    } catch (exception) {
      String msg = exception.toString();
      if (msg.startsWith('Exception: ')) {
        msg = msg.substring(11);
      }
      
      if (msg.toLowerCase().contains('credential') || 
          msg.toLowerCase().contains('invalid') || 
          msg.contains('401') ||
          msg.contains('unexpected error')) {
        msg = 'Invalid credentials. Please verify email and password.';
      } else if (msg.toLowerCase().contains('offline') || 
                 msg.toLowerCase().contains('connection') || 
                 msg.toLowerCase().contains('unreachable')) {
        msg = 'AES server is unreachable. Please check your connection.';
      }

      state = state.copyWith(
        isLoading: false,
        errorMessage: msg,
      );
      rethrow;
    }
  }

  Future<void> logout() async {
    await _authService.logout();
    state = AuthState(isAuthenticated: false);
  }

  void clearError() {
    if (state.errorMessage != null) {
      state = state.copyWith(clearError: true);
    }
  }
}

final authProvider = StateNotifierProvider<AuthNotifier, AuthState>((ref) {
  final authService = ref.watch(authServiceProvider);
  final studentService = ref.watch(studentServiceProvider);
  final client = ref.watch(baseApiClientProvider);
  
  final notifier = AuthNotifier(authService, studentService);
  client.onUnauthorized = () {
    notifier.logout();
  };
  return notifier;
});
