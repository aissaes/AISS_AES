import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/question_model.dart';

final selectedQuestionProvider = StateProvider<QuestionModel?>((ref) => null);
