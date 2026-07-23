import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../upload/services/upload_service.dart';
import '../models/exam_state.dart';
import '../../upload/models/submission_model.dart';

final activeExamProvider = StateProvider<ExamState>((ref) => const ExamState());

class SubmissionsNotifier extends StateNotifier<AsyncValue<SubmissionModel>> {
  final UploadService _uploadService;
  final String? _examId;

  SubmissionsNotifier(this._uploadService, this._examId) : super(const AsyncValue.loading()) {
    fetchSubmissions();
  }

  Future<void> fetchSubmissions() async {
    if (_examId == null) {
      state = const AsyncValue.data(SubmissionModel(uploads: {}));
      return;
    }
    
    try {
      final data = await _uploadService.getStudentSubmissions(_examId!);
      state = AsyncValue.data(data);
    } catch (exception) {
      state = AsyncValue.error(exception, StackTrace.current);
    }
  }
  
  void addSubmission(String questionId, String url) {
    state.whenData((submission) {
      final newUploads = Map<String, String>.from(submission.uploads);
      newUploads[questionId] = url;
      state = AsyncValue.data(submission.copyWith(uploads: newUploads));
    });
  }
}

final examSubmissionsProvider = StateNotifierProvider.family<SubmissionsNotifier, AsyncValue<SubmissionModel>, String>((ref, examId) {
  final uploadService = ref.watch(uploadServiceProvider);
  return SubmissionsNotifier(uploadService, examId);
});
