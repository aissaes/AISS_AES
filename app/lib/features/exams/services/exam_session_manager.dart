import 'dart:convert';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/exam_session_state.dart';
import 'exam_state_machine.dart';
import '../../../core/security/exam_lock_service.dart';
import '../../upload/services/upload_queue_service.dart';
import '../../../core/storage/local_storage_service.dart';
import '../../../core/providers/storage_providers.dart';
import '../../../core/utils/app_logger.dart';
import 'exam_alarm_service.dart';

class ExamSessionManager {
  final LocalStorageService _storage;
  final ExamLockService _lockService;
  final UploadQueueService _queueService;

  ExamStateMachine? _stateMachine;
  Duration _serverTimeOffset = Duration.zero;

  ExamSessionManager(this._storage, this._lockService, this._queueService);

  ExamSession? get activeSession => _stateMachine?.currentSession;
  bool get isKioskLocked => _lockService.isExamModeActive ||
      (_stateMachine?.currentSession.sessionState == ExamSessionState.active);

  /// Synchronizes device system clock against authoritative server time
  void updateServerTimeOffset(DateTime serverUtc) {
    final nowUtc = DateTime.now().toUtc();
    _serverTimeOffset = serverUtc.difference(nowUtc);
  }

  /// Calculates authoritative UTC timestamp using verified server offset
  DateTime get nowUtc => DateTime.now().toUtc().add(_serverTimeOffset);

  /// Initializes or restores an examination session state machine
  Future<void> initializeOrRestoreSession(ExamSession session) async {
    final active = activeSession;
    if (active != null && active.examId == session.examId && active.isSessionActive) {
      AppLogger.d('[ExamSessionManager] Exam ${session.examId} is already active in memory.');
      return;
    }

    _stateMachine = ExamStateMachine(session);

    _stateMachine!.onStateChanged = (newState) async {
      await _handleSessionStateTransition(newState);
    };

    // Check for persisted state recovery
    final persistedJson = _storage.getString('backup_exam_session_${session.examId}');
    if (persistedJson != null && persistedJson.isNotEmpty) {
      try {
        final Map<String, dynamic> map = jsonDecode(persistedJson);
        final restoredSession = ExamSession.fromJson(map);
        _stateMachine = ExamStateMachine(restoredSession);
        _stateMachine!.onStateChanged = (newState) async {
          await _handleSessionStateTransition(newState);
        };
      } catch (e) {
        AppLogger.w('[ExamSessionManager] Failed to restore session JSON: $e');
      }
    }

    // Schedule Android native alarm wakeup for exam start
    try {
      final alarmService = ExamAlarmService();
      await alarmService.scheduleExamAlarm(
        examId: session.examId,
        examTimeUtc: session.startUtc,
      );
    } catch (e) {
      AppLogger.w('[ExamSessionManager] Failed to schedule alarm: $e');
    }

    // Evaluate current state against current time
    evaluateTimeGates();
  }

  /// Evaluates state machine rules against authoritative current time
  void evaluateTimeGates() {
    if (_stateMachine == null) return;
    _stateMachine!.evaluateTimeGates(nowUtc);
  }

  /// Handles locking, queue triggering, and security during state changes
  Future<void> _handleSessionStateTransition(ExamSessionState newState) async {
    final session = _stateMachine?.currentSession;
    if (session == null) return;

    AppLogger.d('[ExamSessionManager] Transitioning ${session.examId} to state: $newState');
    await _persistSessionState();

    switch (newState) {
      case ExamSessionState.scheduled:
      case ExamSessionState.buffer:
        break;

      case ExamSessionState.active:
        // Activate kiosk lockdown & wake screen
        await _lockService.enableExamLockdown();
        break;

      case ExamSessionState.gracePeriod:
        // Keep lockdown active during submission grace period
        if (!_lockService.isExamModeActive) {
          await _lockService.enableExamLockdown();
        }
        break;

      case ExamSessionState.submitting:
      case ExamSessionState.finalizing:
      case ExamSessionState.submitted:
        // Trigger auto upload background sync retry
        try {
          await _queueService.processPendingUploadQueue();
        } catch (e) {
          AppLogger.w('[ExamSessionManager] Queue sync warning: $e');
        }
        break;

      case ExamSessionState.completed:
      case ExamSessionState.expired:
      case ExamSessionState.closed:
        // Release kiosk lockdown when exam finishes
        await _lockService.disableExamLockdown();
        await _storage.remove('backup_exam_session_${session.examId}');
        
        // Cancel native alarm
        try {
          final alarmService = ExamAlarmService();
          await alarmService.cancelExamAlarm(session.examId);
        } catch (_) {}
        break;
    }
  }

  /// Manually trigger answer script submission
  Future<void> triggerFinalizeSubmission() async {
    if (_stateMachine == null) return;
    _stateMachine!.transitionTo(ExamSessionState.submitting);
    
    // Process queue
    await _queueService.processPendingUploadQueue();
    _stateMachine!.transitionTo(ExamSessionState.completed);
  }

  Future<void> _persistSessionState() async {
    if (_stateMachine?.currentSession == null) return;
    final jsonStr = jsonEncode(_stateMachine!.currentSession.toJson());
    await _storage.saveString('backup_exam_session_${_stateMachine!.currentSession.examId}', jsonStr);
  }
}

final examSessionManagerProvider = Provider<ExamSessionManager>((ref) {
  final storage = ref.watch(localStorageServiceProvider);
  final lockService = ref.watch(examLockServiceProvider);
  final queueService = ref.watch(uploadQueueServiceProvider);
  return ExamSessionManager(storage, lockService, queueService);
});
