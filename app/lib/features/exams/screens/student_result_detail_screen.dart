import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/theme/app_theme.dart';
import '../providers/student_results_provider.dart';
import '../../../core/widgets/app_loading_indicator.dart';

class StudentResultDetailScreen extends ConsumerWidget {
  final String examId;

  const StudentResultDetailScreen({
    super.key,
    required this.examId,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final detailAsync = ref.watch(studentDetailedResultProvider(examId));

    return Scaffold(
      backgroundColor: AppTheme.backgroundColor,
      appBar: AppBar(
        backgroundColor: AppTheme.backgroundColor,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, color: AppTheme.textPrimary),
          onPressed: () => context.pop(),
        ),
        title: const Text(
          'Evaluation Details',
          style: TextStyle(
            color: AppTheme.textPrimary,
            fontWeight: FontWeight.w800,
            fontSize: 20,
          ),
        ),
        centerTitle: true,
      ),
      body: SafeArea(
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 600),
            child: detailAsync.when(
              data: (result) {
                final subjectName = result.subjectName;
                final subjectCode = result.subjectCode;
                final examType = result.examType;
                final maxMarks = result.maxMarks;
                final totalMarksObtained = result.totalMarksObtained;
                final percent = result.percent;
                final evaluations = result.evaluations;

                return SingleChildScrollView(
                  padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Overview Score Card
                      _buildOverviewCard(
                        context,
                        subjectName: subjectName,
                        subjectCode: subjectCode,
                        examType: examType,
                        totalMarks: totalMarksObtained,
                        maxMarks: maxMarks,
                        percent: percent,
                      ),
                      const SizedBox(height: 28),

                      const Text(
                        'QUESTION BREAKDOWN',
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w900,
                          color: AppTheme.textSecondary,
                          letterSpacing: 1.2,
                        ),
                      ),
                      const SizedBox(height: 16),

                      if (evaluations.isEmpty)
                        const Center(
                          child: Padding(
                            padding: EdgeInsets.symmetric(vertical: 32),
                            child: Text(
                              'No question evaluation details found.',
                              style: TextStyle(color: AppTheme.textSecondary),
                            ),
                          ),
                        )
                      else
                        ListView.separated(
                          shrinkWrap: true,
                          physics: const NeverScrollableScrollPhysics(),
                          itemCount: evaluations.length,
                          separatorBuilder: (context, index) => const SizedBox(height: 20),
                          itemBuilder: (context, index) {
                            final evaluation = evaluations[index];
                            final questionId = evaluation.questionId;
                            final marksAwarded = evaluation.marksAwarded;
                            final isManuallyGraded = evaluation.isManuallyGraded;
                            final feedback = evaluation.feedback;
                            final reasoning = evaluation.reasoning;
                            final fileUrl = evaluation.fileUrl;
                            final fileType = evaluation.fileType;

                            return _buildQuestionCard(
                              context,
                              questionId: questionId,
                              marks: marksAwarded,
                              isManuallyGraded: isManuallyGraded,
                              feedback: feedback,
                              reasoning: reasoning,
                              fileUrl: fileUrl,
                              fileType: fileType,
                              strengths: evaluation.strengths,
                              weaknesses: evaluation.weaknesses,
                              overrideReason: evaluation.overrideReason,
                            );
                          },
                        ),
                      const SizedBox(height: 40),
                    ],
                  ),
                );
              },
              loading: () => const Center(child: AppLoadingIndicator(size: 50, logoSize: 24)),
              error: (err, stack) => Center(
                child: Padding(
                  padding: const EdgeInsets.all(24.0),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(Icons.error_outline_rounded, size: 48, color: AppTheme.errorColor),
                      const SizedBox(height: 16),
                      Text(
                        'Failed to load evaluation details\n$err',
                        textAlign: TextAlign.center,
                        style: const TextStyle(color: AppTheme.textSecondary, height: 1.5),
                      ),
                      const SizedBox(height: 20),
                      ElevatedButton(
                        onPressed: () => ref.invalidate(studentDetailedResultProvider(examId)),
                        style: ElevatedButton.styleFrom(
                          minimumSize: const Size(180, 44),
                        ),
                        child: const Text('Retry'),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildOverviewCard(
    BuildContext context, {
    required String subjectName,
    required String subjectCode,
    required String examType,
    required num totalMarks,
    required num maxMarks,
    required double percent,
  }) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [AppTheme.primaryColor, AppTheme.primaryContainer],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(AppTheme.borderRadius2XL),
        boxShadow: AppTheme.premiumShadow,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      subjectCode,
                      style: TextStyle(
                        color: Colors.white.withValues(alpha: 0.8),
                        fontWeight: FontWeight.bold,
                        fontSize: 12,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      subjectName,
                      style: const TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.w900,
                        fontSize: 22,
                        letterSpacing: -0.5,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 24),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    examType,
                    style: TextStyle(
                      color: Colors.white.withValues(alpha: 0.8),
                      fontSize: 13,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.baseline,
                    textBaseline: TextBaseline.alphabetic,
                    children: [
                      Text(
                        totalMarks.toStringAsFixed(0),
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 36,
                          fontWeight: FontWeight.w900,
                        ),
                      ),
                      Text(
                        ' / ${maxMarks.toStringAsFixed(0)}',
                        style: TextStyle(
                          color: Colors.white.withValues(alpha: 0.7),
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
              // Circular progress bar
              Stack(
                alignment: Alignment.center,
                children: [
                  SizedBox(
                    width: 72,
                    height: 72,
                    child: CircularProgressIndicator(
                      value: percent / 100,
                      strokeWidth: 8,
                      backgroundColor: Colors.white.withValues(alpha: 0.15),
                      valueColor: const AlwaysStoppedAnimation<Color>(Colors.white),
                    ),
                  ),
                  Text(
                    '${percent.toStringAsFixed(0)}%',
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 16,
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                ],
              ),
            ],
          ),
          const SizedBox(height: 16),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
            decoration: BoxDecoration(
              color: Colors.white.withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(8),
            ),
            child: const Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(Icons.auto_awesome, color: Colors.amber, size: 14),
                SizedBox(width: 6),
                Text(
                  'Automated AI Grading + Instructor Audited',
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 11,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildQuestionCard(
    BuildContext context, {
    required String questionId,
    required double marks,
    required bool isManuallyGraded,
    required String feedback,
    required String reasoning,
    required String? fileUrl,
    required String fileType,
    required String strengths,
    required String weaknesses,
    String? overrideReason,
  }) {
    final localFileUrl = fileUrl;
    final hasFile = localFileUrl != null && localFileUrl.isNotEmpty;
    final isPdf = hasFile && fileType == 'pdf';
    final thumbnailUrl = isPdf
        ? (localFileUrl.contains('?') ? '$localFileUrl&tr=pg-1' : '$localFileUrl?tr=pg-1')
        : localFileUrl ?? '';
    final fileExtension = isPdf ? '.pdf' : '.png';
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: AppTheme.surfaceColor,
        borderRadius: BorderRadius.circular(AppTheme.borderRadiusLarge),
        boxShadow: AppTheme.softShadow,
        border: Border.all(color: AppTheme.outlineColor.withValues(alpha: 0.15)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Question Card Header
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Question $questionId',
                style: const TextStyle(
                  fontWeight: FontWeight.w900,
                  fontSize: 16,
                  color: AppTheme.textPrimary,
                ),
              ),
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: isManuallyGraded 
                          ? Colors.purple.withValues(alpha: 0.08) 
                          : Colors.blue.withValues(alpha: 0.08),
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Text(
                      isManuallyGraded ? 'TEACHER AUDITED' : 'AI EVALUATED',
                      style: TextStyle(
                        color: isManuallyGraded ? Colors.purple : Colors.blue[800],
                        fontSize: 9,
                        fontWeight: FontWeight.w900,
                        letterSpacing: 0.5,
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                    decoration: BoxDecoration(
                      color: AppTheme.primaryColor.withValues(alpha: 0.05),
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: AppTheme.primaryColor.withValues(alpha: 0.1)),
                    ),
                    child: Text(
                      'Score: ${marks.toStringAsFixed(0)}',
                      style: const TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.bold,
                        color: AppTheme.primaryColor,
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
          const SizedBox(height: 20),

          // Strengths Bullet
          if (strengths.isNotEmpty) ...[
            const Text(
              'STRENGTHS',
              style: TextStyle(
                fontSize: 10,
                fontWeight: FontWeight.bold,
                color: Colors.green,
                letterSpacing: 0.5,
              ),
            ),
            const SizedBox(height: 6),
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Icon(Icons.check_circle_outline_rounded, color: Colors.green, size: 16),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    strengths,
                    style: const TextStyle(fontSize: 13, color: AppTheme.textPrimary, height: 1.4),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
          ],

          // Weaknesses Bullet
          if (weaknesses.isNotEmpty) ...[
            const Text(
              'WEAKNESSES',
              style: TextStyle(
                fontSize: 10,
                fontWeight: FontWeight.bold,
                color: AppTheme.errorColor,
                letterSpacing: 0.5,
              ),
            ),
            const SizedBox(height: 6),
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Icon(Icons.cancel_outlined, color: AppTheme.errorColor, size: 16),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    weaknesses,
                    style: const TextStyle(fontSize: 13, color: AppTheme.textPrimary, height: 1.4),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
          ],

          // Expandable AI Feedback Block
          _ExpandableFeedbackBlock(
            title: 'AI Feedback',
            feedback: feedback,
          ),

          if (reasoning.isNotEmpty) ...[
            const SizedBox(height: 16),
            const Text(
              'GRADING REASONING',
              style: TextStyle(
                fontSize: 10,
                fontWeight: FontWeight.bold,
                color: AppTheme.textSecondary,
                letterSpacing: 0.5,
              ),
            ),
            const SizedBox(height: 6),
            Text(
              reasoning,
              style: const TextStyle(
                fontSize: 12,
                color: AppTheme.textSecondary,
                height: 1.4,
              ),
            ),
          ],

          if (isManuallyGraded && overrideReason != null && overrideReason.isNotEmpty) ...[
            const SizedBox(height: 16),
            const Text(
              'INSTRUCTOR OVERRIDE NOTE',
              style: TextStyle(
                fontSize: 10,
                fontWeight: FontWeight.bold,
                color: Colors.purple,
                letterSpacing: 0.5,
              ),
            ),
            const SizedBox(height: 6),
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Icon(Icons.rate_review_outlined, color: Colors.purple, size: 16),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    overrideReason,
                    style: const TextStyle(fontSize: 13, color: AppTheme.textPrimary, height: 1.4),
                  ),
                ),
              ],
            ),
          ],

          // Answer Script Page Image Attachment Redesigned
          if (localFileUrl != null && localFileUrl.isNotEmpty) ...[
            const SizedBox(height: 20),
            const Text(
              'SUBMITTED SCRIPT',
              style: TextStyle(
                fontSize: 10,
                fontWeight: FontWeight.bold,
                color: AppTheme.textSecondary,
                letterSpacing: 0.5,
              ),
            ),
            const SizedBox(height: 8),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: AppTheme.backgroundColor,
                borderRadius: BorderRadius.circular(AppTheme.borderRadiusMedium),
                border: Border.all(color: AppTheme.outlineColor.withValues(alpha: 0.08)),
              ),
              child: Row(
                children: [
                  GestureDetector(
                    onTap: () => _showFullScreenImage(context, localFileUrl, fileType, questionId),
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(6),
                      child: Container(
                        width: 50,
                        height: 50,
                        color: Colors.black.withValues(alpha: 0.03),
                        child: !isPdf || localFileUrl.toLowerCase().contains('.pdf')
                            ? Stack(
                                alignment: Alignment.center,
                                children: [
                                  Image.network(
                                    thumbnailUrl,
                                    fit: BoxFit.cover,
                                    loadingBuilder: (context, child, loadingProgress) {
                                      if (loadingProgress == null) return child;
                                      return const Center(
                                        child: SizedBox(
                                          width: 14,
                                          height: 14,
                                          child: CircularProgressIndicator(strokeWidth: 2),
                                        ),
                                      );
                                    },
                                    errorBuilder: (context, error, stackTrace) => const Center(
                                      child: Icon(Icons.image_not_supported_rounded, color: AppTheme.outlineColor, size: 20),
                                    ),
                                  ),
                                  Container(
                                    color: Colors.black.withValues(alpha: 0.15),
                                  ),
                                  const Icon(Icons.zoom_in_rounded, color: Colors.white, size: 18),
                                ],
                              )
                            : Stack(
                                alignment: Alignment.center,
                                children: [
                                  Container(
                                    color: Colors.red.withValues(alpha: 0.08),
                                  ),
                                  const Icon(Icons.picture_as_pdf_rounded, color: Colors.red, size: 24),
                                ],
                              ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Page $questionId$fileExtension',
                          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: AppTheme.textPrimary),
                        ),
                        const SizedBox(height: 2),
                        const Text(
                          'Tap thumbnail to view full resolution',
                          style: TextStyle(color: AppTheme.textSecondary, fontSize: 11),
                        ),
                      ],
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.open_in_new_rounded, color: AppTheme.primaryColor, size: 20),
                    onPressed: () => _showFullScreenImage(context, localFileUrl, fileType, questionId),
                  ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }

  void _showFullScreenImage(BuildContext context, String fileUrl, String fileType, String questionId) {
    showDialog(
      context: context,
      builder: (dialogContext) => Dialog(
        backgroundColor: Colors.transparent,
        insetPadding: const EdgeInsets.all(12),
        child: _FullScreenPdfOrImageViewer(
          fileUrl: fileUrl,
          fileType: fileType,
          questionId: questionId,
          onClose: () => Navigator.pop(dialogContext),
        ),
      ),
    );
  }
}

class _FullScreenPdfOrImageViewer extends StatefulWidget {
  final String fileUrl;
  final String fileType;
  final String questionId;
  final VoidCallback onClose;

  const _FullScreenPdfOrImageViewer({
    required this.fileUrl,
    required this.fileType,
    required this.questionId,
    required this.onClose,
  });

  @override
  State<_FullScreenPdfOrImageViewer> createState() => _FullScreenPdfOrImageViewerState();
}

class _FullScreenPdfOrImageViewerState extends State<_FullScreenPdfOrImageViewer> {
  late final bool _isPdf;
  late final PageController _pageController;
  int _currentPage = 1;
  int? _maxPage;
  bool _hasError = false;

  @override
  void initState() {
    super.initState();
    _isPdf = widget.fileType == 'pdf';
    _pageController = PageController();
  }

  @override
  void dispose() {
    _pageController.dispose();
    super.dispose();
  }

  String _getPdfPageUrl(int pageNum) {
    final separator = widget.fileUrl.contains('?') ? '&' : '?';
    return '${widget.fileUrl}${separator}tr=pg-$pageNum';
  }

  @override
  Widget build(BuildContext context) {
    return Stack(
      alignment: Alignment.topRight,
      children: [
        Center(
          child: ClipRRect(
            borderRadius: BorderRadius.circular(12),
            child: Container(
              color: Colors.black.withValues(alpha: 0.9),
              width: double.infinity,
              height: double.infinity,
              child: _isPdf ? _buildPdfPageView() : _buildStandardImageView(),
            ),
          ),
        ),
        Padding(
          padding: const EdgeInsets.all(16.0),
          child: CircleAvatar(
            backgroundColor: Colors.black54,
            child: IconButton(
              icon: const Icon(Icons.close_rounded, color: Colors.white),
              onPressed: widget.onClose,
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildStandardImageView() {
    return InteractiveViewer(
      minScale: 0.5,
      maxScale: 4.0,
      child: Image.network(
        widget.fileUrl,
        fit: BoxFit.contain,
        loadingBuilder: (context, child, loadingProgress) {
          if (loadingProgress == null) return child;
          return const Center(child: CircularProgressIndicator(color: Colors.white));
        },
        errorBuilder: (context, error, stackTrace) => Container(
          color: Colors.white,
          child: const Center(
            child: Icon(Icons.broken_image_rounded, color: AppTheme.outlineColor, size: 48),
          ),
        ),
      ),
    );
  }

  Widget _buildPdfPageView() {
    return Column(
      children: [
        Container(
          padding: const EdgeInsets.symmetric(vertical: 12),
          color: Colors.black26,
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              IconButton(
                icon: const Icon(Icons.arrow_back_ios_new_rounded, color: Colors.white, size: 18),
                onPressed: _currentPage > 1
                    ? () {
                        _pageController.previousPage(
                          duration: const Duration(milliseconds: 300),
                          curve: Curves.easeInOut,
                        );
                      }
                    : null,
              ),
              const SizedBox(width: 16),
              Text(
                'Page $_currentPage${_maxPage != null ? ' of $_maxPage' : ''}',
                style: const TextStyle(
                  color: Colors.white,
                  fontWeight: FontWeight.bold,
                  fontSize: 15,
                ),
              ),
              const SizedBox(width: 16),
              IconButton(
                icon: const Icon(Icons.arrow_forward_ios_rounded, color: Colors.white, size: 18),
                onPressed: (_maxPage == null || _currentPage < _maxPage!)
                    ? () {
                        _pageController.nextPage(
                          duration: const Duration(milliseconds: 300),
                          curve: Curves.easeInOut,
                        );
                      }
                    : null,
              ),
            ],
          ),
        ),
        Expanded(
          child: PageView.builder(
            controller: _pageController,
            onPageChanged: (index) {
              setState(() {
                _currentPage = index + 1;
              });
            },
            itemBuilder: (context, index) {
              final pageNum = index + 1;
              if (_maxPage != null && pageNum > _maxPage!) {
                return null;
              }

              final pageUrl = _getPdfPageUrl(pageNum);

              return InteractiveViewer(
                minScale: 0.5,
                maxScale: 4.0,
                child: Image.network(
                  pageUrl,
                  fit: BoxFit.contain,
                  loadingBuilder: (context, child, loadingProgress) {
                    if (loadingProgress == null) return child;
                    return const Center(child: CircularProgressIndicator(color: Colors.white));
                  },
                  errorBuilder: (context, error, stackTrace) {
                    WidgetsBinding.instance.addPostFrameCallback((_) {
                      if (mounted && _maxPage == null && pageNum > 1) {
                        setState(() {
                          _maxPage = pageNum - 1;
                          if (_currentPage > _maxPage!) {
                            _currentPage = _maxPage!;
                            _pageController.jumpToPage(_maxPage! - 1);
                          }
                        });
                      } else if (mounted && pageNum == 1) {
                        setState(() {
                          _hasError = true;
                        });
                      }
                    });

                    if (pageNum == 1 || _hasError) {
                      return Container(
                        color: Colors.white,
                        child: Center(
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              const Icon(Icons.broken_image_rounded, color: AppTheme.outlineColor, size: 48),
                              const SizedBox(height: 12),
                              const Text(
                                'Failed to load PDF preview',
                                style: TextStyle(
                                  color: AppTheme.textPrimary,
                                  fontWeight: FontWeight.bold,
                                  fontSize: 16,
                                ),
                              ),
                              const SizedBox(height: 8),
                              const Padding(
                                padding: EdgeInsets.symmetric(horizontal: 24),
                                child: Text(
                                  'This legacy upload does not support real-time mobile preview.',
                                  textAlign: TextAlign.center,
                                  style: TextStyle(color: AppTheme.textSecondary, fontSize: 13, height: 1.4),
                                ),
                              ),
                              const SizedBox(height: 20),
                              ElevatedButton.icon(
                                onPressed: () {
                                  Clipboard.setData(ClipboardData(text: widget.fileUrl));
                                  ScaffoldMessenger.of(context).showSnackBar(
                                    const SnackBar(
                                      content: Text('Document link copied to clipboard!'),
                                      duration: Duration(seconds: 2),
                                    ),
                                  );
                                },
                                icon: const Icon(Icons.copy_rounded, size: 16, color: Colors.white),
                                label: const Text('Copy Document Link'),
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: AppTheme.primaryColor,
                                  foregroundColor: Colors.white,
                                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(8),
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                      );
                    }
                    return const SizedBox.shrink();
                  },
                ),
              );
            },
          ),
        ),
      ],
    );
  }
}

class _ExpandableFeedbackBlock extends StatefulWidget {
  final String feedback;
  final String title;

  const _ExpandableFeedbackBlock({
    required this.feedback,
    required this.title,
  });

  @override
  State<_ExpandableFeedbackBlock> createState() => _ExpandableFeedbackBlockState();
}

class _ExpandableFeedbackBlockState extends State<_ExpandableFeedbackBlock> {
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
            onTap: () {
              setState(() {
                _isExpanded = !_isExpanded;
              });
            },
            borderRadius: BorderRadius.circular(8),
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    widget.title.toUpperCase(),
                    style: const TextStyle(
                      fontSize: 10,
                      fontWeight: FontWeight.bold,
                      color: AppTheme.textSecondary,
                      letterSpacing: 0.5,
                    ),
                  ),
                  Row(
                    children: [
                      Text(
                        _isExpanded ? 'Collapse' : 'Expand',
                        style: const TextStyle(
                          fontSize: 11,
                          color: AppTheme.primaryColor,
                          fontWeight: FontWeight.bold,
                        ),
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
              child: Text(
                widget.feedback,
                style: const TextStyle(
                  fontSize: 13,
                  color: AppTheme.textPrimary,
                  height: 1.5,
                ),
              ),
            ),
        ],
      ),
    );
  }
}
