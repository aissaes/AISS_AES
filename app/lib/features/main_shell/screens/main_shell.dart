import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../auth/providers/auth_provider.dart';
import '../../../shared/dialogs/app_exit_dialog.dart';
import '../../exams/services/exam_session_manager.dart';
import '../../../core/utils/app_logger.dart';
import '../widgets/modern_bottom_nav.dart';
import '../widgets/shell_body.dart';

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
  void _onTabTapped(int index) {
    final sessionManager = ref.read(examSessionManagerProvider);
    if (sessionManager.isKioskLocked) {
      AppLogger.w('[MainShell] Tab switching blocked: Exam Kiosk Mode Active');
      return;
    }
    if (index == widget.navigationShell.currentIndex) return;
    widget.navigationShell.goBranch(index);
  }

  Future<void> _handleBackPress() async {
    final currentIndex = widget.navigationShell.currentIndex;
    if (currentIndex != 0) {
      widget.navigationShell.goBranch(0);
    } else {
      await AppExitDialog.show(context);
    }
  }

  @override
  Widget build(BuildContext context) {
    final isOffline = ref.watch(authProvider).isOffline;

    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, _) async {
        if (didPop) return;
        await _handleBackPress();
      },
      child: Scaffold(
        extendBody: true,
        body: ShellBody(
          isOffline: isOffline,
          child: widget.navigationShell,
        ),
        bottomNavigationBar: ModernBottomNav(
          currentIndex: widget.navigationShell.currentIndex,
          onTap: _onTabTapped,
        ),
      ),
    );
  }
}
