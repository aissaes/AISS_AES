import 'package:equatable/equatable.dart';

class QuestionEvaluationModel extends Equatable {
  final String questionId;
  final double marksAwarded;
  final bool isManuallyGraded;
  final String feedback;
  final String reasoning;
  final String? imageUrl;

  const QuestionEvaluationModel({
    required this.questionId,
    required this.marksAwarded,
    required this.isManuallyGraded,
    required this.feedback,
    required this.reasoning,
    this.imageUrl,
  });

  factory QuestionEvaluationModel.fromJson(Map<String, dynamic> json) {
    return QuestionEvaluationModel(
      questionId: json['questionId']?.toString() ?? '',
      marksAwarded: (json['marksAwarded'] ?? 0).toDouble(),
      isManuallyGraded: json['isManuallyGraded'] ?? false,
      feedback: json['feedback'] ?? 'No feedback provided.',
      reasoning: json['reasoning'] ?? '',
      imageUrl: json['imageUrl'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'questionId': questionId,
      'marksAwarded': marksAwarded,
      'isManuallyGraded': isManuallyGraded,
      'feedback': feedback,
      'reasoning': reasoning,
      'imageUrl': imageUrl,
    };
  }

  QuestionEvaluationModel copyWith({
    String? questionId,
    double? marksAwarded,
    bool? isManuallyGraded,
    String? feedback,
    String? reasoning,
    String? imageUrl,
  }) {
    return QuestionEvaluationModel(
      questionId: questionId ?? this.questionId,
      marksAwarded: marksAwarded ?? this.marksAwarded,
      isManuallyGraded: isManuallyGraded ?? this.isManuallyGraded,
      feedback: feedback ?? this.feedback,
      reasoning: reasoning ?? this.reasoning,
      imageUrl: imageUrl ?? this.imageUrl,
    );
  }

  @override
  List<Object?> get props => [
        questionId,
        marksAwarded,
        isManuallyGraded,
        feedback,
        reasoning,
        imageUrl,
      ];
}

class ExamResultModel extends Equatable {
  final String id;
  final String status;
  final double totalMarksObtained;
  final String subjectName;
  final String subjectCode;
  final String examType;
  final double maxMarks;
  final DateTime? date;
  final List<QuestionEvaluationModel> evaluations;

  const ExamResultModel({
    required this.id,
    required this.status,
    required this.totalMarksObtained,
    required this.subjectName,
    required this.subjectCode,
    required this.examType,
    required this.maxMarks,
    this.date,
    required this.evaluations,
  });

  factory ExamResultModel.fromJson(Map<String, dynamic> json) {
    final examDetails = json['exam'] as Map<String, dynamic>? ?? json['examDetails'] as Map<String, dynamic>? ?? {};
    final evaluationsRaw = json['evaluations'] as List? ?? [];
    
    final parsedEvaluations = evaluationsRaw
        .map((e) => QuestionEvaluationModel.fromJson(Map<String, dynamic>.from(e)))
        .toList();

    return ExamResultModel(
      id: json['examId'] ?? examDetails['_id'] ?? examDetails['id'] ?? '',
      status: json['status'] ?? 'Under Evaluation',
      totalMarksObtained: (json['totalMarksObtained'] ?? 0).toDouble(),
      subjectName: examDetails['subjectName'] ?? 'Subject',
      subjectCode: examDetails['subjectCode'] ?? 'Code',
      examType: examDetails['examType'] ?? 'Exam',
      maxMarks: (examDetails['maxMarks'] ?? 100).toDouble(),
      date: examDetails['date'] != null ? DateTime.tryParse(examDetails['date'])?.toLocal() : null,
      evaluations: parsedEvaluations,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'examId': id,
      'status': status,
      'totalMarksObtained': totalMarksObtained,
      'evaluations': evaluations.map((e) => e.toJson()).toList(),
      'exam': {
        'subjectName': subjectName,
        'subjectCode': subjectCode,
        'examType': examType,
        'maxMarks': maxMarks,
        'date': date?.toUtc().toIso8601String(),
      }
    };
  }

  ExamResultModel copyWith({
    String? id,
    String? status,
    double? totalMarksObtained,
    String? subjectName,
    String? subjectCode,
    String? examType,
    double? maxMarks,
    DateTime? date,
    List<QuestionEvaluationModel>? evaluations,
  }) {
    return ExamResultModel(
      id: id ?? this.id,
      status: status ?? this.status,
      totalMarksObtained: totalMarksObtained ?? this.totalMarksObtained,
      subjectName: subjectName ?? this.subjectName,
      subjectCode: subjectCode ?? this.subjectCode,
      examType: examType ?? this.examType,
      maxMarks: maxMarks ?? this.maxMarks,
      date: date ?? this.date,
      evaluations: evaluations ?? this.evaluations,
    );
  }

  bool get isGraded => status.toLowerCase() == 'graded';
  double get percent => maxMarks > 0 ? (totalMarksObtained / maxMarks) * 100 : 0.0;

  @override
  List<Object?> get props => [
        id,
        status,
        totalMarksObtained,
        subjectName,
        subjectCode,
        examType,
        maxMarks,
        date,
        evaluations,
      ];
}
