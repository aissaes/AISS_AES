import 'package:flutter_riverpod/flutter_riverpod.dart';

abstract class NotificationRepository {
  Future<List<Map<String, dynamic>>> getNotifications();
}

class NotificationRepositoryImpl implements NotificationRepository {
  NotificationRepositoryImpl();

  @override
  Future<List<Map<String, dynamic>>> getNotifications() async {
    // Return empty list as no backend notification routing exists for students.
    // This adheres strictly to the rule of showing no hardcoded/fake data.
    return const [];
  }
}

final notificationRepositoryProvider = Provider<NotificationRepository>((ref) {
  return NotificationRepositoryImpl();
});
