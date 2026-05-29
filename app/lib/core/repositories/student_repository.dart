import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../services/api_service.dart';
import '../services/local_storage_service.dart';
import '../providers/storage_providers.dart';

abstract class StudentRepository {
  Future<Map<String, dynamic>> getProfile();
  Map<String, dynamic>? getCachedProfile();
  Future<void> clearCache();
}

class StudentRepositoryImpl implements StudentRepository {
  final ApiService _apiService;
  final LocalStorageService _storageService;

  StudentRepositoryImpl(this._apiService, this._storageService);

  @override
  Future<Map<String, dynamic>> getProfile() async {
    try {
      final response = await _apiService.get('/student/auth/profile');
      final dynamic studentData = response.data['student'];
      if (studentData is Map) {
        final Map<String, dynamic> profile = Map<String, dynamic>.from(studentData);
        await _storageService.saveStudentProfile(profile);
        return profile;
      }
      throw Exception('Invalid profile format received from server.');
    } catch (e) {
      // Return cached version on failure (Offline first!)
      final cached = getCachedProfile();
      if (cached != null) {
        return cached;
      }
      rethrow;
    }
  }

  @override
  Map<String, dynamic>? getCachedProfile() {
    return _storageService.getStudentProfile();
  }

  @override
  Future<void> clearCache() async {
    await _storageService.clearStudentProfile();
  }
}

final studentRepositoryProvider = Provider<StudentRepository>((ref) {
  final apiService = ref.watch(apiServiceProvider);
  final storageService = ref.watch(localStorageServiceProvider);
  return StudentRepositoryImpl(apiService, storageService);
});
