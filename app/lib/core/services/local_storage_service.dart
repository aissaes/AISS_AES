import 'dart:convert';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:shared_preferences/shared_preferences.dart';

class LocalStorageService {
  final SharedPreferences _prefs;
  final FlutterSecureStorage _secureStorage;

  LocalStorageService(this._prefs, this._secureStorage);

  static const _keyToken = 'auth_token';
  static const _keyUserName = 'user_name';
  static const _keyIsLoggedIn = 'is_logged_in';
  static const _keyStudentProfile = 'student_profile';

  Future<void> saveAuthData({required String token, required String userName}) async {
    await _secureStorage.write(key: _keyToken, value: token);
    await _prefs.setString(_keyUserName, userName);
    await _prefs.setBool(_keyIsLoggedIn, true);
  }

  String? getUserName() => _prefs.getString(_keyUserName);
  
  Future<String?> getToken() => _secureStorage.read(key: _keyToken);

  bool isLoggedIn() => _prefs.getBool(_keyIsLoggedIn) ?? false;

  Future<void> clearAuthData() async {
    await _secureStorage.delete(key: _keyToken);
    await _prefs.remove(_keyUserName);
    await _prefs.setBool(_keyIsLoggedIn, false);
  }

  Future<void> saveStudentProfile(Map<String, dynamic> profile) async {
    await _prefs.setString(_keyStudentProfile, jsonEncode(profile));
  }

  Map<String, dynamic>? getStudentProfile() {
    final str = _prefs.getString(_keyStudentProfile);
    if (str != null) {
      try {
        return jsonDecode(str) as Map<String, dynamic>;
      } catch (_) {
        return null;
      }
    }
    return null;
  }

  Future<void> clearStudentProfile() async {
    await _prefs.remove(_keyStudentProfile);
  }
}

