import 'package:equatable/equatable.dart';

class DashboardPriorityCard extends Equatable {
  final String type;
  final Map<String, dynamic> data;

  const DashboardPriorityCard({
    required this.type,
    required this.data,
  });

  factory DashboardPriorityCard.fromJson(Map<String, dynamic> json) {
    return DashboardPriorityCard(
      type: json['type'] ?? 'overview',
      data: Map<String, dynamic>.from(json['data'] ?? {}),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'type': type,
      'data': data,
    };
  }

  @override
  List<Object?> get props => [type, data];
}

class DashboardSemesterSnapshot extends Equatable {
  final String semesterName;
  final int coursesCount;
  final int totalCredits;
  final int upcomingExams;
  final int completedExams;

  const DashboardSemesterSnapshot({
    required this.semesterName,
    required this.coursesCount,
    required this.totalCredits,
    required this.upcomingExams,
    required this.completedExams,
  });

  factory DashboardSemesterSnapshot.fromJson(Map<String, dynamic> json) {
    return DashboardSemesterSnapshot(
      semesterName: json['semesterName'] ?? '',
      coursesCount: json['coursesCount'] ?? 0,
      totalCredits: json['totalCredits'] ?? 0,
      upcomingExams: json['upcomingExams'] ?? 0,
      completedExams: json['completedExams'] ?? 0,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'semesterName': semesterName,
      'coursesCount': coursesCount,
      'totalCredits': totalCredits,
      'upcomingExams': upcomingExams,
      'completedExams': completedExams,
    };
  }

  @override
  List<Object?> get props => [
        semesterName,
        coursesCount,
        totalCredits,
        upcomingExams,
        completedExams,
      ];
}

class DashboardLatestResult extends Equatable {
  final String examId;
  final String subjectName;
  final String subjectCode;
  final double marksObtained;
  final double maxMarks;

  const DashboardLatestResult({
    required this.examId,
    required this.subjectName,
    required this.subjectCode,
    required this.marksObtained,
    required this.maxMarks,
  });

  factory DashboardLatestResult.fromJson(Map<String, dynamic> json) {
    return DashboardLatestResult(
      examId: json['examId'] ?? '',
      subjectName: json['subjectName'] ?? '',
      subjectCode: json['subjectCode'] ?? '',
      marksObtained: (json['marksObtained'] as num?)?.toDouble() ?? 0.0,
      maxMarks: (json['maxMarks'] as num?)?.toDouble() ?? 100.0,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'examId': examId,
      'subjectName': subjectName,
      'subjectCode': subjectCode,
      'marksObtained': marksObtained,
      'maxMarks': maxMarks,
    };
  }

  @override
  List<Object?> get props => [
        examId,
        subjectName,
        subjectCode,
        marksObtained,
        maxMarks,
      ];
}

class DashboardRecentActivity extends Equatable {
  final String id;
  final String title;
  final DateTime timestamp;
  final String type; // e.g., submission, result, feedback, token, profile

  const DashboardRecentActivity({
    required this.id,
    required this.title,
    required this.timestamp,
    required this.type,
  });

  factory DashboardRecentActivity.fromJson(Map<String, dynamic> json) {
    return DashboardRecentActivity(
      id: json['id'] ?? '',
      title: json['title'] ?? '',
      timestamp: json['timestamp'] != null
          ? DateTime.parse(json['timestamp']).toLocal()
          : DateTime.now(),
      type: json['type'] ?? 'submission',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'title': title,
      'timestamp': timestamp.toUtc().toIso8601String(),
      'type': type,
    };
  }

  @override
  List<Object?> get props => [id, title, timestamp, type];
}

class DashboardData extends Equatable {
  final DashboardPriorityCard priorityCard;
  final DashboardSemesterSnapshot semesterSnapshot;
  final DashboardLatestResult? latestResult;
  final List<DashboardRecentActivity> recentActivity;

  const DashboardData({
    required this.priorityCard,
    required this.semesterSnapshot,
    this.latestResult,
    required this.recentActivity,
  });

  factory DashboardData.fromJson(Map<String, dynamic> json) {
    final activityList = (json['recentActivity'] as List?) ?? [];
    return DashboardData(
      priorityCard: DashboardPriorityCard.fromJson(
        Map<String, dynamic>.from(json['priorityCard'] ?? {}),
      ),
      semesterSnapshot: DashboardSemesterSnapshot.fromJson(
        Map<String, dynamic>.from(json['semesterSnapshot'] ?? {}),
      ),
      latestResult: json['latestResult'] != null
          ? DashboardLatestResult.fromJson(
              Map<String, dynamic>.from(json['latestResult']),
            )
          : null,
      recentActivity: activityList
          .map((item) =>
              DashboardRecentActivity.fromJson(Map<String, dynamic>.from(item)))
          .toList(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'priorityCard': priorityCard.toJson(),
      'semesterSnapshot': semesterSnapshot.toJson(),
      'latestResult': latestResult?.toJson(),
      'recentActivity': recentActivity.map((item) => item.toJson()).toList(),
    };
  }

  @override
  List<Object?> get props => [
        priorityCard,
        semesterSnapshot,
        latestResult,
        recentActivity,
      ];
}
