import 'dart:ui';
import 'package:flutter/material.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../shared/widgets/app_logo.dart';

// =============================================================================
// APP BAR
// Floating, blurred nav bar with avatar initials and brand logo.
// =============================================================================
class DashboardAppBar extends StatelessWidget {
  final String displayName;

  const DashboardAppBar({super.key, required this.displayName});

  @override
  Widget build(BuildContext context) {
    final initials = _initials(displayName);

    return SliverAppBar(
      floating: true,
      backgroundColor: AppTheme.backgroundColor.withValues(alpha: 0.8),
      surfaceTintColor: Colors.transparent,
      flexibleSpace: ClipRect(
        child: BackdropFilter(
          filter: ImageFilter.blur(sigmaX: 10, sigmaY: 10),
          child: Container(color: Colors.transparent),
        ),
      ),
      leading: Padding(
        padding: const EdgeInsets.only(left: 20.0),
        child: Center(
          child: CircleAvatar(
            radius: 18,
            backgroundColor: AppTheme.primaryColor.withValues(alpha: 0.1),
            child: Text(
              initials,
              style: const TextStyle(
                color: AppTheme.primaryColor,
                fontSize: 12,
                fontWeight: FontWeight.w800,
              ),
            ),
          ),
        ),
      ),
      title: const Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          AppLogo(size: 24),
          SizedBox(width: 8),
          Text(
            'AISS AES',
            style: TextStyle(
              fontWeight: FontWeight.w900,
              color: AppTheme.primaryColor,
              fontSize: 18,
              letterSpacing: -0.5,
            ),
          ),
        ],
      ),
      actions: const [
        Icon(Icons.verified_user_rounded, color: AppTheme.successColor, size: 20),
        SizedBox(width: 24),
      ],
    );
  }

  String _initials(String name) {
    if (name.isEmpty) return 'S';
    return name.split(' ').map((e) => e[0]).take(2).join().toUpperCase();
  }
}
