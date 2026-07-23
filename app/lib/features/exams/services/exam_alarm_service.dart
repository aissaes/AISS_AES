import 'package:flutter/services.dart';
import '../../../core/utils/app_logger.dart';

class ExamAlarmService {
  static const MethodChannel _channel = MethodChannel('com.example.aiss_aes/alarm');

  /// Schedules an exact alarm at `examStartTime - 5 mins` to wake up the screen.
  static Future<bool> scheduleExamWakeupAlarm({
    required DateTime examStartTime,
    required String examId,
  }) async {
    try {
      final alarmTime = examStartTime.subtract(const Duration(minutes: 5));
      final int timeInMillis = alarmTime.millisecondsSinceEpoch;

      final bool success = await _channel.invokeMethod('scheduleAlarm', {
        'timeInMillis': timeInMillis,
        'examId': examId,
      }) ?? false;

      AppLogger.d('[ExamAlarmService] Scheduled exact alarm for exam $examId at $alarmTime: $success');
      return success;
    } catch (e) {
      AppLogger.w('[ExamAlarmService] Error scheduling exact alarm: $e');
      return false;
    }
  }

  /// Cancels any scheduled alarm for a given exam.
  static Future<bool> cancelExamWakeupAlarm(String examId) async {
    try {
      final bool success = await _channel.invokeMethod('cancelAlarm', {
        'examId': examId,
      }) ?? false;

      AppLogger.d('[ExamAlarmService] Cancelled alarm for exam $examId: $success');
      return success;
    } catch (e) {
      AppLogger.w('[ExamAlarmService] Error cancelling alarm: $e');
      return false;
    }
  }

  Future<bool> scheduleExamAlarm({
    required String examId,
    required DateTime examTimeUtc,
  }) async {
    return scheduleExamWakeupAlarm(examStartTime: examTimeUtc, examId: examId);
  }

  Future<bool> cancelExamAlarm(String examId) async {
    return cancelExamWakeupAlarm(examId);
  }
}
