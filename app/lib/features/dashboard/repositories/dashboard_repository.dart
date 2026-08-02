import '../models/dashboard_data_model.dart';

abstract class DashboardRepository {
  Future<DashboardData> getStudentDashboard();
}
