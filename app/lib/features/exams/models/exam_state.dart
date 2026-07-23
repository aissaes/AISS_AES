import 'package:equatable/equatable.dart';
import 'exam_model.dart';

class ExamState extends Equatable {
  final ExamModel? exam;
  final bool isLoading;
  final String? errorMessage;

  const ExamState({
    this.exam,
    this.isLoading = false,
    this.errorMessage,
  });

  ExamState copyWith({
    ExamModel? exam,
    bool? isLoading,
    String? errorMessage,
    bool clearError = false,
  }) {
    return ExamState(
      exam: exam ?? this.exam,
      isLoading: isLoading ?? this.isLoading,
      errorMessage: clearError ? null : (errorMessage ?? this.errorMessage),
    );
  }

  @override
  List<Object?> get props => [exam, isLoading, errorMessage];
}
