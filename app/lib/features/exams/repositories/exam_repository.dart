import '../../../../core/models/exam_model.dart';
import '../../../../core/models/exam_result_model.dart';

abstract class ExamRepository {
  Future<ExamModel> getExamByToken(String token);
  Future<List<ExamModel>> getStudentTimetableAndExams();
  Future<List<ExamResultModel>> getStudentResults();
  Future<ExamResultModel> getStudentDetailedResult(String examId);
}
