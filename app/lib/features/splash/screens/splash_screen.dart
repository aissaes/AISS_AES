import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../auth/providers/auth_provider.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/app_logo.dart';

class SplashScreen extends ConsumerStatefulWidget {
  const SplashScreen({super.key});

  @override
  ConsumerState<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends ConsumerState<SplashScreen> with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _fadeAnimation;
  late Animation<double> _scaleAnimation;
  bool _isAnimFinished = false;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 2),
    );

    _fadeAnimation = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(parent: _controller, curve: const Interval(0.0, 0.5, curve: Curves.easeIn)),
    );

    _scaleAnimation = Tween<double>(begin: 0.8, end: 1.0).animate(
      CurvedAnimation(parent: _controller, curve: const Interval(0.0, 0.5, curve: Curves.easeOutBack)),
    );

    _controller.forward();
    _checkInitialState();
  }

  void _checkInitialState() async {
    // Wait for the minimum splash animation duration
    await Future.delayed(const Duration(seconds: 2));
    if (!mounted) return;
    
    setState(() {
      _isAnimFinished = true;
    });
    _navigateIfReady();
  }

  void _navigateIfReady() {
    if (!_isAnimFinished) return; // Keep splash on screen for at least 2 seconds
    
    final authState = ref.read(authProvider);
    if (!authState.isLoading) {
      if (authState.isAuthenticated) {
        context.go('/dashboard');
      } else if (!authState.isOffline) {
        context.go('/login');
      }
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authProvider);

    // Listen for state transitions after animations or startup checks complete
    ref.listen<AuthState>(authProvider, (previous, next) {
      if (!next.isLoading) {
        _navigateIfReady();
      }
    });

    return Scaffold(
      body: Container(
        width: double.infinity,
        height: double.infinity,
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [
              Color(0xFF0A0F2C),
              Color(0xFF1A2B7C),
              AppTheme.primaryColor,
            ],
          ),
        ),
        child: Stack(
          alignment: Alignment.center,
          children: [
            // Decorative Glows
            Positioned(
              top: -100,
              right: -100,
              child: _CircularGlow(color: AppTheme.primaryColor.withValues(alpha: 0.2), size: 400),
            ),
            Positioned(
              bottom: -100,
              left: -100,
              child: _CircularGlow(color: const Color(0xFF00D2FF).withValues(alpha: 0.1), size: 400),
            ),
            
            FadeTransition(
              opacity: _fadeAnimation,
              child: ScaleTransition(
                scale: _scaleAnimation,
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    // Premium Logo
                    Container(
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        boxShadow: [
                          BoxShadow(
                            color: AppTheme.primaryColor.withValues(alpha: 0.4),
                            blurRadius: 40,
                            spreadRadius: 10,
                          ),
                        ],
                      ),
                      child: const AppLogo(size: 120, heroTag: 'app_logo'),
                    ),
                    const SizedBox(height: 32),
                    const Text(
                      'AISS AES',
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 36,
                        fontWeight: FontWeight.w800,
                        letterSpacing: -1,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'SECURE EVALUATION SYSTEM',
                      style: TextStyle(
                        color: Colors.white.withValues(alpha: 0.7),
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        letterSpacing: 2,
                      ),
                    ),
                  ],
                ),
              ),
            ),
            
            // Bottom Loading or Connection Retry Indicator
            Positioned(
              bottom: 80,
              child: authState.isOffline 
                  ? Column(
                      children: [
                        const Icon(Icons.wifi_off_rounded, color: Colors.orange, size: 36),
                        const SizedBox(height: 12),
                        const Text(
                          'AES Server Connection Failed',
                          style: TextStyle(
                            color: Colors.white,
                            fontSize: 14,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          'Check your network and try again.',
                          style: TextStyle(
                            color: Colors.white.withValues(alpha: 0.6),
                            fontSize: 12,
                          ),
                        ),
                        const SizedBox(height: 16),
                        SizedBox(
                          height: 40,
                          child: ElevatedButton.icon(
                            onPressed: () {
                              ref.read(authProvider.notifier).verifyToken();
                            },
                            icon: const Icon(Icons.refresh_rounded, size: 16),
                            label: const Text('Retry Connection', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: AppTheme.primaryContainer,
                              padding: const EdgeInsets.symmetric(horizontal: 16),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(20),
                              ),
                            ),
                          ),
                        ),
                      ],
                    )
                  : Column(
                      children: [
                        Container(
                          width: 120,
                          height: 2,
                          decoration: BoxDecoration(
                            color: Colors.white.withValues(alpha: 0.1),
                            borderRadius: BorderRadius.circular(1),
                          ),
                          child: const _ShimmerLoadingBar(),
                        ),
                        const SizedBox(height: 16),
                        Text(
                          'Initializing secure environment',
                          style: TextStyle(
                            color: Colors.white.withValues(alpha: 0.5),
                            fontSize: 10,
                            fontWeight: FontWeight.w600,
                            letterSpacing: 1,
                          ),
                        ),
                      ],
                    ),
            ),
            
            // Security Badge
            Positioned(
              bottom: 40,
              child: Row(
                children: [
                  const Icon(Icons.verified_user_rounded, color: Color(0xFF47D6FF), size: 14),
                  const SizedBox(width: 6),
                  Text(
                    'SECURITY VERIFIED',
                    style: TextStyle(
                      color: Colors.white.withValues(alpha: 0.6),
                      fontSize: 10,
                      fontWeight: FontWeight.w700,
                      letterSpacing: 1,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _CircularGlow extends StatelessWidget {
  final Color color;
  final double size;

  const _CircularGlow({required this.color, required this.size});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        gradient: RadialGradient(
          colors: [color, Colors.transparent],
        ),
      ),
    );
  }
}

class _ShimmerLoadingBar extends StatefulWidget {
  const _ShimmerLoadingBar();

  @override
  State<_ShimmerLoadingBar> createState() => _ShimmerLoadingBarState();
}

class _ShimmerLoadingBarState extends State<_ShimmerLoadingBar> with SingleTickerProviderStateMixin {
  late AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 2),
    )..repeat();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _controller,
      builder: (context, child) {
        return FractionalTranslation(
          translation: Offset(_controller.value * 2 - 1, 0),
          child: Container(
            width: 60,
            decoration: const BoxDecoration(
              gradient: LinearGradient(
                colors: [Colors.transparent, Color(0xFF00D2FF), Colors.transparent],
              ),
            ),
          ),
        );
      },
    );
  }
}
