import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/dashboard_data_model.dart';
import '../services/dashboard_service.dart';

final dashboardDataProvider = FutureProvider<DashboardData>((ref) async {
  final service = ref.watch(dashboardServiceProvider);
  return service.getStudentDashboard();
});
