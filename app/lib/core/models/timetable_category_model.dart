import 'package:equatable/equatable.dart';

class TimetableCategoryModel extends Equatable {
  final String categoryId;
  final String categoryName;
  final String code; // e.g. "MID_SEM", "END_SEM"
  final int examCount;

  const TimetableCategoryModel({
    required this.categoryId,
    required this.categoryName,
    required this.code,
    required this.examCount,
  });

  factory TimetableCategoryModel.fromJson(Map<String, dynamic> json) {
    return TimetableCategoryModel(
      categoryId: json['categoryId'] ?? '',
      categoryName: json['categoryName'] ?? '',
      code: json['code'] ?? '',
      examCount: json['examCount'] ?? 0,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'categoryId': categoryId,
      'categoryName': categoryName,
      'code': code,
      'examCount': examCount,
    };
  }

  @override
  List<Object?> get props => [categoryId, categoryName, code, examCount];
}

class CategoryExamResult extends Equatable {
  final double? marksObtained;
  final double maxMarks;
  final String status; // e.g. "Graded", "Evaluating"

  const CategoryExamResult({
    this.marksObtained,
    required this.maxMarks,
    required this.status,
  });

  factory CategoryExamResult.fromJson(Map<String, dynamic> json) {
    return CategoryExamResult(
      marksObtained: json['marksObtained'] != null ? (json['marksObtained'] as num).toDouble() : null,
      maxMarks: (json['maxMarks'] as num?)?.toDouble() ?? 100.0,
      status: json['status'] ?? '',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'marksObtained': marksObtained,
      'maxMarks': maxMarks,
      'status': status,
    };
  }

  @override
  List<Object?> get props => [marksObtained, maxMarks, status];
}

class CategoryExamModel extends Equatable {
  final String examId;
  final String subjectName;
  final String subjectCode;
  final DateTime date;
  final String status; // e.g. "Upcoming", "Live", "Completed", "Missed"
  final CategoryExamResult? result;

  const CategoryExamModel({
    required this.examId,
    required this.subjectName,
    required this.subjectCode,
    required this.date,
    required this.status,
    this.result,
  });

  factory CategoryExamModel.fromJson(Map<String, dynamic> json) {
    return CategoryExamModel(
      examId: json['examId'] ?? '',
      subjectName: json['subjectName'] ?? '',
      subjectCode: json['subjectCode'] ?? '',
      date: json['date'] != null ? DateTime.parse(json['date']) : DateTime.now(),
      status: json['status'] ?? 'Upcoming',
      result: json['result'] != null ? CategoryExamResult.fromJson(Map<String, dynamic>.from(json['result'])) : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'examId': examId,
      'subjectName': subjectName,
      'subjectCode': subjectCode,
      'date': date.toIso8601String(),
      'status': status,
      'result': result?.toJson(),
    };
  }

  @override
  List<Object?> get props => [examId, subjectName, subjectCode, date, status, result];
}
