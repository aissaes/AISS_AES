import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/errors/app_exception.dart';
import '../api/dashboard_api.dart';
import '../models/dashboard_data_model.dart';
import 'dashboard_repository.dart';

class DashboardRepositoryImpl implements DashboardRepository {
  final DashboardApi _api;

  DashboardRepositoryImpl(this._api);

  @override
  Future<DashboardData> getStudentDashboard() async {
    final response = await _api.getStudentDashboard();
    final data = Map<String, dynamic>.from(response.data);
    if (data['success'] == true && data['data'] != null) {
      return DashboardData.fromJson(Map<String, dynamic>.from(data['data']));
    }
    throw ApiException(data['message']?.toString() ?? 'Failed to load student dashboard.');
  }
}

final dashboardRepositoryProvider = Provider<DashboardRepository>((ref) {
  final api = ref.watch(dashboardApiProvider);
  return DashboardRepositoryImpl(api);
});
