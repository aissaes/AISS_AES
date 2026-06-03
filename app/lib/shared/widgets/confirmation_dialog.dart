import 'package:flutter/material.dart';
import '../../core/theme/app_theme.dart';

enum ConfirmationDialogType { primary, danger, warning }

class ConfirmationDialog extends StatefulWidget {
  final String title;
  final String message;
  final ConfirmationDialogType type;
  final String cancelText;
  final String confirmText;
  final IconData icon;

  const ConfirmationDialog({
    super.key,
    required this.title,
    required this.message,
    required this.type,
    required this.cancelText,
    required this.confirmText,
    required this.icon,
  });

  /// Static helper to display the confirmation dialog with custom scale/opacity transition.
  static Future<bool> show(
    BuildContext context, {
    required String title,
    required String message,
    required ConfirmationDialogType type,
    String cancelText = 'Cancel',
    String confirmText = 'Confirm',
    IconData icon = Icons.help_outline_rounded,
  }) async {
    final result = await showGeneralDialog<bool>(
      context: context,
      barrierDismissible: true,
      barrierLabel: 'Confirmation Dialog',
      barrierColor: Colors.black.withValues(alpha: 0.6),
      transitionDuration: const Duration(milliseconds: 350),
      pageBuilder: (context, anim1, anim2) {
        return ConfirmationDialog(
          title: title,
          message: message,
          type: type,
          cancelText: cancelText,
          confirmText: confirmText,
          icon: icon,
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
    return result ?? false;
  }

  @override
  State<ConfirmationDialog> createState() => _ConfirmationDialogState();
}

class _ConfirmationDialogState extends State<ConfirmationDialog> with SingleTickerProviderStateMixin {
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
      case ConfirmationDialogType.primary:
        return AppTheme.primaryColor;
      case ConfirmationDialogType.danger:
        return AppTheme.errorColor;
      case ConfirmationDialogType.warning:
        return const Color(0xFFD97706); // Rich warning orange/amber
    }
  }

  @override
  Widget build(BuildContext context) {
    final themeColor = _getThemeColor();

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
                                  widget.icon,
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
                        
                        // Scrollable confirmation body details
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
                        
                        // Action buttons row
                        Row(
                          children: [
                            Expanded(
                              child: OutlinedButton(
                                onPressed: () => Navigator.pop(context, false),
                                style: OutlinedButton.styleFrom(
                                  minimumSize: const Size(0, 50),
                                  side: BorderSide(color: AppTheme.outlineColor.withValues(alpha: 0.2)),
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(16),
                                  ),
                                ),
                                child: Text(
                                  widget.cancelText,
                                  style: const TextStyle(
                                    fontSize: 14.5,
                                    fontWeight: FontWeight.bold,
                                    color: AppTheme.textSecondary,
                                  ),
                                ),
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: ElevatedButton(
                                onPressed: () => Navigator.pop(context, true),
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: themeColor,
                                  foregroundColor: Colors.white,
                                  minimumSize: const Size(0, 50),
                                  elevation: 0,
                                  shadowColor: themeColor.withValues(alpha: 0.4),
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(16),
                                  ),
                                ),
                                child: Text(
                                  widget.confirmText,
                                  style: const TextStyle(
                                    fontSize: 14.5,
                                    fontWeight: FontWeight.w700,
                                    letterSpacing: 0.5,
                                  ),
                                ),
                              ),
                            ),
                          ],
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
