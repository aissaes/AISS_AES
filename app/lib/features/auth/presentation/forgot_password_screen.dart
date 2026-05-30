import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/repositories/auth_repository.dart';
import '../../../shared/widgets/custom_text_field.dart';
import '../../../shared/widgets/primary_button.dart';

class ForgotPasswordScreen extends ConsumerStatefulWidget {
  const ForgotPasswordScreen({super.key});

  @override
  ConsumerState<ForgotPasswordScreen> createState() => _ForgotPasswordScreenState();
}

class _ForgotPasswordScreenState extends ConsumerState<ForgotPasswordScreen> with SingleTickerProviderStateMixin {
  late AnimationController _bgController;
  final _emailController = TextEditingController();
  final _otpController = TextEditingController();
  final _newPasswordController = TextEditingController();
  
  int _step = 1; // 1 = Enter Email, 2 = Enter OTP & New Password
  bool _isLoading = false;
  String? _errorMessage;
  String? _successMessage;

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
    _emailController.dispose();
    _otpController.dispose();
    _newPasswordController.dispose();
    super.dispose();
  }

  void _requestOtp() async {
    final email = _emailController.text.trim();
    if (email.isEmpty) {
      setState(() => _errorMessage = 'Please enter your registered email.');
      return;
    }

    setState(() {
      _isLoading = true;
      _errorMessage = null;
      _successMessage = null;
    });

    try {
      await ref.read(authRepositoryProvider).forgotPassword(email);
      setState(() {
        _step = 2;
        _successMessage = 'A 6-digit verification code has been sent to $email';
      });
    } catch (e) {
      setState(() => _errorMessage = e.toString().replaceAll('Exception: ', ''));
    } finally {
      setState(() => _isLoading = false);
    }
  }

  void _resetPassword() async {
    final email = _emailController.text.trim();
    final otp = _otpController.text.trim();
    final newPassword = _newPasswordController.text.trim();

    if (otp.length < 6) {
      setState(() => _errorMessage = 'Please enter the complete 6-digit code.');
      return;
    }
    if (newPassword.length < 6) {
      setState(() => _errorMessage = 'Password must be at least 6 characters.');
      return;
    }

    setState(() {
      _isLoading = true;
      _errorMessage = null;
      _successMessage = null;
    });

    try {
      await ref.read(authRepositoryProvider).resetForgottenPassword(email, otp, newPassword);
      setState(() {
        _successMessage = 'Your password has been successfully reset! Redirecting to login...';
      });
      Future.delayed(const Duration(seconds: 2), () {
        if (mounted) {
          context.pop();
        }
      });
    } catch (e) {
      setState(() => _errorMessage = e.toString().replaceAll('Exception: ', ''));
    } finally {
      setState(() => _isLoading = false);
    }
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
                            Text(
                              _step == 1 ? 'Reset Password' : 'Verify & Reset',
                              textAlign: TextAlign.center,
                              style: const TextStyle(
                                fontSize: 24,
                                fontWeight: FontWeight.w800,
                                color: AppTheme.textPrimary,
                                letterSpacing: -0.5,
                              ),
                            ),
                            const SizedBox(height: 8),
                            Text(
                              _step == 1 
                                ? 'Enter your registered email address below to receive a secure password reset OTP verification code.'
                                : 'Enter the 6-digit OTP verification code sent to your email and select your new secure password.',
                              textAlign: TextAlign.center,
                              style: const TextStyle(
                                color: AppTheme.textSecondary,
                                fontSize: 13.5,
                                height: 1.45,
                              ),
                            ),
                            const SizedBox(height: 24),

                            if (_errorMessage != null) ...[
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                                decoration: BoxDecoration(
                                  color: const Color(0xFFFFDAD6).withValues(alpha: 0.5),
                                  border: Border.all(color: const Color(0xFFBA1A1A).withValues(alpha: 0.2)),
                                  borderRadius: BorderRadius.circular(12),
                                ),
                                child: Row(
                                  children: [
                                    const Icon(Icons.error_outline_rounded, color: Color(0xFFBA1A1A), size: 20),
                                    const SizedBox(width: 12),
                                    Expanded(
                                      child: Text(
                                        _errorMessage!,
                                        style: const TextStyle(color: Color(0xFF93000A), fontSize: 13.5, fontWeight: FontWeight.w500),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                              const SizedBox(height: 16),
                            ],

                            if (_successMessage != null) ...[
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                                decoration: BoxDecoration(
                                  color: AppTheme.successColor.withValues(alpha: 0.1),
                                  border: Border.all(color: AppTheme.successColor.withValues(alpha: 0.2)),
                                  borderRadius: BorderRadius.circular(12),
                                ),
                                child: Row(
                                  children: [
                                    const Icon(Icons.check_circle_outline_rounded, color: AppTheme.successColor, size: 20),
                                    const SizedBox(width: 12),
                                    Expanded(
                                      child: Text(
                                        _successMessage!,
                                        style: const TextStyle(color: AppTheme.successColor, fontSize: 13.5, fontWeight: FontWeight.w500),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                              const SizedBox(height: 16),
                            ],
                            
                            if (_step == 1) ...[
                              const Text(
                                'Email Address',
                                style: TextStyle(
                                  fontSize: 12,
                                  fontWeight: FontWeight.w600,
                                  color: AppTheme.textPrimary,
                                ),
                              ),
                              const SizedBox(height: 8),
                              CustomTextField(
                                label: '',
                                hint: 'student@aiss.edu',
                                controller: _emailController,
                                keyboardType: TextInputType.emailAddress,
                              ),
                              const SizedBox(height: 24),
                              PrimaryButton(
                                text: 'Send Reset OTP',
                                icon: Icons.arrow_forward_rounded,
                                isLoading: _isLoading,
                                onPressed: _requestOtp,
                              ),
                              const SizedBox(height: 24),
                              const Divider(),
                              const SizedBox(height: 16),
                              const Text(
                                'Alternative Support Options',
                                style: TextStyle(
                                  fontSize: 13.5,
                                  fontWeight: FontWeight.w800,
                                  color: AppTheme.textPrimary,
                                ),
                              ),
                              const SizedBox(height: 6),
                              const Text(
                                "If you don't have access to your registered academic email address or require physical credential recovery, please use one of these college support channels:",
                                style: TextStyle(
                                  fontSize: 11.5,
                                  color: AppTheme.textSecondary,
                                  height: 1.35,
                                ),
                              ),
                              const SizedBox(height: 16),
                              _buildSupportChannel(
                                icon: Icons.person_search_rounded,
                                title: 'Contact Department HOD',
                                description: 'Visit your branch Head of Department (HOD) office with your College Identity Card to request an instant account reset.',
                                color: AppTheme.primaryColor,
                              ),
                              const SizedBox(height: 12),
                              _buildSupportChannel(
                                icon: Icons.contact_mail_rounded,
                                title: 'Academic IT Helpdesk',
                                description: 'Send an email request to support@aiss.edu. Include your Student Registration ID and branch details.',
                                color: const Color(0xFFD97706),
                              ),
                              const SizedBox(height: 12),
                              _buildSupportChannel(
                                icon: Icons.admin_panel_settings_rounded,
                                title: 'Academic Registrar Office',
                                description: 'Visit Block A, Desk 4 for physical verification and credential unlock (9 AM - 4 PM).',
                                color: AppTheme.successColor,
                              ),
                            ] else ...[
                              const Text(
                                '6-Digit Verification Code (OTP)',
                                style: TextStyle(
                                  fontSize: 12,
                                  fontWeight: FontWeight.w600,
                                  color: AppTheme.textPrimary,
                                ),
                              ),
                              const SizedBox(height: 8),
                              CustomTextField(
                                label: '',
                                hint: '123456',
                                controller: _otpController,
                                keyboardType: TextInputType.number,
                              ),
                              const SizedBox(height: 16),
                              const Text(
                                'New Secure Password',
                                style: TextStyle(
                                  fontSize: 12,
                                  fontWeight: FontWeight.w600,
                                  color: AppTheme.textPrimary,
                                ),
                              ),
                              const SizedBox(height: 8),
                              CustomTextField(
                                label: '',
                                hint: 'Min. 6 characters',
                                isPassword: true,
                                controller: _newPasswordController,
                              ),
                              const SizedBox(height: 24),
                              PrimaryButton(
                                text: 'Reset Password',
                                icon: Icons.check_circle_outline_rounded,
                                isLoading: _isLoading,
                                onPressed: _resetPassword,
                              ),
                            ],
                            
                            const SizedBox(height: 20),
                            
                            // Back Button
                            TextButton(
                              onPressed: () {
                                if (_step == 2) {
                                  setState(() {
                                    _step = 1;
                                    _errorMessage = null;
                                    _successMessage = null;
                                  });
                                } else {
                                  context.pop();
                                }
                              },
                              child: Text(
                                _step == 2 ? '← Go Back' : 'Back to Login',
                                style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13.5),
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
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppTheme.backgroundColor,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppTheme.outlineColor.withValues(alpha: 0.1)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.1),
              shape: BoxShape.circle,
            ),
            child: Icon(icon, color: color, size: 18),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.bold,
                    color: AppTheme.textPrimary,
                  ),
                ),
                const SizedBox(height: 3),
                Text(
                  description,
                  style: const TextStyle(
                    fontSize: 11.5,
                    color: AppTheme.textSecondary,
                    height: 1.3,
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
