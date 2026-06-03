import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../config/app_config.dart';
import '../services/local_storage_service.dart';
import '../providers/storage_providers.dart';
import '../errors/app_exception.dart';

class BaseApiClient {
  final Dio dio;
  final LocalStorageService _storageService;

  BaseApiClient(this._storageService) : dio = Dio(BaseOptions(
    baseUrl: AppConfig.apiBaseUrl,
    connectTimeout: AppConfig.connectionTimeout,
    receiveTimeout: AppConfig.receiveTimeout,
    contentType: 'application/json',
  )) {
    dio.interceptors.add(InterceptorsWrapper(
      onRequest: (options, handler) async {
        final token = await _storageService.getToken();
        if (token != null) {
          options.headers['Authorization'] = 'Bearer $token';
          options.headers['Cookie'] = 'token=$token';
        }
        return handler.next(options);
      },
      onError: (error, handler) {
        if (error.type == DioExceptionType.connectionTimeout ||
            error.type == DioExceptionType.sendTimeout ||
            error.type == DioExceptionType.receiveTimeout ||
            error.type == DioExceptionType.connectionError) {
          return handler.next(DioException(
            requestOptions: error.requestOptions,
            error: OfflineException(),
            type: error.type,
            message: 'Server unreachable or offline.',
          ));
        }
        return handler.next(error);
      },
    ));
  }

  void handleDioException(DioException e) {
    if (e.error is AppException) {
      throw e.error as AppException;
    }
    
    final response = e.response;
    if (response != null) {
      final data = response.data;
      String errMsg = 'An unexpected error occurred';
      if (data is Map) {
        errMsg = data['message'] ?? data['error'] ?? errMsg;
      }
      throw ApiException(errMsg, statusCode: response.statusCode);
    } else {
      throw OfflineException('Network error: server is unreachable.');
    }
  }
}

final baseApiClientProvider = Provider<BaseApiClient>((ref) {
  final storage = ref.watch(localStorageServiceProvider);
  return BaseApiClient(storage);
});
