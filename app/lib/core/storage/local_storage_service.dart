import 'dart:convert';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:shared_preferences/shared_preferences.dart';

class LocalStorageService {
  final SharedPreferences _prefs;
  final FlutterSecureStorage _secureStorage;

  LocalStorageService(this._prefs, this._secureStorage);

  static const _keyToken = 'auth_token';
  static const _keyRefreshToken = 'refresh_token';
  static const _keyUserName = 'user_name';
  static const _keyIsLoggedIn = 'is_logged_in';
  static const _keyStudentProfile = 'student_profile';
  static const _keyPermissionsPrompted = 'permissions_prompted';

  Future<void> setPermissionsPrompted(bool value) async {
    await _prefs.setBool(_keyPermissionsPrompted, value);
  }

  bool hasPromptedPermissions() {
    return _prefs.getBool(_keyPermissionsPrompted) ?? false;
  }

  Future<void> saveAuthData({required String token, String? refreshToken, required String userName}) async {
    await _secureStorage.write(key: _keyToken, value: token);
    if (refreshToken != null) {
      await _secureStorage.write(key: _keyRefreshToken, value: refreshToken);
    }
    await _prefs.setString(_keyUserName, userName);
    await _prefs.setBool(_keyIsLoggedIn, true);
  }

  String? getUserName() => _prefs.getString(_keyUserName);
  
  Future<String?> getToken() => _secureStorage.read(key: _keyToken);

  Future<String?> getRefreshToken() => _secureStorage.read(key: _keyRefreshToken);

  bool isLoggedIn() => _prefs.getBool(_keyIsLoggedIn) ?? false;

  Future<void> clearAuthData() async {
    await _secureStorage.delete(key: _keyToken);
    await _secureStorage.delete(key: _keyRefreshToken);
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

  Future<void> saveString(String key, String value) async {
    await _prefs.setString(key, value);
  }

  String? getString(String key) {
    return _prefs.getString(key);
  }

  Future<void> remove(String key) async {
    await _prefs.remove(key);
  }
}

