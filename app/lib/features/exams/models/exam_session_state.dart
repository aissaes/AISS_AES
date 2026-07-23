import '../../../core/utils/app_logger.dart';

enum ExamSessionState {
  scheduled,
  buffer,
  active,
  gracePeriod,
  submitting,
  finalizing,
  submitted,
  completed,
  expired,
  closed,
}

enum ExamWorkflowState {
  idle,
  qrScanned,
  bookletCapturing,
  review,
  uploading,
  completed,
}

class ExamSession {
  final String examId;
  final String examToken;
  final DateTime startUtc;
  final DateTime endUtc;
  final ExamSessionState sessionState;
  final ExamWorkflowState workflowState;
  final int warningCount;
  final List<String> cachedScanPaths;
  final bool isSubmittedOnServer;

  const ExamSession({
    required this.examId,
    required this.examToken,
    required this.startUtc,
    required this.endUtc,
    this.sessionState = ExamSessionState.scheduled,
    this.workflowState = ExamWorkflowState.idle,
    this.warningCount = 0,
    this.cachedScanPaths = const [],
    this.isSubmittedOnServer = false,
  });

  bool get isSessionActive =>
      sessionState == ExamSessionState.active ||
      sessionState == ExamSessionState.gracePeriod ||
      sessionState == ExamSessionState.submitting ||
      sessionState == ExamSessionState.buffer;

  ExamSession copyWith({
    String? examId,
    String? examToken,
    DateTime? startUtc,
    DateTime? endUtc,
    ExamSessionState? sessionState,
    ExamWorkflowState? workflowState,
    int? warningCount,
    List<String>? cachedScanPaths,
    bool? isSubmittedOnServer,
  }) {
    return ExamSession(
      examId: examId ?? this.examId,
      examToken: examToken ?? this.examToken,
      startUtc: startUtc ?? this.startUtc,
      endUtc: endUtc ?? this.endUtc,
      sessionState: sessionState ?? this.sessionState,
      workflowState: workflowState ?? this.workflowState,
      warningCount: warningCount ?? this.warningCount,
      cachedScanPaths: cachedScanPaths ?? this.cachedScanPaths,
      isSubmittedOnServer: isSubmittedOnServer ?? this.isSubmittedOnServer,
    );
  }

  Map<String, dynamic> toJson() => {
        'examId': examId,
        'examToken': examToken,
        'startUtc': startUtc.toIso8601String(),
        'endUtc': endUtc.toIso8601String(),
        'sessionState': sessionState.name,
        'workflowState': workflowState.name,
        'warningCount': warningCount,
        'cachedScanPaths': cachedScanPaths,
        'isSubmittedOnServer': isSubmittedOnServer,
      };

  factory ExamSession.fromJson(Map<String, dynamic> json) => ExamSession(
        examId: json['examId'] as String,
        examToken: json['examToken'] as String? ?? '',
        startUtc: DateTime.parse(json['startUtc'] as String),
        endUtc: DateTime.parse(json['endUtc'] as String),
        sessionState: ExamSessionState.values.firstWhere(
          (e) => e.name == json['sessionState'],
          orElse: () {
            AppLogger.w('[ExamSession.fromJson] Unrecognized sessionState "${json['sessionState']}". Falling back to scheduled.');
            return ExamSessionState.scheduled;
          },
        ),
        workflowState: ExamWorkflowState.values.firstWhere(
          (e) => e.name == json['workflowState'],
          orElse: () {
            AppLogger.w('[ExamSession.fromJson] Unrecognized workflowState "${json['workflowState']}". Falling back to idle.');
            return ExamWorkflowState.idle;
          },
        ),
        warningCount: json['warningCount'] as int? ?? 0,
        cachedScanPaths: (json['cachedScanPaths'] as List<dynamic>?)
                ?.map((e) => e as String)
                .toList() ??
            const [],
        isSubmittedOnServer: json['isSubmittedOnServer'] as bool? ?? false,
      );
}
