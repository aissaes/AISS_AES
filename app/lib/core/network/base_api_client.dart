import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../config/app_config.dart';
import '../storage/local_storage_service.dart';
import '../providers/storage_providers.dart';
import '../errors/app_exception.dart';

class BaseApiClient {
  final Dio dio;
  final LocalStorageService _storageService;
  void Function()? onUnauthorized;

  BaseApiClient(this._storageService) : dio = Dio(BaseOptions(
    baseUrl: AppConfig.apiBaseUrl,
    connectTimeout: AppConfig.connectionTimeout,
    receiveTimeout: AppConfig.receiveTimeout,
    contentType: 'application/json',
  )) {
    dio.interceptors.add(QueuedInterceptorsWrapper(
      onRequest: (options, handler) async {
        final token = await _storageService.getToken();
        if (token != null) {
          options.headers['Authorization'] = 'Bearer $token';
          options.headers['Cookie'] = 'token=$token';
        }
        return handler.next(options);
      },
      onError: (error, handler) async {
        final isRefreshEndpoint = error.requestOptions.path.contains('/refresh-token') || 
                                 error.requestOptions.path.contains('/login');

        if (error.response?.statusCode == 401 && !isRefreshEndpoint) {
          final refreshToken = await _storageService.getRefreshToken();
          if (refreshToken != null) {
            try {
              // Create clean client for refresh call to avoid interceptor loop
              final tokenDio = Dio(BaseOptions(baseUrl: AppConfig.apiBaseUrl));
              final refreshResponse = await tokenDio.post(
                '/api/student/auth/refresh-token',
                data: {'refreshToken': refreshToken},
                options: Options(headers: {'Cookie': 'refreshToken=$refreshToken'}),
              );

              if (refreshResponse.statusCode == 200 && refreshResponse.data['success'] == true) {
                final newToken = refreshResponse.data['token'] as String;
                final newRefreshToken = refreshResponse.data['refreshToken'] as String?;
                final userName = _storageService.getUserName() ?? 'Student';

                await _storageService.saveAuthData(
                  token: newToken,
                  refreshToken: newRefreshToken ?? refreshToken,
                  userName: userName,
                );

                // Retry original request with new token
                final opts = error.requestOptions;
                opts.headers['Authorization'] = 'Bearer $newToken';
                opts.headers['Cookie'] = 'token=$newToken';

                final response = await dio.fetch(opts);
                return handler.resolve(response);
              }
            } catch (_) {
              await _storageService.clearAuthData();
              onUnauthorized?.call();
            }
          } else {
            onUnauthorized?.call();
          }
        }

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
      if (response.statusCode == 429) {
        throw RateLimitException(errMsg);
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
