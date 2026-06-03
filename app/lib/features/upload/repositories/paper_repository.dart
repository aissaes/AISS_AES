import '../../../../core/models/upload_session_model.dart';
import '../../../../core/models/upload_response_model.dart';
import '../../../../core/models/submission_model.dart';
import '../../../../core/models/finalize_submission_model.dart';

abstract class PaperRepository {
  Future<UploadSessionModel> startUploadSession(String token);
  Future<UploadResponseModel> uploadAnswerPage({
    required String token,
    required String questionId,
    required String filePath,
    required Function(double) onProgress,
  });
  Future<SubmissionModel> getStudentSubmissions(String examId);
  Future<FinalizeSubmissionModel> finalizeSubmission(String token);
}
