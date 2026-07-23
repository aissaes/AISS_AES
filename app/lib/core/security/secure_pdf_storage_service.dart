import 'dart:io';
import 'dart:typed_data';
import 'dart:math';
import 'dart:convert';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:encrypt/encrypt.dart' as enc;
import '../utils/app_logger.dart';

class SecurePdfStorageService {
  static const _secureStorage = FlutterSecureStorage();
  // Dynamically constructed storage slot label (no plain text string literal in binary)
  static final String _keyStorageAlias = String.fromCharCodes([
    97, 105, 115, 115, 95, 97, 101, 115, 95, 112, 100, 102, 95, 107, 101, 121, 95, 118, 49
  ]);
  static enc.Key? _cachedKey;

  /// Retrieves or generates a 256-bit AES master key stored in hardware keystore.
  static Future<enc.Key> _getOrCreateMasterKey() async {
    if (_cachedKey != null) return _cachedKey!;

    try {
      String? storedBase64Key = await _secureStorage.read(key: _keyStorageAlias);
      if (storedBase64Key == null) {
        final random = Random.secure();
        final keyBytes = List<int>.generate(32, (_) => random.nextInt(256));
        storedBase64Key = base64Encode(keyBytes);
        await _secureStorage.write(key: _keyStorageAlias, value: storedBase64Key);
        AppLogger.d('[SecurePdfStorage] Generated new 256-bit AES key in hardware keystore.');
      }
      _cachedKey = enc.Key.fromBase64(storedBase64Key);
      return _cachedKey!;
    } catch (e) {
      AppLogger.w('[SecurePdfStorage] Keystore unavailable ($e). Using dynamic cryptographically secure random key.');
      final random = Random.secure();
      final keyBytes = Uint8List.fromList(List<int>.generate(32, (_) => random.nextInt(256)));
      _cachedKey = enc.Key(keyBytes);
      return _cachedKey!;
    }
  }

  /// Encrypts PDF bytes using AES-256-CBC with a random 16-byte IV.
  /// Output format: IV (16 bytes) + Ciphertext
  static Future<Uint8List> encryptBytes(Uint8List plainBytes) async {
    final key = await _getOrCreateMasterKey();
    final iv = enc.IV.fromLength(16);
    final encrypter = enc.Encrypter(enc.AES(key, mode: enc.AESMode.cbc));
    
    final encrypted = encrypter.encryptBytes(plainBytes, iv: iv);
    
    final result = BytesBuilder();
    result.add(iv.bytes);
    result.add(encrypted.bytes);
    return result.toBytes();
  }

  /// Saves encrypted PDF bytes to target file path.
  static Future<File> writeEncryptedPdf(String filePath, Uint8List plainBytes) async {
    final encryptedBytes = await encryptBytes(plainBytes);
    final file = File(filePath);
    await file.writeAsBytes(encryptedBytes);
    AppLogger.d('[SecurePdfStorage] Encrypted PDF written to disk at: $filePath (${encryptedBytes.length} bytes)');
    return file;
  }

  /// Decrypts an encrypted PDF file from disk and returns the original plain PDF bytes.
  static Future<Uint8List> readDecryptedBytes(String filePath) async {
    final file = File(filePath);
    if (!await file.exists()) {
      throw Exception('Encrypted PDF file not found at path: $filePath');
    }

    final rawBytes = await file.readAsBytes();
    if (rawBytes.length < 16) {
      throw Exception('Invalid encrypted PDF file format (length < 16 bytes)');
    }

    final ivBytes = rawBytes.sublist(0, 16);
    final cipherBytes = rawBytes.sublist(16);

    final key = await _getOrCreateMasterKey();
    final iv = enc.IV(ivBytes);
    final encrypter = enc.Encrypter(enc.AES(key, mode: enc.AESMode.cbc));

    final decryptedList = encrypter.decryptBytes(enc.Encrypted(cipherBytes), iv: iv);
    return Uint8List.fromList(decryptedList);
  }
}
