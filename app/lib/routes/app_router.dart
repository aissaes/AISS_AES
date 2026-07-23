import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'router_notifier.dart';
import 'navigation_guard.dart';
import 'app_routes.dart';
import 'route_paths.dart';

final _rootNavigatorKey = GlobalKey<NavigatorState>();
final _shellNavigatorDashboardKey = GlobalKey<NavigatorState>(debugLabel: 'shellDashboard');
final _shellNavigatorExamsKey = GlobalKey<NavigatorState>(debugLabel: 'shellExams');
final _shellNavigatorAcademicsKey = GlobalKey<NavigatorState>(debugLabel: 'shellAcademics');
final _shellNavigatorProfileKey = GlobalKey<NavigatorState>(debugLabel: 'shellProfile');

final routerProvider = Provider<GoRouter>((ref) {
  final routerNotifier = ref.read(routerNotifierProvider);

  return GoRouter(
    initialLocation: AppRoutePaths.splash,
    navigatorKey: _rootNavigatorKey,
    refreshListenable: routerNotifier,
    redirect: (context, state) => NavigationGuard.handleRedirect(ref, context, state),
    routes: AppRoutes.buildRoutes(
      rootNavigatorKey: _rootNavigatorKey,
      dashboardKey: _shellNavigatorDashboardKey,
      examsKey: _shellNavigatorExamsKey,
      academicsKey: _shellNavigatorAcademicsKey,
      profileKey: _shellNavigatorProfileKey,
    ),
  );
});
