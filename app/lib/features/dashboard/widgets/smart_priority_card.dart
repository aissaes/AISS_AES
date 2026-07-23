import 'package:flutter/material.dart';
import '../models/dashboard_data_model.dart';
import 'priority_cards/live_exam_card.dart';
import 'priority_cards/result_published_card.dart';
import 'priority_cards/semester_overview_card.dart';
import 'priority_cards/upcoming_exam_card.dart';

// =============================================================================
// SMART PRIORITY CARD
// Shows the most relevant card for the current moment: live exam, upcoming
// exam, published result, or a default semester overview.
// =============================================================================
class SmartPriorityCard extends StatelessWidget {
  final DashboardPriorityCard priorityCard;

  const SmartPriorityCard({super.key, required this.priorityCard});

  @override
  Widget build(BuildContext context) {
    return switch (priorityCard.type) {
      'live_exam'     => LiveExamCardVariant(data: priorityCard.data),
      'upcoming_exam' => UpcomingExamCardVariant(data: priorityCard.data),
      'result'        => ResultPublishedCardVariant(data: priorityCard.data),
      _               => SemesterOverviewCardVariant(data: priorityCard.data),
    };
  }
}
