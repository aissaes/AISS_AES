import 'dart:io';
import 'package:flutter/material.dart';
import '../../../core/theme/app_theme.dart';
import '../../../shared/dialogs/confirmation_dialog.dart';

class ScanThumbnailStrip extends StatelessWidget {
  final List<String> imagePaths;
  final int activeIndex;
  final ValueChanged<int> onSelectPage;
  final Function(int index) onDeletePage;

  const ScanThumbnailStrip({
    super.key,
    required this.imagePaths,
    required this.activeIndex,
    required this.onSelectPage,
    required this.onDeletePage,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 100,
      margin: const EdgeInsets.symmetric(vertical: 8),
      child: ListView.builder(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 20),
        itemCount: imagePaths.length,
        itemBuilder: (context, index) {
          final isSelected = index == activeIndex;
          final path = imagePaths[index];

          return GestureDetector(
            onTap: () => onSelectPage(index),
            child: Stack(
              clipBehavior: Clip.none,
              children: [
                Container(
                  width: 70,
                  height: 90,
                  margin: const EdgeInsets.only(right: 12, top: 6),
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(
                      color: isSelected ? AppTheme.primaryColor : Colors.grey.shade300,
                      width: isSelected ? 3 : 1,
                    ),
                    boxShadow: isSelected
                        ? [BoxShadow(color: AppTheme.primaryColor.withValues(alpha: 0.3), blurRadius: 6)]
                        : null,
                  ),
                  clipBehavior: Clip.antiAlias,
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(9),
                    child: Image.file(File(path), fit: BoxFit.cover),
                  ),
                ),

                // Delete button on top right of thumbnail
                Positioned(
                  right: 6,
                  top: 0,
                  child: InkWell(
                    onTap: () async {
                      final confirm = await ConfirmationDialog.show(
                        context,
                        title: 'Delete Page?',
                        message: 'Are you sure you want to delete Page ${index + 1}?',
                        type: ConfirmationDialogType.danger,
                        confirmText: 'Delete',
                        icon: Icons.delete_forever_rounded,
                      );
                      if (confirm && context.mounted) {
                        onDeletePage(index);
                      }
                    },
                    borderRadius: BorderRadius.circular(12),
                    child: Container(
                      padding: const EdgeInsets.all(4),
                      decoration: const BoxDecoration(
                        color: Colors.red,
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(Icons.close_rounded, size: 12, color: Colors.white),
                    ),
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }
}
