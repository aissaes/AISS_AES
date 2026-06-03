import 'package:equatable/equatable.dart';

class CourseInfo extends Equatable {
  final String courseId;
  final String courseName;
  final int credits;
  final String faculty;

  const CourseInfo({
    required this.courseId,
    required this.courseName,
    required this.credits,
    required this.faculty,
  });

  factory CourseInfo.fromJson(Map<String, dynamic> json) {
    return CourseInfo(
      courseId: json['courseId'] ?? '',
      courseName: json['courseName'] ?? '',
      credits: json['credits'] ?? 3,
      faculty: json['faculty'] ?? '',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'courseId': courseId,
      'courseName': courseName,
      'credits': credits,
      'faculty': faculty,
    };
  }

  @override
  List<Object?> get props => [courseId, courseName, credits, faculty];
}

class CoursePerformance extends Equatable {
  final double attendancePercentage;
  final double internalMarksObtained;
  final double internalMaxMarks;
  final double internalPercentage;
  final double totalPercentage;
  final String predictedGrade;
  final double classAverageGpa;

  const CoursePerformance({
    required this.attendancePercentage,
    required this.internalMarksObtained,
    required this.internalMaxMarks,
    required this.internalPercentage,
    required this.totalPercentage,
    required this.predictedGrade,
    required this.classAverageGpa,
  });

  factory CoursePerformance.fromJson(Map<String, dynamic> json) {
    return CoursePerformance(
      attendancePercentage: (json['attendancePercentage'] as num?)?.toDouble() ?? 0.0,
      internalMarksObtained: (json['internalMarksObtained'] as num?)?.toDouble() ?? 0.0,
      internalMaxMarks: (json['internalMaxMarks'] as num?)?.toDouble() ?? 0.0,
      internalPercentage: (json['internalPercentage'] as num?)?.toDouble() ?? 0.0,
      totalPercentage: (json['totalPercentage'] as num?)?.toDouble() ?? 0.0,
      predictedGrade: json['predictedGrade'] ?? 'N/A',
      classAverageGpa: (json['classAverageGpa'] as num?)?.toDouble() ?? 0.0,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'attendancePercentage': attendancePercentage,
      'internalMarksObtained': internalMarksObtained,
      'internalMaxMarks': internalMaxMarks,
      'internalPercentage': internalPercentage,
      'totalPercentage': totalPercentage,
      'predictedGrade': predictedGrade,
      'classAverageGpa': classAverageGpa,
    };
  }

  @override
  List<Object?> get props => [
        attendancePercentage,
        internalMarksObtained,
        internalMaxMarks,
        internalPercentage,
        totalPercentage,
        predictedGrade,
        classAverageGpa,
      ];
}

class EvaluationItem extends Equatable {
  final String examId;
  final String examTitle;
  final String type; // e.g. "Quiz", "Mid Semester", "Final Semester"
  final String status; // e.g. "Completed", "Pending"
  final double? marksObtained;
  final double maxMarks;
  final double? percentage;

  const EvaluationItem({
    required this.examId,
    required this.examTitle,
    required this.type,
    required this.status,
    this.marksObtained,
    required this.maxMarks,
    this.percentage,
  });

  factory EvaluationItem.fromJson(Map<String, dynamic> json) {
    return EvaluationItem(
      examId: json['examId'] ?? '',
      examTitle: json['examTitle'] ?? '',
      type: json['type'] ?? '',
      status: json['status'] ?? '',
      marksObtained: json['marksObtained'] != null ? (json['marksObtained'] as num).toDouble() : null,
      maxMarks: (json['maxMarks'] as num?)?.toDouble() ?? 100.0,
      percentage: json['percentage'] != null ? (json['percentage'] as num).toDouble() : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'examId': examId,
      'examTitle': examTitle,
      'type': type,
      'status': status,
      'marksObtained': marksObtained,
      'maxMarks': maxMarks,
      'percentage': percentage,
    };
  }

  @override
  List<Object?> get props => [examId, examTitle, type, status, marksObtained, maxMarks, percentage];
}

class CourseDetailModel extends Equatable {
  final CourseInfo courseInfo;
  final CoursePerformance performance;
  final List<EvaluationItem> evaluationHistory;

  const CourseDetailModel({
    required this.courseInfo,
    required this.performance,
    required this.evaluationHistory,
  });

  factory CourseDetailModel.fromJson(Map<String, dynamic> json) {
    final historyRaw = json['evaluationHistory'] as List? ?? [];
    return CourseDetailModel(
      courseInfo: CourseInfo.fromJson(Map<String, dynamic>.from(json['courseInfo'] ?? {})),
      performance: CoursePerformance.fromJson(Map<String, dynamic>.from(json['performance'] ?? {})),
      evaluationHistory: historyRaw.map((e) => EvaluationItem.fromJson(Map<String, dynamic>.from(e))).toList(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'courseInfo': courseInfo.toJson(),
      'performance': performance.toJson(),
      'evaluationHistory': evaluationHistory.map((e) => e.toJson()).toList(),
    };
  }

  @override
  List<Object?> get props => [courseInfo, performance, evaluationHistory];
}
