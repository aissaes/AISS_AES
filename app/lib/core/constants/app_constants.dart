class AppConstants {
  static const String appName = 'AISS AES';
  static const String appVersion = '1.1.1+4';
  
  // Timeout Constants
  static const Duration apiTimeout = Duration(seconds: 30);
  static const Duration uploadTimeout = Duration(minutes: 15);
  static const Duration sessionBufferWindow = Duration(minutes: 10);
  
  // Exam Window Buffers
  static const Duration qrScanStartBuffer = Duration(minutes: 10);
  static const Duration qrScanEndBuffer = Duration(minutes: 10);
}
