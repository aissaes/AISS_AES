import 'dart:async';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:file_picker/file_picker.dart';

enum UploadStatus { initial, picking, picked, uploading, success, error }

class UploadState {
  final UploadStatus status;
  final PlatformFile? selectedFile;
  final double progress;
  final String? errorMessage;

  UploadState({
    this.status = UploadStatus.initial,
    this.selectedFile,
    this.progress = 0.0,
    this.errorMessage,
  });

  UploadState copyWith({
    UploadStatus? status,
    PlatformFile? selectedFile,
    double? progress,
    String? errorMessage,
  }) {
    return UploadState(
      status: status ?? this.status,
      selectedFile: selectedFile ?? this.selectedFile,
      progress: progress ?? this.progress,
      errorMessage: errorMessage ?? this.errorMessage,
    );
  }
}

class UploadNotifier extends StateNotifier<UploadState> {
  UploadNotifier() : super(UploadState());

  Future<void> pickFile() async {
    state = state.copyWith(status: UploadStatus.picking);
    
    try {
      final result = await FilePicker.platform.pickFiles(
        type: FileType.custom,
        allowedExtensions: ['pdf', 'jpg', 'png'],
      );

      if (result != null && result.files.isNotEmpty) {
        state = state.copyWith(
          status: UploadStatus.picked,
          selectedFile: result.files.first,
        );
      } else {
        state = state.copyWith(status: UploadStatus.initial);
      }
    } catch (e) {
      state = state.copyWith(
        status: UploadStatus.error,
        errorMessage: 'Failed to pick file',
      );
    }
  }

  Future<void> uploadFile() async {
    if (state.selectedFile == null) return;

    state = state.copyWith(status: UploadStatus.uploading, progress: 0.0);

    // Simulate upload progress
    for (int i = 0; i <= 100; i += 10) {
      await Future.delayed(const Duration(milliseconds: 300));
      if (!mounted) return;
      state = state.copyWith(progress: i / 100);
    }

    state = state.copyWith(status: UploadStatus.success);
  }

  void reset() {
    state = UploadState();
  }
}

final uploadProvider = StateNotifierProvider<UploadNotifier, UploadState>((ref) {
  return UploadNotifier();
});
