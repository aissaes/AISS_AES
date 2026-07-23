import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../features/splash/screens/splash_screen.dart';
import '../features/auth/screens/login_screen.dart';
import '../features/auth/screens/forgot_password_screen.dart';
import '../features/auth/screens/otp_verification_screen.dart';
import '../features/auth/screens/reset_password_screen.dart';
import '../features/dashboard/dashboard_screen.dart';
import '../features/exams/exams_list/exams_list_screen.dart';
import '../features/exams/exam_detail/exam_detail_screen.dart';
import '../features/exams/screens/student_results_list_screen.dart';
import '../features/exams/student_result_detail/student_result_detail_screen.dart';
import '../features/academics/screens/academics_screen.dart';
import '../features/academics/screens/semester_detail_screen.dart';
import '../features/academics/screens/course_detail_screen.dart';
import '../features/academics/screens/timetable_detail_screen.dart';
import '../features/profile/screens/profile_screen.dart';
import '../features/profile/screens/change_password_screen.dart';
import '../features/upload/screens/scanner_screen.dart';
import '../features/upload/screens/crop_preview_screen.dart';
import '../features/upload/screens/review_scans_screen.dart';
import '../features/upload/submission_progress/submission_progress_screen.dart';
import '../features/upload/screens/quality_alert_screen.dart';
import '../features/upload/screens/upload_success_screen.dart';
import '../features/main_shell/screens/main_shell.dart';
import 'route_paths.dart';

class AppRoutes {
  /// Assembles all route groups into a single GoRouter routes list.
  static List<RouteBase> buildRoutes({
    required GlobalKey<NavigatorState> rootNavigatorKey,
    required GlobalKey<NavigatorState> dashboardKey,
    required GlobalKey<NavigatorState> examsKey,
    required GlobalKey<NavigatorState> academicsKey,
    required GlobalKey<NavigatorState> profileKey,
  }) {
    return [
      ..._authRoutes(),
      _tabShellRoute(
        dashboardKey: dashboardKey,
        examsKey: examsKey,
        academicsKey: academicsKey,
        profileKey: profileKey,
      ),
      ..._fullScreenModalRoutes(rootNavigatorKey),
    ];
  }

  // ─── 1. AUTHENTICATION & INITIAL ROUTES ───
  static List<RouteBase> _authRoutes() {
    return [
      GoRoute(
        path: AppRoutePaths.splash,
        builder: (context, state) => const SplashScreen(),
      ),
      GoRoute(
        path: AppRoutePaths.login,
        builder: (context, state) => const LoginScreen(),
      ),
      GoRoute(
        path: AppRoutePaths.forgotPassword,
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
    ];
  }

  // ─── 2. MAIN SHELL WITH BOTTOM TAB BRANCHES ───
  static RouteBase _tabShellRoute({
    required GlobalKey<NavigatorState> dashboardKey,
    required GlobalKey<NavigatorState> examsKey,
    required GlobalKey<NavigatorState> academicsKey,
    required GlobalKey<NavigatorState> profileKey,
  }) {
    return StatefulShellRoute.indexedStack(
      builder: (context, state, navigationShell) {
        return MainShell(navigationShell: navigationShell);
      },
      branches: [
        // Tab 1: Dashboard
        StatefulShellBranch(
          navigatorKey: dashboardKey,
          routes: [
            GoRoute(
              path: AppRoutePaths.dashboard,
              builder: (context, state) => const DashboardScreen(),
            ),
            GoRoute(
              path: AppRoutePaths.results,
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

        // Tab 2: Examinations
        StatefulShellBranch(
          navigatorKey: examsKey,
          routes: [
            GoRoute(
              path: AppRoutePaths.exams,
              builder: (context, state) => const ExamsListScreen(),
            ),
          ],
        ),

        // Tab 3: Academics
        StatefulShellBranch(
          navigatorKey: academicsKey,
          routes: [
            GoRoute(
              path: AppRoutePaths.academics,
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

        // Tab 4: Profile
        StatefulShellBranch(
          navigatorKey: profileKey,
          routes: [
            GoRoute(
              path: AppRoutePaths.profile,
              builder: (context, state) => const ProfileScreen(),
            ),
          ],
        ),
      ],
    );
  }

  // ─── 3. FULL SCREEN & MODAL OVERLAY ROUTES ───
  static List<RouteBase> _fullScreenModalRoutes(GlobalKey<NavigatorState> rootKey) {
    return [
      GoRoute(
        path: AppRoutePaths.uploadScanner,
        parentNavigatorKey: rootKey,
        builder: (context, state) => const ScannerScreen(),
      ),
      GoRoute(
        path: AppRoutePaths.uploadCropPreview,
        parentNavigatorKey: rootKey,
        builder: (context, state) {
          final imagePath = state.extra as String? ?? '';
          return CropPreviewScreen(imagePath: imagePath);
        },
      ),
      GoRoute(
        path: AppRoutePaths.changePassword,
        parentNavigatorKey: rootKey,
        builder: (context, state) => const ChangePasswordScreen(),
      ),
      GoRoute(
        path: AppRoutePaths.uploadReview,
        parentNavigatorKey: rootKey,
        builder: (context, state) => const ReviewScansScreen(),
      ),
      GoRoute(
        path: AppRoutePaths.uploadProgress,
        parentNavigatorKey: rootKey,
        builder: (context, state) => const SubmissionProgressScreen(),
      ),
      GoRoute(
        path: AppRoutePaths.uploadQualityAlert,
        parentNavigatorKey: rootKey,
        builder: (context, state) => const QualityAlertScreen(),
      ),
      GoRoute(
        path: AppRoutePaths.uploadSuccess,
        parentNavigatorKey: rootKey,
        builder: (context, state) => const UploadSuccessScreen(),
      ),
      GoRoute(
        path: AppRoutePaths.examDetail,
        parentNavigatorKey: rootKey,
        builder: (context, state) => const ExamDetailScreen(),
      ),
    ];
  }
}
