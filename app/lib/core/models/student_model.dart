import 'package:equatable/equatable.dart';

class CourseModel extends Equatable {
  final String name;
  final String code;
  final int credits;
  final String facultyName;

  const CourseModel({
    required this.name,
    required this.code,
    required this.credits,
    required this.facultyName,
  });

  factory CourseModel.fromJson(Map<String, dynamic> json) {
    final faculty = json['assignedFaculty'];
    final String facultyNameStr = faculty is Map ? (faculty['name'] ?? 'Assigned Faculty') : 'No Instructor Assigned';
    return CourseModel(
      name: json['courseName'] ?? 'Course',
      code: json['courseCode'] ?? 'CODE',
      credits: (json['credits'] ?? 3) as int,
      facultyName: facultyNameStr,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'courseName': name,
      'courseCode': code,
      'credits': credits,
      'assignedFaculty': {'name': facultyName},
    };
  }

  @override
  List<Object?> get props => [name, code, credits, facultyName];
}

class StudentModel extends Equatable {
  final String id;
  final String rollNumber;
  final String name;
  final String email;
  final String department;
  final String semester;
  final String course;
  final String collegeName;
  final List<CourseModel> enrolledCourses;

  const StudentModel({
    required this.id,
    required this.rollNumber,
    required this.name,
    required this.email,
    required this.department,
    required this.semester,
    required this.course,
    required this.collegeName,
    required this.enrolledCourses,
  });

  factory StudentModel.fromJson(Map<String, dynamic> json) {
    // Robust department parsing — handles populated objects, raw ObjectId strings, and plain strings
    final deptRaw = json['department'];
    String resolvedDept = 'N/A';
    if (deptRaw is Map) {
      resolvedDept = deptRaw['name'] ?? deptRaw['code'] ?? 'N/A';
    } else if (json['departments'] is List && (json['departments'] as List).isNotEmpty) {
      resolvedDept = (json['departments'] as List)
          .map((d) => d is Map ? (d['name'] ?? d['code'] ?? '') : d.toString())
          .where((s) => s.isNotEmpty && !(s.length == 24 && RegExp(r'^[0-9a-fA-F]{24}$').hasMatch(s)))
          .join(', ');
      if (resolvedDept.isEmpty) resolvedDept = 'N/A';
    } else if (deptRaw != null && !(deptRaw is String && deptRaw.length == 24 && RegExp(r'^[0-9a-fA-F]{24}$').hasMatch(deptRaw))) {
      resolvedDept = deptRaw.toString();
    }

    // Robust course parsing — handles populated objects, raw ObjectId strings, and plain strings
    final courseRaw = json['course'];
    String resolvedCourse = 'N/A';
    if (courseRaw is Map) {
      resolvedCourse = courseRaw['courseName'] ?? courseRaw['courseCode'] ?? 'N/A';
    } else if (courseRaw != null && !(courseRaw is String && courseRaw.length == 24 && RegExp(r'^[0-9a-fA-F]{24}$').hasMatch(courseRaw))) {
      resolvedCourse = courseRaw.toString();
    }
    // If course is still N/A but we have enrolled courses, use them for display
    if (resolvedCourse == 'N/A' && json['courses'] is List && (json['courses'] as List).isNotEmpty) {
      final courseNames = (json['courses'] as List)
          .map((c) => c is Map ? (c['courseName'] ?? c['courseCode'] ?? '') : c.toString())
          .where((s) => s.isNotEmpty && !(s.length == 24 && RegExp(r'^[0-9a-fA-F]{24}$').hasMatch(s)))
          .toList();
      if (courseNames.isNotEmpty) {
        resolvedCourse = courseNames.length <= 3
            ? courseNames.join(', ')
            : '${courseNames.take(3).join(', ')} +${courseNames.length - 3}';
      }
    }

    // Robust semester parsing
    final semesterRaw = json['semester'];
    String resolvedSem = 'N/A';
    if (semesterRaw is Map) {
      resolvedSem = semesterRaw['semesterName'] ?? semesterRaw['semesterNumber']?.toString() ?? 'N/A';
    } else if (semesterRaw != null && !(semesterRaw is String && semesterRaw.length == 24 && RegExp(r'^[0-9a-fA-F]{24}$').hasMatch(semesterRaw))) {
      resolvedSem = semesterRaw.toString();
    }

    // College parsing
    final collegeRaw = json['collegeId'];
    final String resolvedCollege = collegeRaw is Map 
        ? (collegeRaw['collegeName'] ?? 'N/A') 
        : 'N/A';

    // Courses list parsing
    final coursesRaw = json['courses'] as List? ?? [];
    final parsedCourses = coursesRaw
        .map((c) => CourseModel.fromJson(Map<String, dynamic>.from(c)))
        .toList();

    return StudentModel(
      id: json['_id'] ?? json['id'] ?? '',
      rollNumber: json['rollNumber'] ?? json['rollNo'] ?? '',
      name: json['name'] ?? 'Student',
      email: json['email'] ?? 'N/A',
      department: resolvedDept,
      semester: resolvedSem,
      course: resolvedCourse,
      collegeName: resolvedCollege,
      enrolledCourses: parsedCourses,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      '_id': id,
      'rollNumber': rollNumber,
      'name': name,
      'email': email,
      'department': department,
      'semester': semester,
      'course': course,
      'collegeId': {'collegeName': collegeName},
      'courses': enrolledCourses.map((c) => c.toJson()).toList(),
    };
  }

  StudentModel copyWith({
    String? id,
    String? rollNumber,
    String? name,
    String? email,
    String? department,
    String? semester,
    String? course,
    String? collegeName,
    List<CourseModel>? enrolledCourses,
  }) {
    return StudentModel(
      id: id ?? this.id,
      rollNumber: rollNumber ?? this.rollNumber,
      name: name ?? this.name,
      email: email ?? this.email,
      department: department ?? this.department,
      semester: semester ?? this.semester,
      course: course ?? this.course,
      collegeName: collegeName ?? this.collegeName,
      enrolledCourses: enrolledCourses ?? this.enrolledCourses,
    );
  }

  String get courseDeptDisplay {
    if (course != 'N/A' && department != 'N/A') {
      return '$course • $department';
    } else if (course != 'N/A') {
      return course;
    } else {
      return department;
    }
  }

  String get initials {
    return name.isNotEmpty
        ? name.split(' ').map((e) => e[0]).take(2).join('').toUpperCase()
        : 'S';
  }

  @override
  List<Object?> get props => [
        id,
        rollNumber,
        name,
        email,
        department,
        semester,
        course,
        collegeName,
        enrolledCourses,
      ];
}
