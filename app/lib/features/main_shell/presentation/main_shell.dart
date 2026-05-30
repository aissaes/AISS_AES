import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';
import '../../../core/theme/app_theme.dart';

class MainShell extends StatefulWidget {
  const MainShell({
    required this.navigationShell,
    super.key,
  });

  final StatefulNavigationShell navigationShell;

  @override
  State<MainShell> createState() => _MainShellState();
}

class _MainShellState extends State<MainShell> {
  // Navigation tab stack (history)
  final List<int> _tabHistory = [0];

  void _onTabTapped(int index) {
    if (index == widget.navigationShell.currentIndex) return;
    
    setState(() {
      // Remove index if it already exists to move it to the end of history
      _tabHistory.remove(index);
      _tabHistory.add(index);
    });
    
    widget.navigationShell.goBranch(index);
  }

  Future<bool> _showExitConfirmationDialog(BuildContext context) async {
    final result = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Row(
          children: [
            Icon(Icons.exit_to_app_rounded, color: AppTheme.errorColor),
            SizedBox(width: 12),
            Text('Exit App', style: TextStyle(fontWeight: FontWeight.w900, fontSize: 18)),
          ],
        ),
        content: const Text(
          'Are you sure you want to close AISS Exam Portal?',
          style: TextStyle(color: AppTheme.textSecondary, fontSize: 14, height: 1.4),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel', style: TextStyle(fontWeight: FontWeight.bold)),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(context, true),
            style: ElevatedButton.styleFrom(
              backgroundColor: AppTheme.errorColor,
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
            ),
            child: const Text('Exit', style: TextStyle(fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );
    return result ?? false;
  }

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: false, // Prevent standard exit to handle tab history first
      onPopInvokedWithResult: (didPop, result) async {
        if (didPop) return;
        
        if (_tabHistory.length > 1) {
          setState(() {
            _tabHistory.removeLast();
            final prevIndex = _tabHistory.last;
            widget.navigationShell.goBranch(prevIndex);
          });
        } else {
          final shouldExit = await _showExitConfirmationDialog(context);
          if (shouldExit == true && mounted) {
            SystemNavigator.pop(); // Clean native exit
          }
        }
      },
      child: Scaffold(
        extendBody: true, // Allows the body to flow behind the navigation bar
        body: widget.navigationShell,
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
