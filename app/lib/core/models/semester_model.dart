import 'package:equatable/equatable.dart';

class SemesterStats extends Equatable {
  final int coursesCount;
  final int totalCredits;
  final int examsConducted;
  final double? gpa;
  final double? averagePercentage;
  final String resultStatus;

  const SemesterStats({
    required this.coursesCount,
    required this.totalCredits,
    required this.examsConducted,
    this.gpa,
    this.averagePercentage,
    required this.resultStatus,
  });

  factory SemesterStats.fromJson(Map<String, dynamic> json) {
    return SemesterStats(
      coursesCount: json['coursesCount'] ?? 0,
      totalCredits: json['totalCredits'] ?? 0,
      examsConducted: json['examsConducted'] ?? 0,
      gpa: json['gpa'] != null ? (json['gpa'] as num).toDouble() : null,
      averagePercentage: json['averagePercentage'] != null ? (json['averagePercentage'] as num).toDouble() : null,
      resultStatus: json['resultStatus'] ?? 'Unknown',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'coursesCount': coursesCount,
      'totalCredits': totalCredits,
      'examsConducted': examsConducted,
      'gpa': gpa,
      'averagePercentage': averagePercentage,
      'resultStatus': resultStatus,
    };
  }

  @override
  List<Object?> get props => [coursesCount, totalCredits, examsConducted, gpa, averagePercentage, resultStatus];
}

class SemesterModel extends Equatable {
  final String semesterId;
  final int semesterNumber;
  final String semesterName;
  final bool isCurrent;
  final SemesterStats stats;

  const SemesterModel({
    required this.semesterId,
    required this.semesterNumber,
    required this.semesterName,
    required this.isCurrent,
    required this.stats,
  });

  factory SemesterModel.fromJson(Map<String, dynamic> json) {
    return SemesterModel(
      semesterId: json['semesterId'] ?? '',
      semesterNumber: json['semesterNumber'] ?? 0,
      semesterName: json['semesterName'] ?? '',
      isCurrent: json['isCurrent'] ?? false,
      stats: SemesterStats.fromJson(Map<String, dynamic>.from(json['stats'] ?? {})),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'semesterId': semesterId,
      'semesterNumber': semesterNumber,
      'semesterName': semesterName,
      'isCurrent': isCurrent,
      'stats': stats.toJson(),
    };
  }

  @override
  List<Object?> get props => [semesterId, semesterNumber, semesterName, isCurrent, stats];
}
