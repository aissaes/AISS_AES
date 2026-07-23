import 'package:flutter/material.dart';
import '../../../../core/theme/app_theme.dart';

// =============================================================================
// EXPANDABLE FEEDBACK BLOCK
// Collapsed by default. Expands on tap to show the AI feedback text.
// =============================================================================
class ExpandableFeedbackBlock extends StatefulWidget {
  final String title;
  final String feedback;

  const ExpandableFeedbackBlock({
    super.key,
    required this.title,
    required this.feedback,
  });

  @override
  State<ExpandableFeedbackBlock> createState() => _ExpandableFeedbackBlockState();
}

class _ExpandableFeedbackBlockState extends State<ExpandableFeedbackBlock> {
  bool _isExpanded = false;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      decoration: BoxDecoration(
        color: AppTheme.backgroundColor,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: AppTheme.outlineColor.withValues(alpha: 0.08)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          InkWell(
            onTap: () => setState(() => _isExpanded = !_isExpanded),
            borderRadius: BorderRadius.circular(8),
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    widget.title.toUpperCase(),
                    style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: AppTheme.textSecondary, letterSpacing: 0.5),
                  ),
                  Row(
                    children: [
                      Text(
                        _isExpanded ? 'Collapse' : 'Expand',
                        style: const TextStyle(fontSize: 11, color: AppTheme.primaryColor, fontWeight: FontWeight.bold),
                      ),
                      const SizedBox(width: 4),
                      Icon(
                        _isExpanded ? Icons.keyboard_arrow_up_rounded : Icons.keyboard_arrow_down_rounded,
                        color: AppTheme.primaryColor,
                        size: 16,
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
          if (_isExpanded)
            Padding(
              padding: const EdgeInsets.only(left: 14, right: 14, bottom: 14),
              child: Text(widget.feedback, style: const TextStyle(fontSize: 13, color: AppTheme.textPrimary, height: 1.5)),
            ),
        ],
      ),
    );
  }
}
