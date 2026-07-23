import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../shared/widgets/script_thumbnail.dart';
import '../../../upload/providers/scanner_provider.dart';

// =============================================================================
// LOCAL SCANS PREVIEW
// Horizontal thumbnail strip of pages scanned locally using shared ScriptThumbnail.
// =============================================================================
class LocalScansPreview extends ConsumerWidget {
  final String questionId;

  const LocalScansPreview({super.key, required this.questionId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final localScans = ref.watch(questionScansProvider)[questionId] ?? [];
    if (localScans.isEmpty) return const SizedBox.shrink();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const SizedBox(height: 12),
        Row(
          children: [
            const Icon(Icons.collections_bookmark_outlined, size: 12, color: AppTheme.textSecondary),
            const SizedBox(width: 6),
            Text(
              '${localScans.length} Scanned Page${localScans.length == 1 ? '' : 's'}',
              style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: AppTheme.textSecondary, letterSpacing: 0.3),
            ),
          ],
        ),
        const SizedBox(height: 8),
        SizedBox(
          height: 68,
          child: ListView.builder(
            scrollDirection: Axis.horizontal,
            itemCount: localScans.length,
            itemBuilder: (context, index) => Padding(
              padding: const EdgeInsets.only(right: 8),
              child: ScriptThumbnail(
                fileUrlOrPath: localScans[index],
                pageLabel: 'P${index + 1}',
                width: 48,
                height: 68,
              ),
            ),
          ),
        ),
      ],
    );
  }
}
