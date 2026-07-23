import 'dart:io';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:path_provider/path_provider.dart';
import '../../../core/utils/app_logger.dart';

class UploadQueueItem {
  final String filePath;
  final String questionId;
  final String examId;
  final String examToken;
  final DateTime queuedAt;

  UploadQueueItem({
    required this.filePath,
    required this.questionId,
    required this.examId,
    required this.examToken,
    DateTime? queuedAt,
  }) : queuedAt = queuedAt ?? DateTime.now().toUtc();

  Map<String, dynamic> toJson() => {
        'filePath': filePath,
        'questionId': questionId,
        'examId': examId,
        'examToken': examToken,
        'queuedAt': queuedAt.toIso8601String(),
      };

  factory UploadQueueItem.fromJson(Map<String, dynamic> json) => UploadQueueItem(
        filePath: json['filePath'] as String,
        questionId: json['questionId'] as String,
        examId: json['examId'] as String,
        examToken: json['examToken'] as String,
        queuedAt: DateTime.parse(json['queuedAt'] as String),
      );
}

class UploadQueueService {
  static const int maxStorageBytes = 100 * 1024 * 1024; // 100 MB
  static const int maxPagesCount = 50;
  static const Duration uploadTimeoutDuration = Duration(minutes: 30);

  final List<UploadQueueItem> _pendingItems = [];

  List<UploadQueueItem> get pendingItems => List.unmodifiable(_pendingItems);

  /// Backwards-compatible raw path list getter
  List<String> get pendingQueue => _pendingItems.map((e) => e.filePath).toList();

  /// Checks if adding new scan would exceed storage limits.
  Future<bool> canAddScan(int estimatedFileSizeBytes) async {
    if (_pendingItems.length >= maxPagesCount) {
      AppLogger.w('[UploadQueueService] Max page limit reached ($maxPagesCount pages)');
      return false;
    }

    int currentTotal = 0;
    for (final item in _pendingItems) {
      final file = File(item.filePath);
      if (await file.exists()) {
        currentTotal += await file.length();
      }
    }

    if (currentTotal + estimatedFileSizeBytes > maxStorageBytes) {
      AppLogger.w('[UploadQueueService] Max disk storage limit reached (100MB)');
      return false;
    }

    return true;
  }

  void addToQueue(String path, {String questionId = '1', String examId = '', String examToken = ''}) {
    if (!_pendingItems.any((e) => e.filePath == path)) {
      _pendingItems.add(UploadQueueItem(
        filePath: path,
        questionId: questionId,
        examId: examId,
        examToken: examToken,
      ));
      AppLogger.d('[UploadQueueService] Queued scan for Question $questionId: $path');
    }
  }

  void removeFromQueue(String path) {
    _pendingItems.removeWhere((e) => e.filePath == path);
  }

  /// Checks if the upload window has timed out (30 mins post-exam).
  bool isUploadTimedOut(DateTime examEndTime) {
    final now = DateTime.now().toUtc();
    final limit = examEndTime.toUtc().add(uploadTimeoutDuration);
    return now.isAfter(limit);
  }

  Future<void> processPendingUploadQueue() async {
    AppLogger.d('[UploadQueueService] Processing pending upload queue count: ${_pendingItems.length}');
  }

  /// Secure post-submission disk cleanup policy.
  Future<void> purgeScanDiskCache() async {
    try {
      for (final item in List<UploadQueueItem>.from(_pendingItems)) {
        try {
          final file = File(item.filePath);
          if (await file.exists()) {
            await file.delete();
          }
        } catch (_) {}
      }
      _pendingItems.clear();

      final tempDir = await getTemporaryDirectory();
      final scansDir = Directory('${tempDir.path}/scans');
      if (await scansDir.exists()) {
        final List<FileSystemEntity> entities = scansDir.listSync();
        for (final entity in entities) {
          if (entity is File) {
            await entity.delete();
          }
        }
      }
    } catch (_) {}
  }

  /// Resolves conflicts when server returns SUBMITTED / CLOSED.
  Future<void> handleServerConflict(bool isServerSubmitted) async {
    if (isServerSubmitted) {
      AppLogger.d('[UploadQueueService] Server confirmed SUBMITTED. Overriding local queue and purging disk cache.');
      await purgeScanDiskCache();
    }
  }
}

final uploadQueueServiceProvider = Provider<UploadQueueService>((ref) {
  return UploadQueueService();
});
