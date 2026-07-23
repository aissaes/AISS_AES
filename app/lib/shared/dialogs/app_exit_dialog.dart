import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'confirmation_dialog.dart';

class AppExitDialog {
  static Future<void> show(BuildContext context) async {
    final shouldExit = await ConfirmationDialog.show(
      context,
      title: 'Exit AISS AES?',
      message: 'Are you sure you want to exit the application?',
      type: ConfirmationDialogType.danger,
      cancelText: 'Cancel',
      confirmText: 'Exit App',
      icon: Icons.exit_to_app_rounded,
    );

    if (shouldExit == true && context.mounted) {
      SystemNavigator.pop();
    }
  }
}
