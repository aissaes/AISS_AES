import 'package:equatable/equatable.dart';

class QuestionModel extends Equatable {
  final String questionId;
  final String text;
  final double marks;
  final List<QuestionModel>? children;

  const QuestionModel({
    required this.questionId,
    required this.text,
    required this.marks,
    this.children,
  });

  factory QuestionModel.fromJson(Map<String, dynamic> json) {
    final subQuestionsRaw = json['children'] as List? ?? [];
    final List<QuestionModel> subQuestions = subQuestionsRaw
        .map((q) => QuestionModel.fromJson(Map<String, dynamic>.from(q)))
        .toList();

    return QuestionModel(
      questionId: json['questionId']?.toString() ?? '',
      text: json['text'] ?? '',
      marks: (json['marks'] ?? 5).toDouble(),
      children: subQuestions.isNotEmpty ? subQuestions : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'questionId': questionId,
      'text': text,
      'marks': marks,
      'children': children?.map((c) => c.toJson()).toList(),
    };
  }

  QuestionModel copyWith({
    String? questionId,
    String? text,
    double? marks,
    List<QuestionModel>? children,
  }) {
    return QuestionModel(
      questionId: questionId ?? this.questionId,
      text: text ?? this.text,
      marks: marks ?? this.marks,
      children: children ?? this.children,
    );
  }

  @override
  List<Object?> get props => [questionId, text, marks, children];
}
