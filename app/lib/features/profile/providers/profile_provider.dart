import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../repositories/student_repository_impl.dart';
import '../../../core/models/student_model.dart';

final studentProfileProvider = FutureProvider<StudentModel>((ref) async {
  final studentRepo = ref.watch(studentRepositoryProvider);
  return studentRepo.getProfile();
});
