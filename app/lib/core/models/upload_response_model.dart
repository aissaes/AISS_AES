import 'package:equatable/equatable.dart';

class UploadResponseModel extends Equatable {
  final bool success;
  final String fileUrl;
  final String message;

  const UploadResponseModel({
    required this.success,
    required this.fileUrl,
    required this.message,
  });

  factory UploadResponseModel.fromJson(Map<String, dynamic> json) {
    return UploadResponseModel(
      success: json['success'] ?? true,
      fileUrl: json['fileUrl'] ?? json['url'] ?? '',
      message: json['message'] ?? '',
    );
  }

  @override
  List<Object?> get props => [success, fileUrl, message];
}
