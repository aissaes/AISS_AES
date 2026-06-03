import 'package:equatable/equatable.dart';

class CourseSummaryModel extends Equatable {
  final String courseId;
  final String courseCode;
  final String courseName;
  final int credits;
  final String facultyName;
  final String facultyEmail;
  final int upcomingExams;
  final int completedExams;
  final int missedExams;

  const CourseSummaryModel({
    required this.courseId,
    required this.courseCode,
    required this.courseName,
    required this.credits,
    required this.facultyName,
    required this.facultyEmail,
    required this.upcomingExams,
    required this.completedExams,
    required this.missedExams,
  });

  factory CourseSummaryModel.fromJson(Map<String, dynamic> json) {
    final faculty = json['faculty'] ?? {};
    final examStats = json['examStats'] ?? {};
    return CourseSummaryModel(
      courseId: json['courseId'] ?? '',
      courseCode: json['courseCode'] ?? '',
      courseName: json['courseName'] ?? '',
      credits: json['credits'] ?? 3,
      facultyName: faculty['name'] ?? 'No Instructor Assigned',
      facultyEmail: faculty['email'] ?? 'N/A',
      upcomingExams: examStats['upcoming'] ?? 0,
      completedExams: examStats['completed'] ?? 0,
      missedExams: examStats['missed'] ?? 0,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'courseId': courseId,
      'courseCode': courseCode,
      'courseName': courseName,
      'credits': credits,
      'faculty': {
        'name': facultyName,
        'email': facultyEmail,
      },
      'examStats': {
        'upcoming': upcomingExams,
        'completed': completedExams,
        'missed': missedExams,
      },
    };
  }

  @override
  List<Object?> get props => [
        courseId,
        courseCode,
        courseName,
        credits,
        facultyName,
        facultyEmail,
        upcomingExams,
        completedExams,
        missedExams,
      ];
}
