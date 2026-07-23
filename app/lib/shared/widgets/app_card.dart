import 'package:flutter/material.dart';
import '../../core/theme/app_theme.dart';

// =============================================================================
// APP CARD
// Universal surface card container for the entire application.
// Guarantees pixel-perfect styling fidelity with AppTheme.
// =============================================================================
class AppCard extends StatelessWidget {
  final Widget child;
  final EdgeInsetsGeometry padding;
  final EdgeInsetsGeometry? margin;
  final double borderRadius;
  final Color? backgroundColor;
  final Color? borderColor;
  final double borderWidth;
  final List<BoxShadow>? boxShadow;
  final Gradient? gradient;
  final VoidCallback? onTap;

  const AppCard({
    super.key,
    required this.child,
    this.padding = const EdgeInsets.all(20),
    this.margin,
    this.borderRadius = AppTheme.borderRadiusLarge,
    this.backgroundColor,
    this.borderColor,
    this.borderWidth = 1.0,
    this.boxShadow,
    this.gradient,
    this.onTap,
  });

  /// Factory for standard elevated soft-shadow card
  factory AppCard.elevated({
    Key? key,
    required Widget child,
    EdgeInsetsGeometry padding = const EdgeInsets.all(20),
    EdgeInsetsGeometry? margin,
    double borderRadius = AppTheme.borderRadiusLarge,
    Color? backgroundColor,
    Color? borderColor,
    VoidCallback? onTap,
  }) {
    return AppCard(
      key: key,
      padding: padding,
      margin: margin,
      borderRadius: borderRadius,
      backgroundColor: backgroundColor ?? AppTheme.surfaceColor,
      borderColor: borderColor ?? AppTheme.outlineColor.withValues(alpha: 0.15),
      boxShadow: AppTheme.softShadow,
      onTap: onTap,
      child: child,
    );
  }

  /// Factory for primary gradient hero card
  factory AppCard.gradient({
    Key? key,
    required Widget child,
    required List<Color> colors,
    EdgeInsetsGeometry padding = const EdgeInsets.all(24),
    EdgeInsetsGeometry? margin,
    double borderRadius = AppTheme.borderRadius2XL,
    VoidCallback? onTap,
  }) {
    return AppCard(
      key: key,
      padding: padding,
      margin: margin,
      borderRadius: borderRadius,
      gradient: LinearGradient(
        colors: colors,
        begin: Alignment.topLeft,
        end: Alignment.bottomRight,
      ),
      boxShadow: [
        BoxShadow(
          color: colors.first.withValues(alpha: 0.3),
          blurRadius: 20,
          offset: const Offset(0, 10),
        ),
      ],
      onTap: onTap,
      child: child,
    );
  }

  @override
  Widget build(BuildContext context) {
    final effectiveBgColor = gradient != null
        ? null
        : (backgroundColor ?? AppTheme.surfaceColor);

    final effectiveBorder = borderColor != null
        ? Border.all(color: borderColor!, width: borderWidth)
        : Border.all(color: AppTheme.outlineColor, width: borderWidth);

    final cardContainer = Container(
      margin: margin,
      padding: padding,
      decoration: BoxDecoration(
        color: effectiveBgColor,
        gradient: gradient,
        borderRadius: BorderRadius.circular(borderRadius),
        border: effectiveBorder,
        boxShadow: boxShadow ?? AppTheme.softShadow,
      ),
      child: child,
    );

    if (onTap != null) {
      return Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(borderRadius),
          child: cardContainer,
        ),
      );
    }

    return cardContainer;
  }
}
