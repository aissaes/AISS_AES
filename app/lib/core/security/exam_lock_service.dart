import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../utils/app_logger.dart';

class ExamLockService with WidgetsBindingObserver {
  bool _isExamModeActive = false;
  void Function(String eventType)? _onViolationCallback;

  bool get isExamModeActive => _isExamModeActive;

  /// Activates hardware and UI level Kiosk Lockdown for active exam.
  void enterExamMode({void Function(String eventType)? onViolation}) {
    if (!_isExamModeActive) {
      WidgetsBinding.instance.addObserver(this);
    }
    _isExamModeActive = true;
    _onViolationCallback = onViolation;

    // Enforce Immersive Sticky Fullscreen (Hides Status & Navigation Bars)
    SystemChrome.setEnabledSystemUIMode(SystemUiMode.immersiveSticky);
    SystemChrome.setPreferredOrientations([
      DeviceOrientation.portraitUp,
    ]);

    AppLogger.d('[ExamLockService] Entered Proctored Kiosk Exam Mode');
  }

  /// Exits Kiosk Lockdown and restores standard system UI overlays.
  void exitExamMode() {
    _isExamModeActive = false;
    _onViolationCallback = null;

    // Restore standard UI
    SystemChrome.setEnabledSystemUIMode(
      SystemUiMode.manual,
      overlays: SystemUiOverlay.values,
    );
    SystemChrome.setPreferredOrientations(DeviceOrientation.values);

    WidgetsBinding.instance.removeObserver(this);
    AppLogger.d('[ExamLockService] Exited Proctored Kiosk Exam Mode');
  }

  Future<void> enableExamLockdown({void Function(String eventType)? onViolation}) async {
    enterExamMode(onViolation: onViolation);
  }

  Future<void> disableExamLockdown() async {
    exitExamMode();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (!_isExamModeActive) return;

    if (state == AppLifecycleState.paused || state == AppLifecycleState.inactive) {
      AppLogger.w('[ExamLockService] VIOLATION DETECTED: App backgrounded/paused ($state)');
      _onViolationCallback?.call('APP_MINIMIZED');
    } else if (state == AppLifecycleState.resumed) {
      AppLogger.d('[ExamLockService] App resumed back into active exam window');
      // Re-enforce sticky immersive fullscreen on return
      SystemChrome.setEnabledSystemUIMode(SystemUiMode.immersiveSticky);
    }
  }
}

final examLockServiceProvider = Provider<ExamLockService>((ref) {
  return ExamLockService();
});
