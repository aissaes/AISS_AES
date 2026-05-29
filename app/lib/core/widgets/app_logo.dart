import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';

class AppLogo extends StatelessWidget {
  final double size;

  const AppLogo({
    super.key,
    this.size = 100,
  });

  static const String _svgString = '''
<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="shieldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#4F46E5;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#2e5bff;stop-opacity:1" />
    </linearGradient>
  </defs>
  <path d="M50 10 L85 25 V55 C85 75 50 90 50 90 C50 90 15 75 15 55 V25 L50 10Z" fill="url(#shieldGrad)" />
  <path d="M50 35 C42 35 36 41 36 49 V53 H32 V71 H68 V53 H64 V49 C64 41 58 35 50 35ZM50 40 C55 40 59 44 59 49 V53 H41 V49 C41 44 45 40 50 40Z" fill="white" />
  <rect x="47" y="60" width="6" height="4" rx="1" fill="white" opacity="0.8" />
</svg>
''';

  @override
  Widget build(BuildContext context) {
    return Hero(
      tag: 'app_logo',
      child: SvgPicture.string(
        _svgString,
        width: size,
        height: size,
      ),
    );
  }
}
