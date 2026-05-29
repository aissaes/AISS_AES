import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/repositories/auth_repository.dart';
import '../../../core/repositories/student_repository.dart';
import '../../../core/services/api_service.dart';

class AuthState {
  final bool isAuthenticated;
  final String? userName;
  final bool isLoading;
  final String? errorMessage;
  final bool isOffline;

  AuthState({
    this.isAuthenticated = false,
    this.userName,
    this.isLoading = false,
    this.errorMessage,
    this.isOffline = false,
  });

  AuthState copyWith({
    bool? isAuthenticated,
    String? userName,
    bool? isLoading,
    String? errorMessage,
    bool? isOffline,
    bool clearError = false,
  }) {
    return AuthState(
      isAuthenticated: isAuthenticated ?? this.isAuthenticated,
      userName: userName ?? this.userName,
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
      // Fetch the real student profile to check token validity on the server
      final profile = await _studentRepository.getProfile();
      state = state.copyWith(
        isAuthenticated: true,
        userName: profile['name'],
        isLoading: false,
      );
    } catch (e) {
      if (e is OfflineException || 
          e.toString().toLowerCase().contains('offline') || 
          e.toString().toLowerCase().contains('connection') ||
          e.toString().toLowerCase().contains('unreachable')) {
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
      final profile = await _studentRepository.getProfile();
      
      state = state.copyWith(
        isAuthenticated: true,
        userName: profile['name'],
        isLoading: false,
        clearError: true,
      );
    } catch (e) {
      String msg = e.toString();
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


