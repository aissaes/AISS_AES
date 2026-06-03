import 'package:equatable/equatable.dart';
import 'section_model.dart';

class ExamModel extends Equatable {
  final String id;
  final String subjectName;
  final String subjectCode;
  final String examType;
  final String semester;
  final String course;
  final String department;
  final double maxMarks;
  final String token;
  final DateTime? date;
  final DateTime? startTime;
  final DateTime? endTime;
  final String facultyName;
  final List<SectionModel> sections;

  const ExamModel({
    required this.id,
    required this.subjectName,
    required this.subjectCode,
    required this.examType,
    required this.semester,
    required this.course,
    this.department = 'N/A',
    required this.maxMarks,
    required this.token,
    this.date,
    this.startTime,
    this.endTime,
    required this.facultyName,
    required this.sections,
  });

  factory ExamModel.fromJson(Map<String, dynamic> json) {
    final sectionsRaw = json['questionPaper']?['sections'] as List? ?? [];
    final List<SectionModel> parsedSections = [];

    for (int i = 0; i < sectionsRaw.length; i++) {
      final section = sectionsRaw[i];
      if (section is List) {
        final title = String.fromCharCode(65 + i); // Section A, B, C...
        parsedSections.add(SectionModel.fromJson(title, section));
      }
    }

    final faculty = json['assignedFaculty'];
    final String resolvedFaculty = faculty is Map ? (faculty['name'] ?? 'Faculty') : 'Faculty';

    // Robust course parsing supporting courseId/course as Map or ID
    final courseRaw = json['courseId'] ?? json['course'];
    String resolvedCourse = 'N/A';
    if (courseRaw is Map) {
      resolvedCourse = courseRaw['courseName'] ?? courseRaw['courseCode'] ?? 'N/A';
    } else if (courseRaw != null && !(courseRaw is String && courseRaw.length == 24 && RegExp(r'^[0-9a-fA-F]{24}$').hasMatch(courseRaw))) {
      resolvedCourse = courseRaw.toString();
    }

    // Robust semester parsing supporting semesterId/semester as Map or ID
    final semesterRaw = json['semesterId'] ?? json['semester'];
    String resolvedSem = 'N/A';
    if (semesterRaw is Map) {
      resolvedSem = semesterRaw['semesterName'] ?? semesterRaw['semesterNumber']?.toString() ?? 'N/A';
    } else if (semesterRaw != null && !(semesterRaw is String && semesterRaw.length == 24 && RegExp(r'^[0-9a-fA-F]{24}$').hasMatch(semesterRaw))) {
      resolvedSem = semesterRaw.toString();
    }

    // Robust department parsing supporting populated object or ID
    final deptRaw = json['department'];
    String resolvedDept = 'N/A';
    if (deptRaw is Map) {
      resolvedDept = deptRaw['name'] ?? deptRaw['code'] ?? 'N/A';
    } else if (deptRaw != null && !(deptRaw is String && deptRaw.length == 24 && RegExp(r'^[0-9a-fA-F]{24}$').hasMatch(deptRaw))) {
      resolvedDept = deptRaw.toString();
    }

    return ExamModel(
      id: json['_id'] ?? json['id'] ?? '',
      subjectName: json['subjectName'] ?? 'Subject Name',
      subjectCode: json['subjectCode'] ?? 'CODE',
      examType: json['examType'] ?? 'Examination',
      semester: resolvedSem,
      course: resolvedCourse,
      department: resolvedDept,
      maxMarks: (json['maxMarks'] ?? 100).toDouble(),
      token: json['token'] ?? '',
      date: json['date'] != null ? DateTime.tryParse(json['date'])?.toLocal() : null,
      startTime: json['startTime'] != null ? DateTime.tryParse(json['startTime'])?.toLocal() : null,
      endTime: json['endTime'] != null ? DateTime.tryParse(json['endTime'])?.toLocal() : null,
      facultyName: resolvedFaculty,
      sections: parsedSections,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      '_id': id,
      'subjectName': subjectName,
      'subjectCode': subjectCode,
      'examType': examType,
      'semester': semester,
      'course': course,
      'department': department,
      'maxMarks': maxMarks,
      'token': token,
      'date': date?.toUtc().toIso8601String(),
      'startTime': startTime?.toUtc().toIso8601String(),
      'endTime': endTime?.toUtc().toIso8601String(),
      'assignedFaculty': {'name': facultyName},
      'questionPaper': {
        'sections': sections.map((s) => s.questions.map((q) => q.toJson()).toList()).toList(),
      },
    };
  }

  ExamModel copyWith({
    String? id,
    String? subjectName,
    String? subjectCode,
    String? examType,
    String? semester,
    String? course,
    String? department,
    double? maxMarks,
    String? token,
    DateTime? date,
    DateTime? startTime,
    DateTime? endTime,
    String? facultyName,
    List<SectionModel>? sections,
  }) {
    return ExamModel(
      id: id ?? this.id,
      subjectName: subjectName ?? this.subjectName,
      subjectCode: subjectCode ?? this.subjectCode,
      examType: examType ?? this.examType,
      semester: semester ?? this.semester,
      course: course ?? this.course,
      department: department ?? this.department,
      maxMarks: maxMarks ?? this.maxMarks,
      token: token ?? this.token,
      date: date ?? this.date,
      startTime: startTime ?? this.startTime,
      endTime: endTime ?? this.endTime,
      facultyName: facultyName ?? this.facultyName,
      sections: sections ?? this.sections,
    );
  }

  @override
  List<Object?> get props => [
        id,
        subjectName,
        subjectCode,
        examType,
        semester,
        course,
        department,
        maxMarks,
        token,
        date,
        startTime,
        endTime,
        facultyName,
        sections,
      ];
}
