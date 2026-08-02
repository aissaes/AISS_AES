import '../../../../core/models/student_model.dart';

abstract class StudentRepository {
  Future<StudentModel> getProfile();
  StudentModel? getCachedProfile();
  Future<void> clearCache();
}
