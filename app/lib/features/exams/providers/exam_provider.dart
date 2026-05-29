import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/services/api_service.dart';

final activeExamProvider = StateProvider<Map<String, dynamic>?>((ref) => null);

class SubmissionsNotifier extends StateNotifier<AsyncValue<Map<String, String>>> {
  final ApiService _apiService;
  final String? _examId;

  SubmissionsNotifier(this._apiService, this._examId) : super(const AsyncValue.loading()) {
    fetchSubmissions();
  }

  Future<void> fetchSubmissions() async {
    if (_examId == null) {
      state = const AsyncValue.data({});
      return;
    }
    
    try {
      final data = await _apiService.getStudentSubmissions(_examId!);
      
      // Parse map cleanly
      final answersRaw = data['answers'] ?? {};
      final Map<String, String> answers = {};
      if (answersRaw is Map) {
        answersRaw.forEach((k, v) {
          answers[k.toString()] = v.toString();
        });
      }
      
      state = AsyncValue.data(answers);
    } catch (e, stack) {
      state = AsyncValue.error(e, stack);
    }
  }
  
  void addSubmission(String questionId, String url) {
    state.whenData((data) {
      final newData = Map<String, String>.from(data);
      newData[questionId] = url;
      state = AsyncValue.data(newData);
    });
  }
}

final examSubmissionsProvider = StateNotifierProvider.family<SubmissionsNotifier, AsyncValue<Map<String, String>>, String>((ref, examId) {
  final apiService = ref.watch(apiServiceProvider);
  return SubmissionsNotifier(apiService, examId);
});
