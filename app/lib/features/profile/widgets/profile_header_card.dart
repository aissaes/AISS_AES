import 'package:flutter/material.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/models/student_model.dart';

class ProfileHeaderCard extends StatelessWidget {
  final StudentModel student;
  final bool isCached;

  const ProfileHeaderCard({
    super.key,
    required this.student,
    this.isCached = false,
  });

  @override
  Widget build(BuildContext context) {
    final String name = student.name;
    final String email = student.email;
    final String collegeName = student.collegeName;
    final String initials = student.initials;

    return Column(
      children: [
        Container(
          width: 100,
          height: 100,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            border: Border.all(color: Colors.white, width: 4),
            boxShadow: AppTheme.premiumShadow,
            gradient: const LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [AppTheme.primaryColor, AppTheme.primaryContainer],
            ),
          ),
          child: Center(
            child: Text(
              initials,
              style: const TextStyle(
                fontSize: 30,
                fontWeight: FontWeight.w900,
                color: Colors.white,
                letterSpacing: -1,
              ),
            ),
          ),
        ),
        const SizedBox(height: 20),
        Text(
          name,
          textAlign: TextAlign.center,
          style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w900, letterSpacing: -0.5),
        ),
        const SizedBox(height: 4),
        Text(
          email,
          style: const TextStyle(color: AppTheme.textSecondary, fontSize: 14, fontWeight: FontWeight.w500),
        ),
        if (collegeName != 'N/A') ...[
          const SizedBox(height: 6),
          Text(
            collegeName.toUpperCase(),
            style: const TextStyle(
              color: AppTheme.primaryColor,
              fontSize: 10,
              fontWeight: FontWeight.w900,
              letterSpacing: 1.2,
            ),
          ),
        ],
        const SizedBox(height: 16),
        if (isCached)
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
            decoration: BoxDecoration(
              color: Colors.orange.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(100),
            ),
            child: const Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(Icons.offline_pin_rounded, color: Colors.orange, size: 14),
                SizedBox(width: 6),
                Text(
                  'Offline Cached Data',
                  style: TextStyle(
                    color: Colors.orange,
                    fontSize: 11,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ],
            ),
          ),
      ],
    );
  }
}
