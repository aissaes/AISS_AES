import '../models/exam_session_state.dart';
import '../../../core/utils/app_logger.dart';

class ExamStateMachine {
  ExamSession _currentSession;
  void Function(ExamSessionState)? onStateChanged;

  ExamStateMachine(this._currentSession);

  ExamSession get currentSession => _currentSession;

  void transitionTo(ExamSessionState newState) {
    if (transitionSessionTo(newState)) {
      onStateChanged?.call(newState);
    }
  }

  void evaluateTimeGates(DateTime nowUtc) {
    final start = _currentSession.startUtc;
    final end = _currentSession.endUtc;
    final bufferStart = start.subtract(const Duration(minutes: 10));
    final graceEnd = end.add(const Duration(minutes: 10));

    if (nowUtc.isAfter(bufferStart) && nowUtc.isBefore(start)) {
      transitionTo(ExamSessionState.buffer);
    } else if (nowUtc.isAfter(start) && nowUtc.isBefore(end)) {
      transitionTo(ExamSessionState.active);
    } else if (nowUtc.isAfter(end) && nowUtc.isBefore(graceEnd)) {
      transitionTo(ExamSessionState.gracePeriod);
    } else if (nowUtc.isAfter(graceEnd)) {
      transitionTo(ExamSessionState.expired);
    }
  }

  /// Validates and applies a Session State transition.
  bool transitionSessionTo(ExamSessionState newState) {
    final current = _currentSession.sessionState;

    if (current == newState) return true;

    bool isValid = false;
    switch (current) {
      case ExamSessionState.scheduled:
        isValid = newState == ExamSessionState.buffer || newState == ExamSessionState.active;
        break;
      case ExamSessionState.buffer:
        isValid = newState == ExamSessionState.active || newState == ExamSessionState.closed;
        break;
      case ExamSessionState.active:
        isValid = newState == ExamSessionState.submitting || newState == ExamSessionState.closed;
        break;
      case ExamSessionState.gracePeriod:
        isValid = newState == ExamSessionState.submitting || newState == ExamSessionState.closed || newState == ExamSessionState.completed;
        break;
      case ExamSessionState.submitting:
        isValid = newState == ExamSessionState.finalizing || newState == ExamSessionState.completed || newState == ExamSessionState.closed;
        break;
      case ExamSessionState.finalizing:
        isValid = newState == ExamSessionState.submitted || newState == ExamSessionState.completed || newState == ExamSessionState.closed;
        break;
      case ExamSessionState.submitted:
      case ExamSessionState.completed:
      case ExamSessionState.expired:
      case ExamSessionState.closed:
        isValid = false; // Terminal states
        break;
    }

    if (isValid) {
      _currentSession = _currentSession.copyWith(sessionState: newState);
      AppLogger.d('[ExamStateMachine] Session transition: $current -> $newState');
      return true;
    } else {
      AppLogger.w('[ExamStateMachine] INVALID Session transition attempt: $current -> $newState');
      return false;
    }
  }

  /// Validates and applies a Workflow State transition.
  bool transitionWorkflowTo(ExamWorkflowState newWorkflow) {
    final current = _currentSession.workflowState;

    if (current == newWorkflow) return true;

    bool isValid = false;
    switch (current) {
      case ExamWorkflowState.idle:
        isValid = newWorkflow == ExamWorkflowState.qrScanned;
        break;
      case ExamWorkflowState.qrScanned:
        isValid = newWorkflow == ExamWorkflowState.bookletCapturing || newWorkflow == ExamWorkflowState.idle;
        break;
      case ExamWorkflowState.bookletCapturing:
        isValid = newWorkflow == ExamWorkflowState.review || newWorkflow == ExamWorkflowState.idle;
        break;
      case ExamWorkflowState.review:
        isValid = newWorkflow == ExamWorkflowState.uploading || newWorkflow == ExamWorkflowState.bookletCapturing;
        break;
      case ExamWorkflowState.uploading:
        isValid = newWorkflow == ExamWorkflowState.completed || newWorkflow == ExamWorkflowState.idle;
        break;
      case ExamWorkflowState.completed:
        isValid = false; // Terminal workflow state
        break;
    }

    if (isValid) {
      _currentSession = _currentSession.copyWith(workflowState: newWorkflow);
      AppLogger.d('[ExamStateMachine] Workflow transition: $current -> $newWorkflow');
      return true;
    } else {
      AppLogger.w('[ExamStateMachine] INVALID Workflow transition attempt: $current -> $newWorkflow');
      return false;
    }
  }

  void incrementWarningCount() {
    final count = _currentSession.warningCount + 1;
    _currentSession = _currentSession.copyWith(warningCount: count);
  }

  void updateCachedScans(List<String> paths) {
    _currentSession = _currentSession.copyWith(cachedScanPaths: paths);
  }
}
