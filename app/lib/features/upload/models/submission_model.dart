import 'package:equatable/equatable.dart';

class SubmissionModel extends Equatable {
  final Map<String, String> uploads; // questionId -> url

  const SubmissionModel({required this.uploads});

  factory SubmissionModel.fromJson(Map<String, dynamic> json) {
    final answersRaw = json['answers'] ?? {};
    final Map<String, String> answers = {};
    if (answersRaw is Map) {
      answersRaw.forEach((k, v) {
        answers[k.toString()] = v.toString();
      });
    }
    return SubmissionModel(uploads: answers);
  }

  Map<String, dynamic> toJson() {
    return {'answers': uploads};
  }

  SubmissionModel copyWith({Map<String, String>? uploads}) {
    return SubmissionModel(uploads: uploads ?? this.uploads);
  }

  @override
  List<Object?> get props => [uploads];
}
