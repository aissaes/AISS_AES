import 'package:flutter/material.dart';
import '../../core/theme/app_theme.dart';

enum ResponseDialogType { success, error, warning, info }

class ResponseDialog extends StatefulWidget {
  final String title;
  final String message;
  final ResponseDialogType type;
  final String? buttonText;
  final VoidCallback? onConfirm;

  const ResponseDialog({
    super.key,
    required this.title,
    required this.message,
    required this.type,
    this.buttonText,
    this.onConfirm,
  });

  /// Static helper to display the popup dialog with custom scale/opacity transition.
  static Future<void> show(
    BuildContext context, {
    required String title,
    required String message,
    required ResponseDialogType type,
    String? buttonText,
    VoidCallback? onConfirm,
  }) {
    return showGeneralDialog(
      context: context,
      barrierDismissible: true,
      barrierLabel: 'Response Dialog',
      barrierColor: Colors.black.withValues(alpha: 0.6),
      transitionDuration: const Duration(milliseconds: 350),
      pageBuilder: (context, anim1, anim2) {
        return ResponseDialog(
          title: title,
          message: message,
          type: type,
          buttonText: buttonText,
          onConfirm: onConfirm,
        );
      },
      transitionBuilder: (context, anim1, anim2, child) {
        final curveValue = Curves.easeOutBack.transform(anim1.value);
        return Transform.scale(
          scale: 0.85 + (curveValue * 0.15),
          child: Opacity(
            opacity: anim1.value.clamp(0.0, 1.0),
            child: child,
          ),
        );
      },
    );
  }

  @override
  State<ResponseDialog> createState() => _ResponseDialogState();
}

class _ResponseDialogState extends State<ResponseDialog> with SingleTickerProviderStateMixin {
  late AnimationController _pulseController;

  @override
  void initState() {
    super.initState();
    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 2),
    )..repeat(reverse: true);
  }

  @override
  void dispose() {
    _pulseController.dispose();
    super.dispose();
  }

  Color _getThemeColor() {
    switch (widget.type) {
      case ResponseDialogType.success:
        return AppTheme.successColor;
      case ResponseDialogType.error:
        return AppTheme.errorColor;
      case ResponseDialogType.warning:
        return const Color(0xFFD97706); // Rich warning orange/amber
      case ResponseDialogType.info:
        return AppTheme.primaryColor;
    }
  }

  IconData _getIcon() {
    switch (widget.type) {
      case ResponseDialogType.success:
        return Icons.check_circle_rounded;
      case ResponseDialogType.error:
        return Icons.error_outline_rounded;
      case ResponseDialogType.warning:
        return Icons.warning_amber_rounded;
      case ResponseDialogType.info:
        return Icons.info_outline_rounded;
    }
  }

  String _getDefaultButtonText() {
    switch (widget.type) {
      case ResponseDialogType.success:
        return 'Continue';
      case ResponseDialogType.error:
        return 'Try Again';
      case ResponseDialogType.warning:
        return 'Understood';
      case ResponseDialogType.info:
        return 'OK';
    }
  }

  @override
  Widget build(BuildContext context) {
    final themeColor = _getThemeColor();
    final iconData = _getIcon();
    final buttonText = widget.buttonText ?? _getDefaultButtonText();

    return Dialog(
      backgroundColor: Colors.transparent,
      elevation: 0,
      insetPadding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 24.0),
      child: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 380),
          child: Container(
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(28),
              boxShadow: AppTheme.premiumShadow,
            ),
            child: ClipRRect(
              borderRadius: BorderRadius.circular(28),
              child: Stack(
                children: [
                  // Premium gradient top indicator line matching status theme
                  Positioned(
                    top: 0,
                    left: 0,
                    right: 0,
                    height: 6,
                    child: Container(
                      decoration: BoxDecoration(
                        gradient: LinearGradient(
                          colors: [
                            themeColor,
                            themeColor.withValues(alpha: 0.4),
                          ],
                        ),
                      ),
                    ),
                  ),
                  
                  // Content details
                  Padding(
                    padding: const EdgeInsets.fromLTRB(24, 38, 24, 24),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        // Animated pulsing outer border and logo overlay
                        Center(
                          child: AnimatedBuilder(
                            animation: _pulseController,
                            builder: (context, child) {
                              return Container(
                                padding: const EdgeInsets.all(16),
                                decoration: BoxDecoration(
                                  color: themeColor.withValues(alpha: 0.08),
                                  shape: BoxShape.circle,
                                  border: Border.all(
                                    color: themeColor.withValues(alpha: 0.15 + (_pulseController.value * 0.25)),
                                    width: 1.5 + (_pulseController.value * 3.5),
                                  ),
                                ),
                                child: Icon(
                                  iconData,
                                  color: themeColor,
                                  size: 44,
                                ),
                              );
                            },
                          ),
                        ),
                        const SizedBox(height: 24),
                        
                        // Title header
                        Text(
                          widget.title,
                          textAlign: TextAlign.center,
                          style: const TextStyle(
                            fontSize: 20,
                            fontWeight: FontWeight.w800,
                            color: AppTheme.textPrimary,
                            letterSpacing: -0.5,
                          ),
                        ),
                        const SizedBox(height: 12),
                        
                        // Scrollable response body details
                        Flexible(
                          child: SingleChildScrollView(
                            physics: const BouncingScrollPhysics(),
                            child: Text(
                              widget.message,
                              textAlign: TextAlign.center,
                              style: const TextStyle(
                                fontSize: 14.5,
                                height: 1.5,
                                color: AppTheme.textSecondary,
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(height: 28),
                        
                        // Affirmative confirmation button
                        ElevatedButton(
                          onPressed: () {
                            Navigator.pop(context);
                            if (widget.onConfirm != null) {
                              widget.onConfirm!();
                            }
                          },
                          style: ElevatedButton.styleFrom(
                            backgroundColor: themeColor,
                            foregroundColor: Colors.white,
                            minimumSize: const Size(double.infinity, 50),
                            elevation: 0,
                            shadowColor: themeColor.withValues(alpha: 0.4),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(16),
                            ),
                          ),
                          child: Text(
                            buttonText,
                            style: const TextStyle(
                              fontSize: 14.5,
                              fontWeight: FontWeight.w700,
                              letterSpacing: 0.5,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
