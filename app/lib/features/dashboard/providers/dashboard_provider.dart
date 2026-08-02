import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/dashboard_data_model.dart';
import '../repositories/dashboard_repository_impl.dart';

final dashboardDataProvider = FutureProvider<DashboardData>((ref) async {
  final repo = ref.watch(dashboardRepositoryProvider);
  return repo.getStudentDashboard();
});
