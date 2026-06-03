import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../repositories/auth_repository.dart';
import '../repositories/auth_repository_impl.dart';
import '../../profile/repositories/student_repository.dart';
import '../../profile/repositories/student_repository_impl.dart';
import '../../../../core/errors/app_exception.dart';
import '../../../core/models/student_model.dart';

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
  final AuthRepository _authRepository;
  final StudentRepository _studentRepository;

  AuthNotifier(this._authRepository, this._studentRepository) : super(AuthState(isLoading: true)) {
    verifyToken();
  }

  Future<void> verifyToken() async {
    state = state.copyWith(isLoading: true, isOffline: false, clearError: true);
    
    final hasToken = _authRepository.isLoggedIn();
    if (!hasToken) {
      state = state.copyWith(isAuthenticated: false, isLoading: false);
      return;
    }

    try {
      final data = await _studentRepository.getProfile();
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
        // Safe check for offline / unreachable server
        state = state.copyWith(
          isLoading: false,
          isOffline: true,
        );
      } else {
        // Token is invalid/expired or rejected by server (401/403)
        await _authRepository.logout();
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
      await _authRepository.login(email, password);
      // Load student profile to ensure data consistency
      final data = await _studentRepository.getProfile();
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
      
      // Formatting the exception into a user-friendly error message
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
    await _authRepository.logout();
    state = AuthState(isAuthenticated: false);
  }

  void clearError() {
    if (state.errorMessage != null) {
      state = state.copyWith(clearError: true);
    }
  }
}

final authProvider = StateNotifierProvider<AuthNotifier, AuthState>((ref) {
  final authRepository = ref.watch(authRepositoryProvider);
  final studentRepository = ref.watch(studentRepositoryProvider);
  return AuthNotifier(authRepository, studentRepository);
});

