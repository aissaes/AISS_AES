import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../services/api_service.dart';

abstract class ExamRepository {
  Future<Map<String, dynamic>> getExamByToken(String token);
}

class ExamRepositoryImpl implements ExamRepository {
  final ApiService _apiService;

  ExamRepositoryImpl(this._apiService);

  @override
  Future<Map<String, dynamic>> getExamByToken(String token) async {
    final response = await _apiService.getExam(token);
    if (response['success'] == true && response['message'] is Map) {
      return Map<String, dynamic>.from(response['message']);
    }
    throw ApiException(response['message']?.toString() ?? 'Failed to unlock exam.');
  }
}

final examRepositoryProvider = Provider<ExamRepository>((ref) {
  final apiService = ref.watch(apiServiceProvider);
  return ExamRepositoryImpl(apiService);
});
