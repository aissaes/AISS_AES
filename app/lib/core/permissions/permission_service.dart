import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../storage/local_storage_service.dart';
import '../providers/storage_providers.dart';

class PermissionService {
  final LocalStorageService _storage;

  PermissionService(this._storage);

  static const MethodChannel _alarmChannel = MethodChannel('com.example.aiss_aes/alarm');

  /// Checks if compulsory permissions (Camera & Exact Alarms) are missing.
  /// Compulsory permissions are prompted persistently ("ask again and again") until granted.
  Future<bool> verifyCompulsoryPermissions(BuildContext context, {bool forcePrompt = false}) async {
    bool hasExactAlarm = true;
    try {
      final res = await _alarmChannel.invokeMethod<bool>('canScheduleExactAlarms');
      hasExactAlarm = res ?? true;
    } catch (_) {}

    if (!hasExactAlarm && context.mounted) {
      await showDialog<void>(
        context: context,
        barrierDismissible: false,
        builder: (ctx) => AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          title: const Row(
            children: [
              Icon(Icons.alarm_on_rounded, color: Colors.orange),
              SizedBox(width: 10),
              Text(
                'Compulsory Exam Permission',
                style: TextStyle(fontSize: 17, fontWeight: FontWeight.bold),
              ),
            ],
          ),
          content: const Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Exact Alarm permission is compulsory for auto-starting & waking up your device at scheduled exam start times.',
                style: TextStyle(fontSize: 14, color: Color(0xFF334155), height: 1.4),
              ),
              SizedBox(height: 12),
              Text(
                'Please enable "Alarms & Reminders" permission in system settings to proceed with exams.',
                style: TextStyle(fontSize: 13, color: Color(0xFF64748B), fontWeight: FontWeight.w500),
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(ctx).pop(),
              child: const Text('Cancel', style: TextStyle(color: Colors.grey)),
            ),
            ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF0284C7),
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
              ),
              onPressed: () async {
                Navigator.of(ctx).pop();
                try {
                  await _alarmChannel.invokeMethod('openExactAlarmSettings');
                } catch (_) {}
              },
              child: const Text('Open Settings'),
            ),
          ],
        ),
      );
      return false;
    }
    return true;
  }

  /// Prompts optional onboarding permissions ONCE. If already prompted, remembers preference ("don't ask again").
  Future<void> checkAndPromptOptionalPermissions(BuildContext context) async {
    if (_storage.hasPromptedPermissions()) {
      return; // Optional permissions already prompted once - do not ask again!
    }

    await showDialog<void>(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Row(
          children: [
            Icon(Icons.security, color: Color(0xFF0284C7)),
            SizedBox(width: 10),
            Text(
              'Exam Integrity Setup',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
          ],
        ),
        content: const Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'AISS AES configures proctored security settings during scheduled examination windows:',
              style: TextStyle(fontSize: 14, color: Color(0xFF334155)),
            ),
            SizedBox(height: 12),
            Row(
              children: [
                Icon(Icons.fullscreen, size: 20, color: Color(0xFF0284C7)),
                SizedBox(width: 8),
                Expanded(
                  child: Text('Fullscreen Kiosk Lockdown', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
                ),
              ],
            ),
            SizedBox(height: 6),
            Row(
              children: [
                Icon(Icons.screen_lock_portrait, size: 20, color: Color(0xFF0284C7)),
                SizedBox(width: 8),
                Expanded(
                  child: Text('Prevent Screen Sleep & App Switching', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
                ),
              ],
            ),
            SizedBox(height: 6),
            Row(
              children: [
                Icon(Icons.camera_alt_outlined, size: 20, color: Color(0xFF0284C7)),
                SizedBox(width: 8),
                Expanded(
                  child: Text('Document Camera Scanner Access', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
                ),
              ],
            ),
            SizedBox(height: 12),
            Text(
              'Compulsory camera & alarm permissions will be requested during exam entry.',
              style: TextStyle(fontSize: 12, color: Color(0xFF64748B), fontStyle: FontStyle.italic),
            ),
          ],
        ),
        actions: [
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF0284C7),
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
            ),
            onPressed: () async {
              await _storage.setPermissionsPrompted(true);
              if (ctx.mounted) {
                Navigator.of(ctx).pop();
              }
            },
            child: const Text('I Understand'),
          ),
        ],
      ),
    );
  }
}

final permissionServiceProvider = Provider<PermissionService>((ref) {
  final storage = ref.watch(localStorageServiceProvider);
  return PermissionService(storage);
});
