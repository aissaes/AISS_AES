import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_pdfview/flutter_pdfview.dart';
import 'package:dio/dio.dart';
import 'package:path_provider/path_provider.dart';
import '../../../../core/theme/app_theme.dart';

// =============================================================================
// FULL SCREEN FILE VIEWER
// Full-screen dialog for viewing the submitted answer script (image or PDF).
// Downloads PDF to temp directory before rendering with flutter_pdfview.
// =============================================================================
class FullScreenFileViewer extends StatefulWidget {
  final String fileUrl;
  final String fileType;
  final String questionId;
  final VoidCallback onClose;

  const FullScreenFileViewer({
    super.key,
    required this.fileUrl,
    required this.fileType,
    required this.questionId,
    required this.onClose,
  });

  @override
  State<FullScreenFileViewer> createState() => _FullScreenFileViewerState();
}

class _FullScreenFileViewerState extends State<FullScreenFileViewer> {
  late final bool _isPdf;
  bool _hasError = false;
  String? _localPdfPath;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _isPdf = widget.fileType == 'pdf';
    if (_isPdf) {
      _downloadPdf();
    } else {
      _isLoading = false;
    }
  }

  Future<void> _downloadPdf() async {
    try {
      final tempDir = await getTemporaryDirectory();
      final savePath = '${tempDir.path}/evaluation_script_${widget.questionId}.pdf';
      await Dio().download(widget.fileUrl, savePath);
      if (mounted) setState(() { _localPdfPath = savePath; _isLoading = false; });
    } catch (_) {
      if (mounted) setState(() { _hasError = true; _isLoading = false; });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Stack(
      alignment: Alignment.topRight,
      children: [
        Center(
          child: ClipRRect(
            borderRadius: BorderRadius.circular(12),
            child: Container(
              color: Colors.black,
              width: double.infinity,
              height: double.infinity,
              child: _buildContent(),
            ),
          ),
        ),
        Padding(
          padding: const EdgeInsets.all(16.0),
          child: CircleAvatar(
            backgroundColor: Colors.black54,
            child: IconButton(
              icon: const Icon(Icons.close_rounded, color: Colors.white),
              onPressed: widget.onClose,
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildContent() {
    if (_isLoading) return const Center(child: CircularProgressIndicator(color: Colors.white));
    if (_hasError)  return _buildErrorView();
    if (_isPdf)     return _buildPdfView();
    return _buildImageView();
  }

  Widget _buildImageView() {
    return InteractiveViewer(
      minScale: 0.5,
      maxScale: 4.0,
      child: Image.network(
        widget.fileUrl,
        fit: BoxFit.contain,
        loadingBuilder: (_, child, progress) {
          if (progress == null) return child;
          return const Center(child: CircularProgressIndicator(color: Colors.white));
        },
        errorBuilder: (_, __, ___) {
          WidgetsBinding.instance.addPostFrameCallback((_) {
            if (mounted && !_hasError) setState(() => _hasError = true);
          });
          return const SizedBox.shrink();
        },
      ),
    );
  }

  Widget _buildPdfView() {
    if (_localPdfPath == null) return _buildErrorView();
    return PDFView(
      filePath: _localPdfPath,
      enableSwipe: true,
      swipeHorizontal: false,
      autoSpacing: false,
      pageFling: false,
      onError: (_) => setState(() => _hasError = true),
    );
  }

  Widget _buildErrorView() {
    return Container(
      color: Colors.white,
      child: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.error_outline_rounded, color: AppTheme.errorColor, size: 64),
            const SizedBox(height: 16),
            const Text('Unable to Load Document', style: TextStyle(color: AppTheme.textPrimary, fontWeight: FontWeight.bold, fontSize: 18)),
            const SizedBox(height: 8),
            const Padding(
              padding: EdgeInsets.symmetric(horizontal: 32),
              child: Text(
                'The document could not be loaded. You can copy the link below and open it directly in your browser.',
                textAlign: TextAlign.center,
                style: TextStyle(color: AppTheme.textSecondary, fontSize: 13, height: 1.5),
              ),
            ),
            const SizedBox(height: 24),
            ElevatedButton.icon(
              onPressed: () {
                Clipboard.setData(ClipboardData(text: widget.fileUrl));
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Document link copied to clipboard!'), duration: Duration(seconds: 2)),
                );
              },
              icon: const Icon(Icons.copy_rounded, size: 16, color: Colors.white),
              label: const Text('Copy Document Link'),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppTheme.primaryColor,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
