import 'package:flutter/material.dart';
import 'app_loading_indicator.dart';

class LoadingOverlay extends StatelessWidget {
  final bool isLoading;
  final Widget child;

  const LoadingOverlay({
    super.key,
    required this.isLoading,
    required this.child,
  });

  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        child,
        if (isLoading)
          Container(
            color: Colors.black.withValues(alpha: 0.3),
            child: const Center(
              child: AppLoadingIndicator(
                size: 70,
                logoSize: 36,
              ),
            ),
          ),
      ],
    );
  }
}
