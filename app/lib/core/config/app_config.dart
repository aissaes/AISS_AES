import 'package:flutter/foundation.dart';

class AppConfig {
  static const String appName = 'AISS AES';
  
  // Toggle to true to connect to your live Vercel production server, false for local loopbacks
  static const bool isProduction = false;
  
  static String get apiBaseUrl {
    if (isProduction) {
      return 'https://aiss-aes-backend.vercel.app';
    }
    if (kIsWeb) {
      return 'http://localhost:5000';
    } else if (defaultTargetPlatform == TargetPlatform.android) {
      return 'http://10.0.2.2:5000';
    } else {
      return 'http://localhost:5000';
    }
  }

  static const Duration connectionTimeout = Duration(seconds: 30);
  static const Duration receiveTimeout = Duration(seconds: 30);

  // Feature Flags
  static const bool enableScanner = true;

  // Upload Constraints
  static const int maxFileSizeMB = 50;
  static const List<String> allowedExtensions = ['pdf', 'jpg', 'jpeg', 'png'];
}
