import 'package:equatable/equatable.dart';
import 'question_model.dart';

class SectionModel extends Equatable {
  final String title;
  final List<QuestionModel> questions;

  const SectionModel({
    required this.title,
    required this.questions,
  });

  factory SectionModel.fromJson(String title, List<dynamic> jsonList) {
    final questions = jsonList
        .map((q) => QuestionModel.fromJson(Map<String, dynamic>.from(q)))
        .toList();
    return SectionModel(title: title, questions: questions);
  }

  Map<String, dynamic> toJson() {
    return {
      'title': title,
      'questions': questions.map((q) => q.toJson()).toList(),
    };
  }

  SectionModel copyWith({
    String? title,
    List<QuestionModel>? questions,
  }) {
    return SectionModel(
      title: title ?? this.title,
      questions: questions ?? this.questions,
    );
  }

  @override
  List<Object?> get props => [title, questions];
}
