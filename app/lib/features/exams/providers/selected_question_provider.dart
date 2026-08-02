import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/models/question_model.dart';

final selectedQuestionProvider = StateProvider<QuestionModel?>((ref) => null);
