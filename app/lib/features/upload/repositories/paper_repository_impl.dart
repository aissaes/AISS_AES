import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/models/upload_session_model.dart';
import '../../../../core/models/upload_response_model.dart';
import '../../../../core/models/submission_model.dart';
import '../../../../core/models/finalize_submission_model.dart';
import '../api/upload_api.dart';
import 'paper_repository.dart';

class PaperRepositoryImpl implements PaperRepository {
  final UploadApi _uploadApi;

  PaperRepositoryImpl(this._uploadApi);

  @override
  Future<UploadSessionModel> startUploadSession(String token) async {
    final response = await _uploadApi.startUploadSession(token);
    return UploadSessionModel.fromJson(Map<String, dynamic>.from(response.data));
  }

  @override
  Future<UploadResponseModel> uploadAnswerPage({
    required String token,
    required String questionId,
    required String filePath,
    required Function(double) onProgress,
  }) async {
    final response = await _uploadApi.uploadAnswerPage(
      token: token,
      questionId: questionId,
      filePath: filePath,
      onProgress: onProgress,
    );
    return UploadResponseModel.fromJson(Map<String, dynamic>.from(response.data));
  }

  @override
  Future<SubmissionModel> getStudentSubmissions(String examId) async {
    final response = await _uploadApi.getStudentSubmissions(examId);
    return SubmissionModel.fromJson(Map<String, dynamic>.from(response.data));
  }

  @override
  Future<FinalizeSubmissionModel> finalizeSubmission(String token) async {
    final response = await _uploadApi.finalizeSubmission(token);
    return FinalizeSubmissionModel.fromJson(Map<String, dynamic>.from(response.data));
  }
}

final paperRepositoryProvider = Provider<PaperRepository>((ref) {
  final uploadApi = ref.watch(uploadApiProvider);
  return PaperRepositoryImpl(uploadApi);
});
