import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../features/splash/presentation/splash_screen.dart';
import '../features/auth/presentation/login_screen.dart';
import '../features/dashboard/presentation/dashboard_screen.dart';
import '../features/upload/presentation/upload_success_screen.dart';
import '../features/upload/presentation/scanner_screen.dart';
import '../features/upload/presentation/review_scans_screen.dart';
import '../features/upload/presentation/submission_progress_screen.dart';
import '../features/upload/presentation/quality_alert_screen.dart';
import '../features/profile/presentation/profile_screen.dart';
import '../features/exams/presentation/exams_list_screen.dart';
import '../features/exams/presentation/exam_detail_screen.dart';
import '../features/exams/presentation/student_results_list_screen.dart';
import '../features/exams/presentation/student_result_detail_screen.dart';
import '../features/main_shell/presentation/main_shell.dart';
import '../features/auth/providers/auth_provider.dart';

import '../features/auth/presentation/forgot_password_screen.dart';
import '../features/auth/presentation/otp_verification_screen.dart';
import '../features/auth/presentation/reset_password_screen.dart';
import '../features/profile/presentation/change_password_screen.dart';

class RouterNotifier extends ChangeNotifier {
  final Ref _ref;

  RouterNotifier(this._ref) {
    _ref.listen(authProvider, (_, __) {
      notifyListeners();
    });
  }
}

final routerNotifierProvider = Provider<RouterNotifier>((ref) {
  return RouterNotifier(ref);
});

final _rootNavigatorKey = GlobalKey<NavigatorState>();
final _shellNavigatorDashboardKey = GlobalKey<NavigatorState>(debugLabel: 'shellDashboard');
final _shellNavigatorExamsKey = GlobalKey<NavigatorState>(debugLabel: 'shellExams');
final _shellNavigatorProfileKey = GlobalKey<NavigatorState>(debugLabel: 'shellProfile');

final routerProvider = Provider<GoRouter>((ref) {
  final routerNotifier = ref.read(routerNotifierProvider);

  return GoRouter(
    initialLocation: '/splash',
    navigatorKey: _rootNavigatorKey,
    refreshListenable: routerNotifier,
    routes: [
      GoRoute(
        path: '/splash',
        builder: (context, state) => const SplashScreen(),
      ),
      GoRoute(
        path: '/login',
        builder: (context, state) => const LoginScreen(),
      ),
      GoRoute(
        path: '/forgot-password',
        builder: (context, state) => const ForgotPasswordScreen(),
        routes: [
          GoRoute(
            path: 'otp',
            builder: (context, state) {
              final email = state.extra as String? ?? '';
              return OtpVerificationScreen(email: email);
            },
          ),
          GoRoute(
            path: 'reset',
            builder: (context, state) {
              final extra = state.extra as Map<String, String>? ?? {};
              final email = extra['email'] ?? '';
              final otp = extra['otp'] ?? '';
              return ResetPasswordScreen(email: email, otp: otp);
            },
          ),
        ],
      ),
      StatefulShellRoute.indexedStack(
        builder: (context, state, navigationShell) {
          return MainShell(navigationShell: navigationShell);
        },
        branches: [
          StatefulShellBranch(
            navigatorKey: _shellNavigatorDashboardKey,
            routes: [
              GoRoute(
                path: '/dashboard',
                builder: (context, state) => const DashboardScreen(),
              ),
              GoRoute(
                path: '/results',
                builder: (context, state) => const StudentResultsListScreen(),
                routes: [
                  GoRoute(
                    path: 'detail/:examId',
                    builder: (context, state) {
                      final examId = state.pathParameters['examId']!;
                      return StudentResultDetailScreen(examId: examId);
                    },
                  ),
                ],
              ),
            ],
          ),
          StatefulShellBranch(
            navigatorKey: _shellNavigatorExamsKey,
            routes: [
              GoRoute(
                path: '/exams',
                builder: (context, state) => const ExamsListScreen(),
                routes: [
                  GoRoute(
                    path: 'detail',
                    builder: (context, state) => const ExamDetailScreen(),
                  ),
                ],
              ),
            ],
          ),
          StatefulShellBranch(
            navigatorKey: _shellNavigatorProfileKey,
            routes: [
              GoRoute(
                path: '/profile',
                builder: (context, state) => const ProfileScreen(),
              ),
            ],
          ),
        ],
      ),
      GoRoute(
        path: '/upload/scanner',
        parentNavigatorKey: _rootNavigatorKey,
        builder: (context, state) => const ScannerScreen(),
      ),
      GoRoute(
        path: '/change-password',
        parentNavigatorKey: _rootNavigatorKey,
        builder: (context, state) => const ChangePasswordScreen(),
      ),
      GoRoute(
        path: '/upload/review',
        parentNavigatorKey: _rootNavigatorKey,
        builder: (context, state) => const ReviewScansScreen(),
      ),
      GoRoute(
        path: '/upload/progress',
        parentNavigatorKey: _rootNavigatorKey,
        builder: (context, state) => const SubmissionProgressScreen(),
      ),
      GoRoute(
        path: '/upload/quality-alert',
        parentNavigatorKey: _rootNavigatorKey,
        builder: (context, state) => const QualityAlertScreen(),
      ),
      GoRoute(
        parentNavigatorKey: _rootNavigatorKey,
        path: '/upload-success',
        builder: (context, state) => const UploadSuccessScreen(),
      ),
    ],
    redirect: (context, state) {
      final authState = ref.read(authProvider);
      final isAuthenticated = authState.isAuthenticated;
      final isLoggingIn = state.matchedLocation == '/login';
      final isSplash = state.matchedLocation == '/splash';
      final isForgotPassword = state.matchedLocation.startsWith('/forgot-password');

      // Keep them on splash screen if currently checking credentials or server is offline
      if (authState.isLoading || authState.isOffline) {
        if (isSplash) return null;
        return '/splash';
      }

      if (isSplash || isForgotPassword) return null;

      if (!isAuthenticated && !isLoggingIn) {
        return '/login';
      }

      if (isAuthenticated && isLoggingIn) {
        return '/dashboard';
      }

      return null;
    },
  );
});

