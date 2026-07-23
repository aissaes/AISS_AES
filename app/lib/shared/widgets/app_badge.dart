import 'package:flutter/material.dart';

// =============================================================================
// APP BADGE
// Universal status, tag, and category pill widget.
// Preserves exact design system styling while eliminating duplicate code.
// =============================================================================
enum AppBadgeVariant { soft, filled, outline }

class AppBadge extends StatelessWidget {
  final String label;
  final Widget? icon;
  final Color color;
  final AppBadgeVariant variant;
  final double fontSize;
  final EdgeInsetsGeometry? padding;
  final double borderRadius;

  const AppBadge({
    super.key,
    required this.label,
    this.icon,
    required this.color,
    this.variant = AppBadgeVariant.soft,
    this.fontSize = 9.0,
    this.padding,
    this.borderRadius = 6.0,
  });

  /// Factory for quick soft-tinted status badges (most common across app)
  factory AppBadge.soft({
    Key? key,
    required String label,
    Widget? icon,
    required Color color,
    double fontSize = 9.0,
    EdgeInsetsGeometry? padding,
    double borderRadius = 6.0,
  }) {
    return AppBadge(
      key: key,
      label: label,
      icon: icon,
      color: color,
      variant: AppBadgeVariant.soft,
      fontSize: fontSize,
      padding: padding,
      borderRadius: borderRadius,
    );
  }

  /// Factory for solid filled badges
  factory AppBadge.filled({
    Key? key,
    required String label,
    Widget? icon,
    required Color color,
    double fontSize = 9.0,
    EdgeInsetsGeometry? padding,
  }) {
    return AppBadge(
      key: key,
      label: label,
      icon: icon,
      color: color,
      variant: AppBadgeVariant.filled,
      fontSize: fontSize,
      padding: padding,
    );
  }

  @override
  Widget build(BuildContext context) {
    final effectivePadding = padding ?? const EdgeInsets.symmetric(horizontal: 8, vertical: 4);

    final (bgColor, textColor, border) = switch (variant) {
      AppBadgeVariant.soft => (
          color.withValues(alpha: 0.1),
          color,
          null,
        ),
      AppBadgeVariant.filled => (
          color,
          Colors.white,
          null,
        ),
      AppBadgeVariant.outline => (
          Colors.transparent,
          color,
          Border.all(color: color.withValues(alpha: 0.3)),
        ),
    };

    return Container(
      padding: effectivePadding,
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: BorderRadius.circular(borderRadius),
        border: border,
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (icon != null) ...[
            icon!,
            const SizedBox(width: 4),
          ],
          Text(
            label,
            style: TextStyle(
              color: textColor,
              fontSize: fontSize,
              fontWeight: FontWeight.w900,
              letterSpacing: 0.5,
            ),
          ),
        ],
      ),
    );
  }
}
