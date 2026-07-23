import 'package:equatable/equatable.dart';

class UploadSessionModel extends Equatable {
  final bool success;
  final String message;

  const UploadSessionModel({required this.success, required this.message});

  factory UploadSessionModel.fromJson(Map<String, dynamic> json) {
    return UploadSessionModel(
      success: json['success'] ?? true,
      message: json['message'] ?? '',
    );
  }

  @override
  List<Object?> get props => [success, message];
}
