import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../auth/providers/auth_provider.dart';
import '../../../core/theme/app_theme.dart';
import '../../../shared/widgets/confirmation_dialog.dart';

class MainShell extends ConsumerStatefulWidget {
  const MainShell({
    required this.navigationShell,
    super.key,
  });

  final StatefulNavigationShell navigationShell;

  @override
  ConsumerState<MainShell> createState() => _MainShellState();
}

class _MainShellState extends ConsumerState<MainShell> {
  _MainShellState() {
    debugPrint('MAIN SHELL CREATED');
  }

  void _onTabTapped(int index) {
    if (index == widget.navigationShell.currentIndex) return;
    widget.navigationShell.goBranch(index);
  }

  Future<bool> _handleBackPress() async {
    final currentIndex = widget.navigationShell.currentIndex;
    if (currentIndex != 0) {
      widget.navigationShell.goBranch(0);
      return true; // Consume back gesture
    } else {
      final shouldExit = await ConfirmationDialog.show(
        context,
        title: 'Exit AISS AES?',
        message: 'Are you sure you want to exit AISS AES?',
        type: ConfirmationDialogType.danger,
        cancelText: 'Cancel',
        confirmText: 'Exit',
        icon: Icons.exit_to_app_rounded,
      );
      if (shouldExit == true && mounted) {
        SystemNavigator.pop();
      }
      return true; // Consume back gesture
    }
  }

  @override
  Widget build(BuildContext context) {
    debugPrint('MAIN SHELL REBUILT');
    final authState = ref.watch(authProvider);
    final isOffline = authState.isOffline;

    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, result) async {
        if (didPop) return;
        await _handleBackPress();
      },
      child: Scaffold(
        extendBody: true, // Allows the body to flow behind the navigation bar
        body: Column(
          children: [
            if (isOffline)
              Container(
                width: double.infinity,
                color: Colors.orange.shade800,
                padding: EdgeInsets.only(
                  top: MediaQuery.of(context).padding.top + 8,
                  bottom: 8,
                ),
                child: const Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(Icons.wifi_off_rounded, size: 16, color: Colors.white),
                    SizedBox(width: 8),
                    Text(
                      'Offline Mode — Viewing Cached Data',
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 12,
                        fontWeight: FontWeight.bold,
                        letterSpacing: 0.5,
                      ),
                    ),
                  ],
                ),
              ),
            Expanded(
              child: isOffline
                  ? MediaQuery.removePadding(
                      context: context,
                      removeTop: true,
                      child: widget.navigationShell,
                    )
                  : widget.navigationShell,
            ),
          ],
        ),
        bottomNavigationBar: _ModernBottomNav(
          currentIndex: widget.navigationShell.currentIndex,
          onTap: _onTabTapped,
        ),
      ),
    );
  }
}

class _ModernBottomNav extends StatelessWidget {
  final int currentIndex;
  final ValueChanged<int> onTap;

  const _ModernBottomNav({
    required this.currentIndex,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final bottomPadding = MediaQuery.of(context).padding.bottom;
    
    return Container(
      margin: EdgeInsets.fromLTRB(24, 0, 24, bottomPadding > 0 ? bottomPadding : 16),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(AppTheme.borderRadiusExtraLarge),
        child: BackdropFilter(
          filter: ImageFilter.blur(sigmaX: 12, sigmaY: 12),
          child: Container(
            height: 64,
            decoration: BoxDecoration(
              color: Colors.white.withValues(alpha: 0.85),
              borderRadius: BorderRadius.circular(AppTheme.borderRadiusExtraLarge),
              border: Border.all(
                color: Colors.white.withValues(alpha: 0.3),
                width: 1.5,
              ),
              boxShadow: AppTheme.premiumShadow,
            ),
            padding: const EdgeInsets.symmetric(horizontal: 8),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: [
                _NavItem(
                  index: 0,
                  icon: Icons.grid_view_outlined,
                  activeIcon: Icons.grid_view_rounded,
                  label: 'Home',
                  isActive: currentIndex == 0,
                  onTap: () => onTap(0),
                ),
                _NavItem(
                  index: 1,
                  icon: Icons.assignment_outlined,
                  activeIcon: Icons.assignment_rounded,
                  label: 'Exams',
                  isActive: currentIndex == 1,
                  onTap: () => onTap(1),
                ),
                _NavItem(
                  index: 2,
                  icon: Icons.person_outline_rounded,
                  activeIcon: Icons.person_rounded,
                  label: 'Profile',
                  isActive: currentIndex == 2,
                  onTap: () => onTap(2),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _NavItem extends StatelessWidget {
  final int index;
  final IconData icon;
  final IconData activeIcon;
  final String label;
  final bool isActive;
  final VoidCallback onTap;

  const _NavItem({
    required this.index,
    required this.icon,
    required this.activeIcon,
    required this.label,
    required this.isActive,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final color = isActive ? AppTheme.primaryColor : AppTheme.textSecondary;
    
    return GestureDetector(
      onTap: onTap,
      behavior: HitTestBehavior.opaque,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 300),
        curve: Curves.easeInOut,
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        decoration: BoxDecoration(
          color: isActive ? AppTheme.primaryColor.withValues(alpha: 0.1) : Colors.transparent,
          borderRadius: BorderRadius.circular(AppTheme.borderRadiusLarge),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            AnimatedScale(
              scale: isActive ? 1.1 : 1.0,
              duration: const Duration(milliseconds: 200),
              child: Icon(
                isActive ? activeIcon : icon,
                color: color,
                size: 24,
              ),
            ),
            const SizedBox(height: 2),
            Text(
              label,
              style: TextStyle(
                color: color,
                fontSize: 10,
                fontWeight: isActive ? FontWeight.w700 : FontWeight.w500,
                letterSpacing: 0.2,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
