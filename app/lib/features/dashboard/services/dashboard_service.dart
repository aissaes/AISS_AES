import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/network/base_api_client.dart';
import '../../../core/errors/app_exception.dart';
import '../models/dashboard_data_model.dart';

class DashboardService {
  final BaseApiClient _client;

  DashboardService(this._client);

  Future<DashboardData> getStudentDashboard() async {
    try {
      final response = await _client.dio.get('/student/dashboard');
      final data = Map<String, dynamic>.from(response.data);
      if (data['success'] == true && data['data'] != null) {
        return DashboardData.fromJson(Map<String, dynamic>.from(data['data']));
      }
      throw ApiException(data['message']?.toString() ?? 'Failed to load student dashboard.');
    } on DioException catch (e) {
      _client.handleDioException(e);
      rethrow;
    }
  }
}

final dashboardServiceProvider = Provider<DashboardService>((ref) {
  final client = ref.watch(baseApiClientProvider);
  return DashboardService(client);
});
