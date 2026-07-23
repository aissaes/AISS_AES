import 'package:camera/camera.dart';
import 'package:flutter/material.dart';
import '../../../core/utils/app_logger.dart';

class CameraService {
  CameraController? _controller;
  String _flashMode = 'auto';
  bool _isInitializing = false;

  CameraController? get controller => _controller;
  bool get isReady => _controller != null && _controller!.value.isInitialized;
  String get flashMode => _flashMode;

  IconData get flashIcon {
    switch (_flashMode) {
      case 'always':
        return Icons.flash_on_rounded;
      case 'off':
        return Icons.flash_off_rounded;
      default:
        return Icons.flash_auto_rounded;
    }
  }

  Future<bool> initializeCamera(VoidCallback onControllerUpdated) async {
    if (_isInitializing) return false;
    _isInitializing = true;

    try {
      await disposeCamera();

      final cameras = await availableCameras();
      if (cameras.isEmpty) {
        _isInitializing = false;
        return false;
      }

      final controller = CameraController(
        cameras[0],
        ResolutionPreset.high,
        enableAudio: false,
        imageFormatGroup: ImageFormatGroup.jpeg,
      );

      _controller = controller;

      controller.addListener(() {
        onControllerUpdated();
        if (controller.value.hasError) {
          AppLogger.w('Camera error ${controller.value.errorDescription}');
        }
      });

      await controller.initialize();
      return true;
    } catch (e) {
      AppLogger.w('Error setting up cameras: $e');
      return false;
    } finally {
      _isInitializing = false;
    }
  }

  Future<void> toggleFlash(VoidCallback onStateUpdated) async {
    if (!isReady) return;
    try {
      if (_flashMode == 'auto') {
        _flashMode = 'always';
        await _controller!.setFlashMode(FlashMode.always);
      } else if (_flashMode == 'always') {
        _flashMode = 'off';
        await _controller!.setFlashMode(FlashMode.off);
      } else {
        _flashMode = 'auto';
        await _controller!.setFlashMode(FlashMode.auto);
      }
      onStateUpdated();
    } catch (e) {
      AppLogger.w('Error setting flash mode: $e');
    }
  }

  Future<XFile?> takePicture() async {
    if (!isReady) return null;
    try {
      return await _controller!.takePicture();
    } catch (e) {
      AppLogger.w('Error taking picture: $e');
      return null;
    }
  }

  Future<void> disposeCamera() async {
    final CameraController? tempController = _controller;
    _controller = null;
    if (tempController != null) {
      try {
        await tempController.dispose();
      } catch (_) {}
    }
  }
}
