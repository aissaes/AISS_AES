import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:dio/dio.dart';
import '../../../../core/models/student_model.dart';
import '../../../../core/network/base_api_client.dart';
import '../../../../core/services/local_storage_service.dart';
import '../../../../core/providers/storage_providers.dart';
import '../../../../core/errors/app_exception.dart';
import 'student_repository.dart';

class StudentRepositoryImpl implements StudentRepository {
  final BaseApiClient _apiClient;
  final LocalStorageService _storageService;

  StudentRepositoryImpl(this._apiClient, this._storageService);

  @override
  Future<StudentModel> getProfile() async {
    try {
      final response = await _apiClient.dio.get('/student/auth/profile');
      final dynamic studentData = response.data['student'];
      if (studentData is Map) {
        final Map<String, dynamic> profileMap = Map<String, dynamic>.from(studentData);
        await _storageService.saveStudentProfile(profileMap);
        return StudentModel.fromJson(profileMap);
      }
      throw ApiException('Invalid profile format received from server.');
    } on DioException catch (e) {
      _apiClient.handleDioException(e);
      rethrow;
    }
  }

  @override
  StudentModel? getCachedProfile() {
    final profileMap = _storageService.getStudentProfile();
    if (profileMap != null) {
      return StudentModel.fromJson(profileMap);
    }
    return null;
  }

  @override
  Future<void> clearCache() async {
    await _storageService.clearStudentProfile();
  }
}

final studentRepositoryProvider = Provider<StudentRepository>((ref) {
  final apiClient = ref.watch(baseApiClientProvider);
  final storageService = ref.watch(localStorageServiceProvider);
  return StudentRepositoryImpl(apiClient, storageService);
});
