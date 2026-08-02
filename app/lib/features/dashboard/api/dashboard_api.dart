import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/network/base_api_client.dart';

class DashboardApi {
  final BaseApiClient _client;
  DashboardApi(this._client);

  Future<Response> getStudentDashboard() async {
    try {
      return await _client.dio.get('/student/dashboard');
    } on DioException catch (e) {
      _client.handleDioException(e);
      rethrow;
    }
  }
}

final dashboardApiProvider = Provider<DashboardApi>((ref) {
  final client = ref.watch(baseApiClientProvider);
  return DashboardApi(client);
});
