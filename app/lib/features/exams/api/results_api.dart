import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/network/base_api_client.dart';

class ResultsApi {
  final BaseApiClient _client;
  ResultsApi(this._client);

  Future<Response> getStudentResults() async {
    try {
      return await _client.dio.get('/results/student/my-exams');
    } on DioException catch (e) {
      _client.handleDioException(e);
      rethrow;
    }
  }

  Future<Response> getStudentDetailedResult(String examId) async {
    try {
      return await _client.dio.get('/results/student/exam/$examId');
    } on DioException catch (e) {
      _client.handleDioException(e);
      rethrow;
    }
  }
}

final resultsApiProvider = Provider<ResultsApi>((ref) {
  final client = ref.watch(baseApiClientProvider);
  return ResultsApi(client);
});
