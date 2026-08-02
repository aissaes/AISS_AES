import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../features/splash/screens/splash_screen.dart';
import '../features/auth/screens/login_screen.dart';
import '../features/dashboard/screens/dashboard_screen.dart';
import '../features/upload/screens/upload_success_screen.dart';
import '../features/upload/screens/scanner_screen.dart';
import '../features/upload/screens/crop_preview_screen.dart';
import '../features/upload/screens/review_scans_screen.dart';
import '../features/upload/screens/submission_progress_screen.dart';
import '../features/upload/screens/quality_alert_screen.dart';
import '../features/profile/screens/profile_screen.dart';
import '../features/exams/screens/exams_list_screen.dart';
import '../features/exams/screens/exam_detail_screen.dart';
import '../features/exams/screens/student_results_list_screen.dart';
import '../features/exams/screens/student_result_detail_screen.dart';
import '../features/main_shell/screens/main_shell.dart';
import '../features/auth/providers/auth_provider.dart';
import '../features/academics/screens/academics_screen.dart';
import '../features/academics/screens/semester_detail_screen.dart';
import '../features/academics/screens/course_detail_screen.dart';
import '../features/academics/screens/timetable_detail_screen.dart';

import '../features/auth/screens/forgot_password_screen.dart';
import '../features/auth/screens/otp_verification_screen.dart';
import '../features/auth/screens/reset_password_screen.dart';
import '../features/profile/screens/change_password_screen.dart';

class RouterNotifier extends ChangeNotifier {
  final Ref _ref;

  RouterNotifier(this._ref) {
    _ref.listen<AuthState>(authProvider, (AuthState? prev, AuthState next) {
      debugPrint('AUTH CHANGED: prev=${prev?.isAuthenticated}, next=${next.isAuthenticated}, isLoading=${next.isLoading}');
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
final _shellNavigatorAcademicsKey = GlobalKey<NavigatorState>(debugLabel: 'shellAcademics');
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
              ),
            ],
          ),
          StatefulShellBranch(
            navigatorKey: _shellNavigatorAcademicsKey,
            routes: [
              GoRoute(
                path: '/academics',
                builder: (context, state) => const AcademicsScreen(),
                routes: [
                  GoRoute(
                    path: 'semester/:semId',
                    builder: (context, state) {
                      final semId = state.pathParameters['semId']!;
                      return SemesterDetailScreen(semesterId: semId);
                    },
                  ),
                  GoRoute(
                    path: 'course/:courseId',
                    builder: (context, state) {
                      final courseId = state.pathParameters['courseId']!;
                      return CourseDetailScreen(courseId: courseId);
                    },
                  ),
                  GoRoute(
                    path: 'timetable/:categoryId',
                    builder: (context, state) {
                      final categoryId = state.pathParameters['categoryId']!;
                      final semId = state.uri.queryParameters['semId'] ?? '';
                      return TimetableDetailScreen(semesterId: semId, categoryId: categoryId);
                    },
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
        path: '/upload/crop-preview',
        parentNavigatorKey: _rootNavigatorKey,
        builder: (context, state) {
          final imagePath = state.extra as String? ?? '';
          return CropPreviewScreen(imagePath: imagePath);
        },
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
      GoRoute(
        parentNavigatorKey: _rootNavigatorKey,
        path: '/exams/detail',
        builder: (context, state) => const ExamDetailScreen(),
      ),
    ],
    redirect: (context, state) {
      final authState = ref.read(authProvider);
      final isAuthenticated = authState.isAuthenticated;
      final isLoggingIn = state.matchedLocation == '/login';
      final isSplash = state.matchedLocation == '/splash';
      final isForgotPassword = state.matchedLocation.startsWith('/forgot-password');

      debugPrint('REDIRECT CALLED: matchedLocation=${state.matchedLocation}, isAuthenticated=$isAuthenticated, isLoading=${authState.isLoading}');

      // Keep them on splash screen if currently checking credentials and not authenticated, or if the server is offline and they are not authenticated
      if ((authState.isLoading && !isAuthenticated) || (authState.isOffline && !isAuthenticated)) {
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

