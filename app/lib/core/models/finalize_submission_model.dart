import 'package:equatable/equatable.dart';

class FinalizeSubmissionModel extends Equatable {
  final bool success;
  final String message;

  const FinalizeSubmissionModel({required this.success, required this.message});

  factory FinalizeSubmissionModel.fromJson(Map<String, dynamic> json) {
    return FinalizeSubmissionModel(
      success: json['success'] ?? true,
      message: json['message'] ?? '',
    );
  }

  @override
  List<Object?> get props => [success, message];
}
