import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../../core/theme/app_theme.dart';
import '../../../shared/widgets/primary_button.dart';

class ForgotPasswordScreen extends StatefulWidget {
  const ForgotPasswordScreen({super.key});

  @override
  State<ForgotPasswordScreen> createState() => _ForgotPasswordScreenState();
}

class _ForgotPasswordScreenState extends State<ForgotPasswordScreen> with SingleTickerProviderStateMixin {
  late AnimationController _bgController;

  @override
  void initState() {
    super.initState();
    _bgController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 10),
    )..repeat(reverse: true);
  }

  @override
  void dispose() {
    _bgController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Stack(
        children: [
          // Animated Background Gradient (Matches Login Screen)
          AnimatedBuilder(
            animation: _bgController,
            builder: (context, child) {
              return Container(
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                    stops: [0.0, 0.5 + (_bgController.value * 0.1), 1.0],
                    colors: const [
                      Color(0xFF0A0F2C),
                      Color(0xFF1A2B7C),
                      AppTheme.primaryColor,
                    ],
                  ),
                ),
              );
            },
          ),
          
          // Decorative Glows
          Positioned(
            top: -100,
            right: -50,
            child: Container(
              width: 400,
              height: 400,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                gradient: RadialGradient(
                  colors: [Colors.blue.withValues(alpha: 0.1), Colors.transparent],
                ),
              ),
            ),
          ),
          
          SafeArea(
            child: Center(
              child: SingleChildScrollView(
                padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 20),
                child: ConstrainedBox(
                  constraints: const BoxConstraints(maxWidth: 420),
                  child: Column(
                    children: [
                      // Premium Card
                      Container(
                        padding: const EdgeInsets.all(28),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(24),
                          boxShadow: AppTheme.premiumShadow,
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            // Header Icon
                            Center(
                              child: Container(
                                padding: const EdgeInsets.all(16),
                                decoration: BoxDecoration(
                                  color: AppTheme.primaryColor.withValues(alpha: 0.08),
                                  shape: BoxShape.circle,
                                ),
                                child: const Icon(
                                  Icons.lock_reset_rounded,
                                  color: AppTheme.primaryColor,
                                  size: 48,
                                ),
                              ),
                            ),
                            const SizedBox(height: 20),
                            
                            // Title & Description
                            const Text(
                              'Reset Password',
                              textAlign: TextAlign.center,
                              style: TextStyle(
                                fontSize: 24,
                                fontWeight: FontWeight.w800,
                                color: AppTheme.textPrimary,
                                letterSpacing: -0.5,
                              ),
                            ),
                            const SizedBox(height: 8),
                            const Text(
                              'For security reasons, student passwords cannot be self-reset online. Please verify your credentials through one of the verified college channels below.',
                              textAlign: TextAlign.center,
                              style: TextStyle(
                                color: AppTheme.textSecondary,
                                fontSize: 13.5,
                                height: 1.45,
                              ),
                            ),
                            const SizedBox(height: 28),
                            
                            // Action Options
                            _buildSupportChannel(
                              icon: Icons.person_search_rounded,
                              title: 'Contact Department HOD',
                              description: 'Visit your branch Head of Department (HOD) office with your College Identity Card to obtain an instant reset token.',
                              color: AppTheme.primaryColor,
                            ),
                            const SizedBox(height: 16),
                            _buildSupportChannel(
                              icon: Icons.contact_mail_rounded,
                              title: 'Academic IT Helpdesk',
                              description: 'Send an email request to support@aiss.edu. Make sure to attach your Student Registration ID and branch details.',
                              color: const Color(0xFFD97706),
                            ),
                            const SizedBox(height: 16),
                            _buildSupportChannel(
                              icon: Icons.admin_panel_settings_rounded,
                              title: 'Academic Registrar Office',
                              description: 'Visit Block A, Desk 4 for physical verification and system credentials unlock (Timings: 9 AM - 4 PM).',
                              color: AppTheme.successColor,
                            ),
                            
                            const SizedBox(height: 32),
                            
                            // Back Button
                            PrimaryButton(
                              text: 'Back to Login',
                              icon: Icons.arrow_back_rounded,
                              onPressed: () => context.pop(),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSupportChannel({
    required IconData icon,
    required String title,
    required String description,
    required Color color,
  }) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppTheme.backgroundColor,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppTheme.outlineColor.withValues(alpha: 0.15)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.1),
              shape: BoxShape.circle,
            ),
            child: Icon(icon, color: color, size: 20),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(
                    fontSize: 14.5,
                    fontWeight: FontWeight.bold,
                    color: AppTheme.textPrimary,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  description,
                  style: const TextStyle(
                    fontSize: 12,
                    color: AppTheme.textSecondary,
                    height: 1.4,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
