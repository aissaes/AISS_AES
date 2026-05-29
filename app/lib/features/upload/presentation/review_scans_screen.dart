import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/app_image.dart';
import '../providers/scanner_provider.dart';
import '../../exams/providers/selected_question_provider.dart';

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

    final questionId = selectedQuestion?['questionId'] ?? 'N/A';
    final questionText = selectedQuestion?['text'] ?? '';
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

                              // Dot indicators for swiping
                              if (imagePaths.length > 1)
                                Positioned(
                                  bottom: 90,
                                  child: Row(
                                    mainAxisAlignment: MainAxisAlignment.center,
                                    children: List.generate(imagePaths.length, (index) {
                                      return AnimatedContainer(
                                        duration: const Duration(milliseconds: 250),
                                        margin: const EdgeInsets.symmetric(horizontal: 4),
                                        width: _activeIndex == index ? 12 : 6,
                                        height: 6,
                                        decoration: BoxDecoration(
                                          color: _activeIndex == index ? AppTheme.primaryColor : Colors.white.withValues(alpha: 0.5),
                                          borderRadius: BorderRadius.circular(3),
                                        ),
                                      );
                                    }),
                                  ),
                                ),

                              // Glassmorphic Floating Toolbar
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
                                      // Add another page
                                      _ActionButton(
                                        icon: Icons.add_photo_alternate_rounded,
                                        label: 'Add Page',
                                        color: Colors.white,
                                        onTap: () {
                                          // Pop back to scanner so student can take another photo
                                          context.pop();
                                        },
                                      ),
                                      const _VerticalDivider(),
                                      // Retake page
                                      _ActionButton(
                                        icon: Icons.refresh_rounded,
                                        label: 'Retake Page',
                                        color: Colors.amber,
                                        onTap: () {
                                          scannerNotifier.removeImage(_activeIndex);
                                          context.pop();
                                        },
                                      ),
                                      const _VerticalDivider(),
                                      // Delete page
                                      _ActionButton(
                                        icon: Icons.delete_outline_rounded,
                                        label: 'Delete Page',
                                        color: AppTheme.errorColor,
                                        onTap: () {
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
            Icon(icon, color: color, size: 22),
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
