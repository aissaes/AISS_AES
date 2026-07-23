import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../features/auth/providers/auth_provider.dart';
import '../features/exams/services/exam_session_manager.dart';
import 'route_paths.dart';

class NavigationGuard {
  static String? handleRedirect(Ref ref, BuildContext context, GoRouterState state) {
    final loc = state.uri.toString();
    final matchedLoc = state.matchedLocation;

    // 1. KIOSK LOCKDOWN GUARD (Highest Security Priority)
    final sessionManager = ref.read(examSessionManagerProvider);
    if (sessionManager.isKioskLocked) {
      final isAllowed = loc.startsWith('/exams') || loc.startsWith('/upload');
      if (!isAllowed) {
        return AppRoutePaths.examDetail;
      }
      return null;
    }

    // 2. AUTHENTICATION GUARD
    final authState = ref.read(authProvider);
    final isAuthenticated = authState.isAuthenticated;
    final isLoggingIn = matchedLoc == AppRoutePaths.login;
    final isSplash = matchedLoc == AppRoutePaths.splash;
    final isForgotPassword = matchedLoc.startsWith(AppRoutePaths.forgotPassword);

    if ((authState.isLoading && !isAuthenticated) || (authState.isOffline && !isAuthenticated)) {
      if (isSplash) return null;
      return AppRoutePaths.splash;
    }

    if (isSplash || isForgotPassword) return null;

    if (!isAuthenticated && !isLoggingIn) {
      return AppRoutePaths.login;
    }

    if (isAuthenticated && isLoggingIn) {
      return AppRoutePaths.dashboard;
    }

    return null;
  }
}
