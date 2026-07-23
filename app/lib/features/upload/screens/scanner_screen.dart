import 'package:camera/camera.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../shared/widgets/app_loading_indicator.dart';
import '../providers/scanner_provider.dart';
import '../services/camera_service.dart';
import '../widgets/scanner_top_bar.dart';
import '../widgets/scanner_question_badge.dart';
import '../widgets/scanner_control_bar.dart';
import '../widgets/scan_guide_overlay.dart';

class ScannerScreen extends ConsumerStatefulWidget {
  const ScannerScreen({super.key});

  @override
  ConsumerState<ScannerScreen> createState() => _ScannerScreenState();
}

class _ScannerScreenState extends ConsumerState<ScannerScreen> with WidgetsBindingObserver {
  late final CameraService _cameraService;
  bool _isReady = false;
  bool _isAligned = false;
  bool _isProcessingPicture = false;

  @override
  void initState() {
    super.initState();
    _cameraService = CameraService();
    WidgetsBinding.instance.addObserver(this);
    _setupCameras();
    Future.delayed(const Duration(seconds: 2), () {
      if (mounted) {
        setState(() => _isAligned = true);
      }
    });
  }

  Future<void> _setupCameras() async {
    final success = await _cameraService.initializeCamera(() {
      if (mounted) setState(() {});
    });
    if (mounted && success) {
      setState(() => _isReady = true);
    }
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _cameraService.disposeCamera();
    super.dispose();
  }

  Future<void> _takePicture() async {
    if (!_cameraService.isReady || _isProcessingPicture) return;

    setState(() => _isProcessingPicture = true);

    try {
      final file = await _cameraService.takePicture();
      if (file == null || !mounted) return;

      final qualityResult = await ref.read(scannerProvider.notifier).addImage(file.path);
      if (!mounted) return;

      if (!qualityResult.isValid) {
        context.push('/upload/quality-alert');
      } else {
        context.push('/upload/crop-preview', extra: file.path);
      }
    } finally {
      if (mounted) {
        setState(() => _isProcessingPicture = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final scannerState = ref.watch(scannerProvider);

    if (!_isReady || !_cameraService.isReady) {
      return const Scaffold(
        backgroundColor: Colors.black,
        body: Center(
          child: AppLoadingIndicator(size: 60),
        ),
      );
    }

    final controller = _cameraService.controller!;

    return Scaffold(
      backgroundColor: Colors.black,
      body: Stack(
        children: [
          // Camera Preview
          Positioned.fill(
            child: FittedBox(
              fit: BoxFit.cover,
              child: SizedBox(
                width: 100,
                height: 100 * controller.value.aspectRatio,
                child: CameraPreview(controller),
              ),
            ),
          ),

          // Scan Guide Overlay
          ScanGuideOverlay(isAligned: _isAligned),

          // Scanner Top Bar
          ScannerTopBar(
            flashIcon: _cameraService.flashIcon,
            onToggleFlash: () => _cameraService.toggleFlash(() {
              if (mounted) setState(() {});
            }),
          ),

          // Target Question Badge
          const ScannerQuestionBadge(),

          // Bottom Control Area
          ScannerControlBar(
            imagePaths: scannerState.imagePaths,
            isAligned: _isAligned,
            onTakePicture: _takePicture,
            onNavigateToReview: () => context.push('/upload/review'),
          ),

          // Shutter Processing Loading Overlay
          if (_isProcessingPicture)
            Container(
              color: Colors.black54,
              child: const Center(
                child: AppLoadingIndicator(size: 60),
              ),
            ),
        ],
      ),
    );
  }
}
