import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../repositories/exam_repository_impl.dart';
import '../../../core/models/exam_model.dart';
import '../../../core/models/exam_result_model.dart';

final studentTimetableAndExamsProvider = FutureProvider<List<ExamModel>>((ref) async {
  final examRepo = ref.watch(examRepositoryProvider);
  return examRepo.getStudentTimetableAndExams();
});

final studentResultsProvider = FutureProvider<List<ExamResultModel>>((ref) async {
  final examRepo = ref.watch(examRepositoryProvider);
  return examRepo.getStudentResults();
});

final studentDetailedResultProvider = FutureProvider.family<ExamResultModel, String>((ref, examId) async {
  final examRepo = ref.watch(examRepositoryProvider);
  return examRepo.getStudentDetailedResult(examId);
});
