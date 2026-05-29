import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/services/api_service.dart';

final studentTimetableAndExamsProvider = FutureProvider<Map<String, dynamic>>((ref) async {
  final apiService = ref.watch(apiServiceProvider);
  final data = await apiService.getStudentTimetableAndExams();
  return data;
});

final studentResultsProvider = FutureProvider<List<dynamic>>((ref) async {
  final apiService = ref.watch(apiServiceProvider);
  final data = await apiService.getStudentResults();
  final List<dynamic> exams = data['exams'] ?? [];
  return exams;
});

final studentDetailedResultProvider = FutureProvider.family<Map<String, dynamic>, String>((ref, examId) async {
  final apiService = ref.watch(apiServiceProvider);
  final data = await apiService.getStudentDetailedResult(examId);
  return data;
});
