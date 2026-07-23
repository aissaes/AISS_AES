import 'package:flutter/material.dart';
import '../../../../core/theme/app_theme.dart';

// =============================================================================
// RESULT OVERVIEW CARD
// Gradient hero card: subject name, exam type, score, percentage ring.
// =============================================================================
class ResultOverviewCard extends StatelessWidget {
  final dynamic result;

  const ResultOverviewCard({super.key, required this.result});

  @override
  Widget build(BuildContext context) {
    final totalMarks = result.totalMarksObtained as num;
    final maxMarks = result.maxMarks as num;
    final percent = result.percent as double;

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
          _SubjectHeader(subjectName: result.subjectName, subjectCode: result.subjectCode),
          const SizedBox(height: 24),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              _ScoreDisplay(examType: result.examType, totalMarks: totalMarks, maxMarks: maxMarks),
              _PercentageRing(percent: percent),
            ],
          ),
          const SizedBox(height: 16),
          const _AiGradingBadge(),
        ],
      ),
    );
  }
}

class _SubjectHeader extends StatelessWidget {
  final String subjectName;
  final String subjectCode;

  const _SubjectHeader({required this.subjectName, required this.subjectCode});

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          subjectCode,
          style: TextStyle(color: Colors.white.withValues(alpha: 0.8), fontWeight: FontWeight.bold, fontSize: 12),
        ),
        const SizedBox(height: 4),
        Text(
          subjectName,
          style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w900, fontSize: 22, letterSpacing: -0.5),
        ),
      ],
    );
  }
}

class _ScoreDisplay extends StatelessWidget {
  final String examType;
  final num totalMarks;
  final num maxMarks;

  const _ScoreDisplay({required this.examType, required this.totalMarks, required this.maxMarks});

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          examType,
          style: TextStyle(color: Colors.white.withValues(alpha: 0.8), fontSize: 13, fontWeight: FontWeight.w500),
        ),
        const SizedBox(height: 8),
        Row(
          crossAxisAlignment: CrossAxisAlignment.baseline,
          textBaseline: TextBaseline.alphabetic,
          children: [
            Text(
              totalMarks.toStringAsFixed(0),
              style: const TextStyle(color: Colors.white, fontSize: 36, fontWeight: FontWeight.w900),
            ),
            Text(
              ' / ${maxMarks.toStringAsFixed(0)}',
              style: TextStyle(color: Colors.white.withValues(alpha: 0.7), fontSize: 18, fontWeight: FontWeight.bold),
            ),
          ],
        ),
      ],
    );
  }
}

class _PercentageRing extends StatelessWidget {
  final double percent;

  const _PercentageRing({required this.percent});

  @override
  Widget build(BuildContext context) {
    return Stack(
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
          style: const TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.w900),
        ),
      ],
    );
  }
}

class _AiGradingBadge extends StatelessWidget {
  const _AiGradingBadge();

  @override
  Widget build(BuildContext context) {
    return Container(
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
            style: TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold),
          ),
        ],
      ),
    );
  }
}
