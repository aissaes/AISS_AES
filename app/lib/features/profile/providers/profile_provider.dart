import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../services/student_service.dart';
import '../../../core/models/student_model.dart';

final studentProfileProvider = FutureProvider<StudentModel>((ref) async {
  final studentService = ref.watch(studentServiceProvider);
  return studentService.getProfile();
});
