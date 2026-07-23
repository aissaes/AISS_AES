import 'package:flutter/material.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../shared/widgets/script_thumbnail.dart';
import 'full_screen_file_viewer.dart';

// =============================================================================
// SUBMITTED SCRIPT TILE
// Thumbnail + label row for the scanned answer script, tappable to full-screen.
// Uses shared ScriptThumbnail for 100% pixel-perfect presentation.
// =============================================================================
class SubmittedScriptTile extends StatelessWidget {
  final String questionId;
  final String fileUrl;
  final String fileType;

  const SubmittedScriptTile({
    super.key,
    required this.questionId,
    required this.fileUrl,
    required this.fileType,
  });

  bool get _isPdf => fileType == 'pdf';
  String get _fileExtension => _isPdf ? '.pdf' : '.png';

  void _openFullScreen(BuildContext context) {
    showDialog(
      context: context,
      builder: (dialogContext) => Dialog(
        backgroundColor: Colors.transparent,
        insetPadding: const EdgeInsets.all(12),
        child: FullScreenFileViewer(
          fileUrl: fileUrl,
          fileType: fileType,
          questionId: questionId,
          onClose: () => Navigator.pop(dialogContext),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'SUBMITTED SCRIPT',
          style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: AppTheme.textSecondary, letterSpacing: 0.5),
        ),
        const SizedBox(height: 8),
        Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: AppTheme.backgroundColor,
            borderRadius: BorderRadius.circular(AppTheme.borderRadiusMedium),
            border: Border.all(color: AppTheme.outlineColor.withValues(alpha: 0.08)),
          ),
          child: Row(
            children: [
              ScriptThumbnail(
                fileUrlOrPath: fileUrl,
                isPdf: _isPdf,
                onTap: () => _openFullScreen(context),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Page $questionId$_fileExtension',
                      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: AppTheme.textPrimary),
                    ),
                    const SizedBox(height: 2),
                    const Text('Tap to view document', style: TextStyle(color: AppTheme.textSecondary, fontSize: 11)),
                  ],
                ),
              ),
              IconButton(
                icon: const Icon(Icons.open_in_new_rounded, color: AppTheme.primaryColor, size: 20),
                onPressed: () => _openFullScreen(context),
              ),
            ],
          ),
        ),
      ],
    );
  }
}
