import 'package:flutter/material.dart';
import '../../../../core/theme/app_theme.dart';

enum ExamTab { live, upcoming, history }

// =============================================================================
// EXAM SEGMENTED CONTROL
// Animated sliding pill control for selecting Live / Upcoming / History.
// =============================================================================
class ExamSegmentedControl extends StatelessWidget {
  final ExamTab selectedTab;
  final ValueChanged<ExamTab> onTabSelected;

  const ExamSegmentedControl({
    super.key,
    required this.selectedTab,
    required this.onTabSelected,
  });

  static const _tabs = ['Live', 'Upcoming', 'History'];
  static const _tabEnums = [ExamTab.live, ExamTab.upcoming, ExamTab.history];

  int get _selectedIndex => _tabEnums.indexOf(selectedTab);

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 46,
      padding: const EdgeInsets.all(4),
      decoration: BoxDecoration(
        color: AppTheme.outlineVariant.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(12),
      ),
      child: LayoutBuilder(
        builder: (context, constraints) {
          final tabWidth = constraints.maxWidth / 3;
          return Stack(
            children: [
              AnimatedPositioned(
                duration: const Duration(milliseconds: 220),
                curve: Curves.easeInOutCubic,
                left: _selectedIndex * tabWidth,
                width: tabWidth,
                height: 38,
                child: Container(
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(10),
                    boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.05), blurRadius: 4, offset: const Offset(0, 2))],
                  ),
                ),
              ),
              Row(
                children: List.generate(_tabs.length, (i) {
                  final isSelected = _selectedIndex == i;
                  return Expanded(
                    child: GestureDetector(
                      behavior: HitTestBehavior.opaque,
                      onTap: () => onTabSelected(_tabEnums[i]),
                      child: Center(
                        child: Text(
                          _tabs[i],
                          style: TextStyle(
                            fontSize: 13,
                            fontWeight: isSelected ? FontWeight.bold : FontWeight.w600,
                            color: isSelected ? AppTheme.primaryColor : AppTheme.textSecondary,
                          ),
                        ),
                      ),
                    ),
                  );
                }),
              ),
            ],
          );
        },
      ),
    );
  }
}
