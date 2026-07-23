abstract class AppException implements Exception {
  final String message;
  final String? prefix;
  
  AppException(this.message, [this.prefix]);
  
  @override
  String toString() => "${prefix ?? ''}$message";
}

class NetworkException extends AppException {
  NetworkException(String message) : super(message, "Network Error: ");
}

class ApiException extends AppException {
  final int? statusCode;
  ApiException(String message, {this.statusCode}) : super(message, "API Error: ");
}

class AuthException extends AppException {
  AuthException(String message) : super(message, "Authentication Error: ");
}

class OfflineException extends AppException {
  OfflineException([String message = 'No internet connection or server is offline.']) 
      : super(message, "Offline: ");
}

class RateLimitException extends AppException {
  RateLimitException(String message) : super(message, "Rate Limit Error: ");
}
