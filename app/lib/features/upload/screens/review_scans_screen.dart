import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/app_image.dart';
import '../providers/scanner_provider.dart';
import '../../exams/providers/selected_question_provider.dart';
import '../../../shared/widgets/confirmation_dialog.dart';

class ReviewScansScreen extends ConsumerStatefulWidget {
  const ReviewScansScreen({super.key});

  @override
  ConsumerState<ReviewScansScreen> createState() => _ReviewScansScreenState();
}

class _ReviewScansScreenState extends ConsumerState<ReviewScansScreen> {
  late PageController _pageController;
  int _activeIndex = 0;

  @override
  void initState() {
    super.initState();
    _pageController = PageController();
  }

  @override
  void dispose() {
    _pageController.dispose();
    super.dispose();
  }



  @override
  Widget build(BuildContext context) {
    final scannerState = ref.watch(scannerProvider);
    final scannerNotifier = ref.read(scannerProvider.notifier);
    final selectedQuestion = ref.watch(selectedQuestionProvider);

    final questionId = selectedQuestion?.questionId ?? 'N/A';
    final questionText = selectedQuestion?.text ?? '';
    final imagePaths = scannerState.imagePaths;

    // Safety check to ensure activeIndex is not out of bounds
    if (_activeIndex >= imagePaths.length && imagePaths.isNotEmpty) {
      _activeIndex = imagePaths.length - 1;
    }

    return Scaffold(
      backgroundColor: AppTheme.backgroundColor,
      appBar: AppBar(
        title: Text('Review Question $questionId'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded),
          onPressed: () => context.pop(),
        ),
        actions: const [],
      ),
      body: SafeArea(
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 800),
            child: Column(
              children: [
                // Target Question Prompt Banner
                Container(
                  margin: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: AppTheme.primaryColor.withValues(alpha: 0.05),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: AppTheme.primaryColor.withValues(alpha: 0.1)),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'TARGET: QUESTION $questionId',
                        style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w900, color: AppTheme.primaryColor, letterSpacing: 0.5),
                      ),
                      const SizedBox(height: 6),
                      Text(
                        questionText,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(fontSize: 13, color: AppTheme.textPrimary, height: 1.4),
                      ),
                    ],
                  ),
                ),
                
                // Document Preview Swipeable Box
                Expanded(
                  child: imagePaths.isEmpty
                      ? _buildEmptyState(context)
                      : Container(
                          margin: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
                          decoration: BoxDecoration(
                            color: Colors.black,
                            borderRadius: BorderRadius.circular(16),
                            border: Border.all(color: AppTheme.outlineColor),
                            boxShadow: AppTheme.premiumShadow,
                          ),
                          clipBehavior: Clip.antiAlias,
                          child: Stack(
                            alignment: Alignment.center,
                            children: [
                              // Swiping Preview Pages
                              PageView.builder(
                                controller: _pageController,
                                itemCount: imagePaths.length,
                                onPageChanged: (index) {
                                  setState(() {
                                    _activeIndex = index;
                                  });
                                },
                                itemBuilder: (context, index) {
                                  return Center(
                                    child: AppImage(
                                      path: imagePaths[index],
                                      fit: BoxFit.contain,
                                    ),
                                  );
                                },
                              ),

                              // Top Counter Badge
                              Positioned(
                                top: 16,
                                child: Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                                  decoration: BoxDecoration(
                                    color: Colors.black.withValues(alpha: 0.65),
                                    borderRadius: BorderRadius.circular(20),
                                    border: Border.all(color: Colors.white12),
                                  ),
                                  child: Text(
                                    'Page ${_activeIndex + 1} of ${imagePaths.length}',
                                    style: const TextStyle(
                                      color: Colors.white,
                                      fontWeight: FontWeight.w800,
                                      fontSize: 13,
                                    ),
                                  ),
                                ),
                              ),

                              // Glassmorphic Floating Toolbar for Active Page
                              Positioned(
                                bottom: 16,
                                child: Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
                                  decoration: BoxDecoration(
                                    color: Colors.black.withValues(alpha: 0.7),
                                    borderRadius: BorderRadius.circular(30),
                                    border: Border.all(color: Colors.white24),
                                  ),
                                  child: Row(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      // Retake page
                                      _ActionButton(
                                        icon: Icons.refresh_rounded,
                                        label: 'Retake',
                                        color: Colors.amber,
                                        onTap: () async {
                                          final confirm = await ConfirmationDialog.show(
                                            context,
                                            title: 'Retake Scan Page?',
                                            message: 'Are you sure you want to retake this scan page? This will permanently delete the current capture and open the camera.',
                                            type: ConfirmationDialogType.warning,
                                            confirmText: 'Retake',
                                            icon: Icons.refresh_rounded,
                                          );
                                          if (confirm && context.mounted) {
                                            scannerNotifier.removeImage(_activeIndex);
                                            context.pop();
                                          }
                                        },
                                      ),
                                      const _VerticalDivider(),
                                      // Delete page
                                      _ActionButton(
                                        icon: Icons.delete_outline_rounded,
                                        label: 'Delete',
                                        color: AppTheme.errorColor,
                                        onTap: () async {
                                          final confirm = await ConfirmationDialog.show(
                                            context,
                                            title: 'Delete Scan Page?',
                                            message: 'Are you sure you want to delete this scanned page from the question script?',
                                            type: ConfirmationDialogType.danger,
                                            confirmText: 'Delete',
                                            icon: Icons.delete_forever_rounded,
                                          );
                                          if (confirm && context.mounted) {
                                            scannerNotifier.removeImage(_activeIndex);
                                            if (imagePaths.length <= 1) {
                                              context.pop();
                                            } else {
                                              setState(() {
                                                if (_activeIndex >= imagePaths.length - 1) {
                                                  _activeIndex = imagePaths.length - 2;
                                                }
                                              });
                                            }
                                          }
                                        },
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                ),
                
                // Filmstrip page list
                if (imagePaths.isNotEmpty)
                  _buildFilmstrip(imagePaths, scannerNotifier),

                // Bottom Action Button
                _buildBottomAction(context, questionId, imagePaths.length),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildEmptyState(BuildContext context) {
    return Column(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Icon(Icons.document_scanner_outlined, size: 64, color: AppTheme.textSecondary.withValues(alpha: 0.5)),
        const SizedBox(height: 16),
        const Text(
          'No answer pages scanned yet',
          style: TextStyle(fontSize: 18, fontWeight: FontWeight.w600, color: AppTheme.textSecondary),
        ),
        const SizedBox(height: 24),
        ElevatedButton(
          onPressed: () => context.pop(),
          style: ElevatedButton.styleFrom(minimumSize: const Size(200, 54)),
          child: const Text('Open Scanner'),
        ),
      ],
    );
  }

  Widget _buildFilmstrip(List<String> imagePaths, ScannerNotifier scannerNotifier) {
    return Container(
      height: 96,
      margin: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        children: [
          // Reorderable page thumbnails
          Expanded(
            child: ReorderableListView.builder(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 20),
              buildDefaultDragHandles: false,
              itemCount: imagePaths.length,
              onReorder: (oldIndex, newIndex) {
                scannerNotifier.reorderImages(oldIndex, newIndex);
                setState(() {
                  // Adjust active index to follow the moved item
                  if (_activeIndex == oldIndex) {
                    _activeIndex = newIndex > oldIndex ? newIndex - 1 : newIndex;
                  } else if (oldIndex < _activeIndex && newIndex >= _activeIndex) {
                    _activeIndex--;
                  } else if (oldIndex > _activeIndex && newIndex <= _activeIndex) {
                    _activeIndex++;
                  }
                });
                _pageController.jumpToPage(_activeIndex);
              },
              proxyDecorator: (child, index, animation) {
                return Material(
                  color: Colors.transparent,
                  elevation: 4,
                  borderRadius: BorderRadius.circular(12),
                  child: child,
                );
              },
              itemBuilder: (context, index) {
                final path = imagePaths[index];
                final isSelected = _activeIndex == index;

                return ReorderableDragStartListener(
                  key: ValueKey('page_$index'),
                  index: index,
                  child: GestureDetector(
                    onTap: () {
                      setState(() {
                        _activeIndex = index;
                      });
                      _pageController.animateToPage(
                        index,
                        duration: const Duration(milliseconds: 300),
                        curve: Curves.easeInOut,
                      );
                    },
                    child: Stack(
                      children: [
                        AnimatedContainer(
                          duration: const Duration(milliseconds: 200),
                          width: 70,
                          height: 90,
                          margin: const EdgeInsets.only(right: 12, top: 4, bottom: 4),
                          decoration: BoxDecoration(
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(
                              color: isSelected ? AppTheme.primaryColor : AppTheme.outlineColor,
                              width: isSelected ? 3 : 1,
                            ),
                            boxShadow: isSelected
                                ? [BoxShadow(color: AppTheme.primaryColor.withValues(alpha: 0.3), blurRadius: 6)]
                                : null,
                          ),
                          clipBehavior: Clip.antiAlias,
                          child: ClipRRect(
                            borderRadius: BorderRadius.circular(9),
                            child: AppImage(path: path, fit: BoxFit.cover),
                          ),
                        ),

                        // Small Delete button on top right of thumbnail
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
                                scannerNotifier.removeImage(index);
                                if (imagePaths.length <= 1) {
                                  context.pop();
                                } else {
                                  setState(() {
                                    if (_activeIndex >= imagePaths.length - 1) {
                                      _activeIndex = imagePaths.length - 2;
                                    }
                                  });
                                }
                              }
                            },
                            child: Container(
                              padding: const EdgeInsets.all(4),
                              decoration: const BoxDecoration(
                                color: AppTheme.errorColor,
                                shape: BoxShape.circle,
                              ),
                              child: const Icon(Icons.close, color: Colors.white, size: 8),
                            ),
                          ),
                        ),

                        // Page index identifier
                        Positioned(
                          left: 4,
                          bottom: 8,
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 2),
                            decoration: BoxDecoration(
                              color: Colors.black.withValues(alpha: 0.75),
                              borderRadius: BorderRadius.circular(4),
                            ),
                            child: Text(
                              'P${index + 1}',
                              style: const TextStyle(color: Colors.white, fontSize: 8, fontWeight: FontWeight.bold),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                );
              },
            ),
          ),

          // "+ Add Page" button (non-draggable, pinned at end)
          Padding(
            padding: const EdgeInsets.only(right: 20),
            child: InkWell(
              onTap: () => context.pop(), // Pop to scanner to capture another page
              borderRadius: BorderRadius.circular(12),
              child: Container(
                width: 70,
                height: 90,
                margin: const EdgeInsets.only(top: 4, bottom: 4),
                decoration: BoxDecoration(
                  color: AppTheme.primaryColor.withValues(alpha: 0.05),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(
                    color: AppTheme.primaryColor.withValues(alpha: 0.3),
                    style: BorderStyle.solid,
                    width: 1.5,
                  ),
                ),
                child: const Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(Icons.add_photo_alternate_rounded, color: AppTheme.primaryColor, size: 24),
                    SizedBox(height: 4),
                    Text(
                      'Add Page',
                      style: TextStyle(fontSize: 9, color: AppTheme.primaryColor, fontWeight: FontWeight.bold),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildBottomAction(BuildContext context, String qId, int pageCount) {
    final hasScans = pageCount > 0;
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: const BoxDecoration(
        color: AppTheme.surfaceColor,
        boxShadow: AppTheme.premiumShadow,
        borderRadius: BorderRadius.vertical(top: Radius.circular(AppTheme.borderRadiusLarge)),
      ),
      child: Row(
        children: [
          Expanded(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  '$pageCount ${pageCount == 1 ? "Page" : "Pages"} Scanned',
                  style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16),
                ),
                const Text(
                  'Compiled to a high-quality PDF.',
                  style: TextStyle(color: AppTheme.textSecondary, fontSize: 12),
                ),
              ],
            ),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: ElevatedButton(
              onPressed: hasScans ? () => context.push('/upload/progress') : null,
              child: Text('Upload $pageCount ${pageCount == 1 ? "Page" : "Pages"} for Q$qId'),
            ),
          ),
        ],
      ),
    );
  }
}

class _ActionButton extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color color;
  final VoidCallback onTap;

  const _ActionButton({
    required this.icon,
    required this.label,
    required this.color,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(20),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, color: color, size: 20),
            const SizedBox(height: 4),
            Text(
              label,
              style: TextStyle(color: color.withValues(alpha: 0.85), fontSize: 10, fontWeight: FontWeight.bold),
            ),
          ],
        ),
      ),
    );
  }
}

class _VerticalDivider extends StatelessWidget {
  const _VerticalDivider();

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 1,
      height: 30,
      color: Colors.white24,
      margin: const EdgeInsets.symmetric(horizontal: 4),
    );
  }
}
