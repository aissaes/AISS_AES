import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/app_theme.dart';
import '../providers/scanner_provider.dart';
import '../../exams/providers/selected_question_provider.dart';
import '../widgets/scan_question_banner.dart';
import '../widgets/scan_thumbnail_strip.dart';

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
                ScanQuestionBanner(
                  questionId: questionId,
                  questionText: questionText,
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
                            boxShadow: AppTheme.softShadow,
                          ),
                          child: ClipRRect(
                            borderRadius: BorderRadius.circular(16),
                            child: Stack(
                              children: [
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
                                      child: Image.file(
                                        File(imagePaths[index]),
                                        fit: BoxFit.contain,
                                      ),
                                    );
                                  },
                                ),
                                Positioned(
                                  top: 16,
                                  right: 16,
                                  child: Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                                    decoration: BoxDecoration(
                                      color: Colors.black54,
                                      borderRadius: BorderRadius.circular(20),
                                    ),
                                    child: Text(
                                      'Page ${_activeIndex + 1} of ${imagePaths.length}',
                                      style: const TextStyle(
                                        color: Colors.white,
                                        fontSize: 12,
                                        fontWeight: FontWeight.w600,
                                      ),
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                ),

                // Thumbnail Strip
                if (imagePaths.isNotEmpty)
                  ScanThumbnailStrip(
                    imagePaths: imagePaths,
                    activeIndex: _activeIndex,
                    onSelectPage: (index) {
                      setState(() => _activeIndex = index);
                      _pageController.animateToPage(
                        index,
                        duration: const Duration(milliseconds: 300),
                        curve: Curves.easeInOut,
                      );
                    },
                    onDeletePage: (index) {
                      scannerNotifier.removeImage(index);
                    },
                  ),

                // Bottom Action Button Area
                Container(
                  padding: const EdgeInsets.all(20),
                  child: Row(
                    children: [
                      Expanded(
                        child: OutlinedButton.icon(
                          onPressed: () => context.pop(),
                          icon: const Icon(Icons.add_a_photo_outlined),
                          label: const Text('Scan Another Page'),
                          style: OutlinedButton.styleFrom(
                            padding: const EdgeInsets.symmetric(vertical: 14),
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: ElevatedButton.icon(
                          onPressed: imagePaths.isEmpty
                              ? null
                              : () => context.push('/upload/progress'),
                          icon: const Icon(Icons.upload_file_rounded),
                          label: const Text('Submit Answer'),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppTheme.primaryColor,
                            foregroundColor: Colors.white,
                            padding: const EdgeInsets.symmetric(vertical: 14),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildEmptyState(BuildContext context) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(Icons.find_in_page_outlined, size: 64, color: Colors.grey),
          const SizedBox(height: 16),
          const Text('No Pages Scanned Yet', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
          const SizedBox(height: 8),
          const Text('Tap below to capture your answer pages', style: TextStyle(color: Colors.grey)),
          const SizedBox(height: 24),
          ElevatedButton.icon(
            onPressed: () => context.pop(),
            icon: const Icon(Icons.camera_alt_rounded),
            label: const Text('Open Camera'),
          ),
        ],
      ),
    );
  }
}
