import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../services/exam_service.dart';
import '../models/exam_model.dart';
import '../models/exam_result_model.dart';

final studentTimetableAndExamsProvider = FutureProvider<List<ExamModel>>((ref) async {
  final examService = ref.watch(examServiceProvider);
  return examService.getStudentTimetableAndExams();
});

final studentResultsProvider = FutureProvider<List<ExamResultModel>>((ref) async {
  final examService = ref.watch(examServiceProvider);
  return examService.getStudentResults();
});

final studentDetailedResultProvider = FutureProvider.family<ExamResultModel, String>((ref, examId) async {
  final examService = ref.watch(examServiceProvider);
  return examService.getStudentDetailedResult(examId);
});
