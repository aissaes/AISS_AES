import 'package:flutter/material.dart';
import 'offline_banner.dart';

class ShellBody extends StatelessWidget {
  final Widget child;
  final bool isOffline;

  const ShellBody({
    super.key,
    required this.child,
    required this.isOffline,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        if (isOffline) const OfflineBanner(),
        Expanded(
          child: isOffline
              ? MediaQuery.removePadding(
                  context: context,
                  removeTop: true,
                  child: child,
                )
              : child,
        ),
      ],
    );
  }
}
