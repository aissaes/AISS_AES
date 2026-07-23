import 'package:flutter/foundation.dart';

/// Production-safe logger that automatically silences output in release builds.
class AppLogger {
  /// Debug log — active ONLY in debug/profile builds.
  static void d(String message) {
    if (kDebugMode) {
      debugPrint(message);
    }
  }

  /// Warning log — active ONLY in debug/profile builds.
  static void w(String message) {
    if (kDebugMode) {
      debugPrint('⚠️ [WARN] $message');
    }
  }

  /// Error log — active ONLY in debug/profile builds.
  static void e(String message, [Object? error, StackTrace? stackTrace]) {
    if (kDebugMode) {
      debugPrint('❌ [ERROR] $message ${error != null ? 'Details: $error' : ''}');
      if (stackTrace != null) {
        debugPrint(stackTrace.toString());
      }
    }
  }
}
