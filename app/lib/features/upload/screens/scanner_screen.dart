import 'package:camera/camera.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/app_image.dart';
import '../../../core/widgets/app_logo.dart';
import '../providers/scanner_provider.dart';
import '../../exams/providers/selected_question_provider.dart';
import '../../../core/widgets/app_loading_indicator.dart';

class ScannerScreen extends ConsumerStatefulWidget {
  const ScannerScreen({super.key});

  @override
  ConsumerState<ScannerScreen> createState() => _ScannerScreenState();
}

class _ScannerScreenState extends ConsumerState<ScannerScreen> with WidgetsBindingObserver {
  CameraController? _controller;
  bool _isReady = false;
  bool _isAligned = false;
  String _flashMode = 'auto';
  bool _isInitializing = false;
  bool _isProcessingPicture = false;
  double _laserPos = 0.95;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _setupCameras();
    Future.delayed(const Duration(seconds: 2), () {
      if (mounted) {
        setState(() {
          _isAligned = true;
        });
      }
    });
  }

  Future<void> _setupCameras() async {
    if (_isInitializing) return;
    _isInitializing = true;

    try {
      // Clean up previous controller if any
      await _stopAndDisposeCamera();

      final cameras = await availableCameras();
      if (cameras.isEmpty) {
        _isInitializing = false;
        return;
      }

      final controller = CameraController(
        cameras[0],
        ResolutionPreset.high,
        enableAudio: false,
        imageFormatGroup: ImageFormatGroup.jpeg,
      );

      _controller = controller;

      controller.addListener(() {
        if (mounted) setState(() {});
        if (controller.value.hasError) {
          debugPrint('Camera error ${controller.value.errorDescription}');
        }
      });

      await controller.initialize();
      
      if (mounted) {
        setState(() {
          _isReady = true;
        });
      }
    } catch (e) {
      debugPrint('Error setting up cameras: $e');
    } finally {
      _isInitializing = false;
    }
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    // Note: dispose is synchronous, we call the async cleanup but it won't be awaited here.
    // However, we set _controller to null to prevent further use.
    _stopAndDisposeCamera();
    super.dispose();
  }

  Future<void> _stopAndDisposeCamera() async {
    final CameraController? tempController = _controller;
    _controller = null;
    if (mounted) {
      setState(() {
        _isReady = false;
      });
    }
    if (tempController != null) {
      await tempController.dispose();
    }
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    final CameraController? cameraController = _controller;

    if (cameraController == null || !cameraController.value.isInitialized) {
      return;
    }

    if (state == AppLifecycleState.inactive) {
      _stopAndDisposeCamera();
    } else if (state == AppLifecycleState.resumed) {
      _setupCameras();
    }
  }

  Future<void> _takePicture() async {
    if (_controller == null ||
        !_controller!.value.isInitialized ||
        _controller!.value.isTakingPicture ||
        _isProcessingPicture) {
      return;
    }

    try {
      setState(() {
        _isProcessingPicture = true;
      });
      final XFile file = await _controller!.takePicture();
      if (mounted) {
        Feedback.forTap(context);
        
        // Navigate to the Crop/Perspective adjustments screen
        final bool? accepted = await context.push<bool>('/upload/crop-preview', extra: file.path);
        
        if (mounted) {
          if (accepted == true) {
            final quality = await ref.read(scannerProvider.notifier).addImage(file.path);
            if (mounted) {
              setState(() {
                _isProcessingPicture = false;
              });
              if (!quality.isValid) {
                // Low quality scan! Redirect directly to QualityAlertScreen prior to upload
                context.push('/upload/quality-alert');
              } else {
                // High quality scan! Navigate to Review
                _navigateToReview();
              }
            }
          } else {
            // Retake was clicked, just reset processing flag so they can scan again
            setState(() {
              _isProcessingPicture = false;
            });
          }
        }
      }
    } catch (e) {
      debugPrint('Error taking picture: $e');
      if (mounted) {
        setState(() {
          _isProcessingPicture = false;
        });
      }
    }
  }


  IconData _getFlashIcon() {
    switch (_flashMode) {
      case 'on':
        return Icons.flash_on_rounded;
      case 'off':
        return Icons.flash_off_rounded;
      default:
        return Icons.flash_auto_rounded;
    }
  }

  Future<void> _toggleFlash() async {
    if (_controller == null || !_controller!.value.isInitialized) return;

    try {
      FlashMode nextMode;
      String nextModeLabel;
      
      if (_flashMode == 'auto') {
        nextMode = FlashMode.always;
        nextModeLabel = 'on';
      } else if (_flashMode == 'on') {
        nextMode = FlashMode.off;
        nextModeLabel = 'off';
      } else {
        nextMode = FlashMode.auto;
        nextModeLabel = 'auto';
      }

      await _controller!.setFlashMode(nextMode);
      setState(() {
        _flashMode = nextModeLabel;
      });
    } catch (e) {
      debugPrint('Error setting flash mode: $e');
    }
  }

  Future<void> _navigateToReview() async {
    // Stop camera before navigating to another screen to free resources and turn off camera light
    await _stopAndDisposeCamera();
    if (!mounted) return;
    
    // Wait for the user to return from review
    await context.push('/upload/review');
    
    // Restart camera when coming back
    if (mounted) {
      _setupCameras();
    }
  }

  @override
  Widget build(BuildContext context) {
    final scannerState = ref.watch(scannerProvider);

    if (!_isReady || _controller == null || !_controller!.value.isInitialized) {
      return Scaffold(
        backgroundColor: Colors.black,
        appBar: AppBar(
          backgroundColor: Colors.transparent,
          elevation: 0,
          leading: IconButton(
            icon: const Icon(Icons.close_rounded, color: Colors.white),
            onPressed: () => context.pop(),
          ),
        ),
        body: const Center(
          child: AppLoadingIndicator(
            size: 60,
            logoSize: 28,
          ),
        ),
      );
    }

    return Scaffold(
      backgroundColor: Colors.black,
      body: Stack(
        children: [
          Positioned.fill(
            child: FittedBox(
              fit: BoxFit.cover,
              child: SizedBox(
                width: 100,
                height: 100 * _controller!.value.aspectRatio,
                child: CameraPreview(_controller!),
              ),
            ),
          ),

          // Scanning Overlay
          _buildScanningOverlay(),

          // Top Controls
          SafeArea(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  _RoundIconButton(
                    icon: Icons.close_rounded,
                    onTap: () => context.pop(),
                  ),
                  const AppLogo(size: 32),
                  _RoundIconButton(
                    icon: _getFlashIcon(),
                    onTap: _toggleFlash,
                  ),
                ],
              ),
            ),
          ),
          
          // Selected Question Header
          SafeArea(
            child: Align(
              alignment: Alignment.topCenter,
              child: Padding(
                padding: const EdgeInsets.only(top: 60),
                child: Consumer(
                  builder: (context, ref, child) {
                    final selectedQuestion = ref.watch(selectedQuestionProvider);
                    final questionId = selectedQuestion?.questionId ?? '';
                    return Container(
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                      decoration: BoxDecoration(
                        color: Colors.black.withValues(alpha: 0.65),
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(color: AppTheme.primaryColor.withValues(alpha: 0.4)),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const Icon(Icons.camera_alt_outlined, color: AppTheme.primaryColor, size: 16),
                          const SizedBox(width: 8),
                          Text(
                            'Question $questionId',
                            style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w900, fontSize: 13, letterSpacing: 0.5),
                          ),
                        ],
                      ),
                    );
                  },
                ),
              ),
            ),
          ),

          // Bottom Control Area
          Align(
            alignment: Alignment.bottomCenter,
            child: Container(
              padding: const EdgeInsets.fromLTRB(24, 32, 24, 48),
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: [
                    Colors.transparent,
                    Colors.black.withValues(alpha: 0.8),
                  ],
                ),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  // Thumbnail / Gallery
                  GestureDetector(
                    onTap: scannerState.imagePaths.isNotEmpty ? _navigateToReview : null,
                    child: Container(
                      width: 54,
                      height: 54,
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: Colors.white, width: 2),
                        color: Colors.white10,
                      ),
                      child: scannerState.imagePaths.isNotEmpty
                          ? ClipRRect(
                              borderRadius: BorderRadius.circular(10),
                              child: AppImage(path: scannerState.imagePaths.last),
                            )
                          : const Icon(Icons.photo_library_rounded, color: Colors.white70),
                    ),
                  ),

                  // Shutter Button
                  GestureDetector(
                    onTap: _takePicture,
                    child: Container(
                      width: 80,
                      height: 80,
                      padding: const EdgeInsets.all(4),
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        border: Border.all(color: Colors.white, width: 4),
                      ),
                      child: Container(
                        decoration: const BoxDecoration(
                          color: Colors.white,
                          shape: BoxShape.circle,
                        ),
                        child: _isAligned 
                          ? const Icon(Icons.camera_rounded, size: 40, color: Colors.black)
                          : null,
                      ),
                    ),
                  ),

                  // Done / Review Button
                  _RoundIconButton(
                    icon: Icons.check_rounded,
                    onTap: scannerState.imagePaths.isNotEmpty ? _navigateToReview : () {},
                    color: scannerState.imagePaths.isNotEmpty ? AppTheme.primaryColor : Colors.white10,
                    iconColor: Colors.white,
                    size: 54,
                  ),
                ],
              ),
            ),
          ),
          
          // Shutter Processing Loading Overlay
          if (_isProcessingPicture)
            Positioned.fill(
              child: Container(
                color: Colors.black.withValues(alpha: 0.55),
                child: Center(
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 24),
                    decoration: BoxDecoration(
                      color: Colors.black.withValues(alpha: 0.8),
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: Colors.white.withValues(alpha: 0.1)),
                      boxShadow: AppTheme.premiumShadow,
                    ),
                    child: const Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        CircularProgressIndicator(
                          color: AppTheme.primaryColor,
                          strokeWidth: 3,
                        ),
                        SizedBox(height: 16),
                        Text(
                          'OPTIMIZING SCAN QUALITY',
                          style: TextStyle(
                            color: Colors.white,
                            fontSize: 12,
                            fontWeight: FontWeight.w900,
                            letterSpacing: 1.5,
                          ),
                        ),
                        SizedBox(height: 6),
                        Text(
                          'Analyzing focus & compressing JPEG...',
                          style: TextStyle(
                            color: Colors.white70,
                            fontSize: 11,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildScanningOverlay() {
    final overlayWidth = MediaQuery.of(context).size.width * 0.85;
    final overlayHeight = MediaQuery.of(context).size.height * 0.65;

    return Center(
      child: SizedBox(
        width: overlayWidth,
        height: overlayHeight,
        child: Stack(
          alignment: Alignment.center,
          children: [
            // Outer rectangle
            AnimatedContainer(
              duration: const Duration(milliseconds: 500),
              width: overlayWidth,
              height: overlayHeight,
              decoration: BoxDecoration(
                border: Border.all(
                  color: _isAligned ? AppTheme.successColor : Colors.white24,
                  width: 1.5,
                ),
                borderRadius: BorderRadius.circular(24),
              ),
            ),

            // Top-left L bracket
            Positioned(
              left: 0,
              top: 0,
              child: Container(
                width: 24,
                height: 24,
                decoration: const BoxDecoration(
                  border: Border(
                    left: BorderSide(color: AppTheme.primaryColor, width: 4),
                    top: BorderSide(color: AppTheme.primaryColor, width: 4),
                  ),
                  borderRadius: BorderRadius.only(topLeft: Radius.circular(12)),
                ),
              ),
            ),

            // Top-right L bracket
            Positioned(
              right: 0,
              top: 0,
              child: Container(
                width: 24,
                height: 24,
                decoration: const BoxDecoration(
                  border: Border(
                    right: BorderSide(color: AppTheme.primaryColor, width: 4),
                    top: BorderSide(color: AppTheme.primaryColor, width: 4),
                  ),
                  borderRadius: BorderRadius.only(topRight: Radius.circular(12)),
                ),
              ),
            ),

            // Bottom-left L bracket
            Positioned(
              left: 0,
              bottom: 0,
              child: Container(
                width: 24,
                height: 24,
                decoration: const BoxDecoration(
                  border: Border(
                    left: BorderSide(color: AppTheme.primaryColor, width: 4),
                    bottom: BorderSide(color: AppTheme.primaryColor, width: 4),
                  ),
                  borderRadius: BorderRadius.only(bottomLeft: Radius.circular(12)),
                ),
              ),
            ),

            // Bottom-right L bracket
            Positioned(
              right: 0,
              bottom: 0,
              child: Container(
                width: 24,
                height: 24,
                decoration: const BoxDecoration(
                  border: Border(
                    right: BorderSide(color: AppTheme.primaryColor, width: 4),
                    bottom: BorderSide(color: AppTheme.primaryColor, width: 4),
                  ),
                  borderRadius: BorderRadius.only(bottomRight: Radius.circular(12)),
                ),
              ),
            ),

            // Laser line
            TweenAnimationBuilder<double>(
              key: ValueKey(_laserPos),
              tween: Tween<double>(begin: _laserPos == 0.95 ? 0.05 : 0.95, end: _laserPos),
              duration: const Duration(seconds: 2),
              curve: Curves.easeInOut,
              onEnd: () {
                setState(() {
                  _laserPos = _laserPos == 0.95 ? 0.05 : 0.95;
                });
              },
              builder: (context, value, child) {
                return Positioned(
                  top: overlayHeight * value,
                  left: 8,
                  right: 8,
                  child: Container(
                    height: 2,
                    decoration: BoxDecoration(
                      color: AppTheme.primaryColor,
                      boxShadow: [
                        BoxShadow(
                          color: AppTheme.primaryColor.withValues(alpha: 0.8),
                          blurRadius: 8,
                          spreadRadius: 2,
                        ),
                      ],
                    ),
                  ),
                );
              },
            ),

            if (!_isAligned)
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                decoration: BoxDecoration(
                  color: Colors.black54,
                  borderRadius: BorderRadius.circular(20),
                ),
                child: const Text(
                  'Align paper within guides',
                  style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13),
                ),
              ),
          ],
        ),
      ),
    );
  }
}

class _RoundIconButton extends StatelessWidget {
  final IconData icon;
  final VoidCallback onTap;
  final Color? color;
  final Color? iconColor;
  final double size;

  const _RoundIconButton({
    required this.icon,
    required this.onTap,
    this.color,
    this.iconColor,
    this.size = 44,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(size / 2),
      child: Container(
        width: size,
        height: size,
        decoration: BoxDecoration(
          color: color ?? Colors.black.withValues(alpha: 0.4),
          shape: BoxShape.circle,
        ),
        child: Icon(icon, color: iconColor ?? Colors.white, size: size * 0.5),
      ),
    );
  }
}
