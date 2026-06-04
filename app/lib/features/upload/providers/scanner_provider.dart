import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'dart:io' show File;
import 'dart:typed_data';
import 'package:path_provider/path_provider.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:path/path.dart' as p;
import 'package:camera/camera.dart' show XFile;
import '../../../core/services/scan_quality_service.dart';

class ScannerState {
  final List<String> imagePaths;
  final List<ImageQualityResult> qualityResults;
  final bool isGeneratingPdf;
  final String? pdfPath;
  final Uint8List? pdfBytes;

  ScannerState({
    this.imagePaths = const [],
    this.qualityResults = const [],
    this.isGeneratingPdf = false,
    this.pdfPath,
    this.pdfBytes,
  });

  ScannerState copyWith({
    List<String>? imagePaths,
    List<ImageQualityResult>? qualityResults,
    bool? isGeneratingPdf,
    String? pdfPath,
    Uint8List? pdfBytes,
  }) {
    return ScannerState(
      imagePaths: imagePaths ?? this.imagePaths,
      qualityResults: qualityResults ?? this.qualityResults,
      isGeneratingPdf: isGeneratingPdf ?? this.isGeneratingPdf,
      pdfPath: pdfPath ?? this.pdfPath,
      pdfBytes: pdfBytes ?? this.pdfBytes,
    );
  }
}

class ScannerNotifier extends StateNotifier<ScannerState> {
  ScannerNotifier() : super(ScannerState());

  Future<ImageQualityResult> addImage(String path) async {
    final quality = await ScanQualityService.analyzeImage(path);
    state = state.copyWith(
      imagePaths: [...state.imagePaths, path],
      qualityResults: [...state.qualityResults, quality],
    );
    return quality;
  }

  void removeImage(int index) {
    final newList = List<String>.from(state.imagePaths);
    newList.removeAt(index);
    
    final newQualityList = List<ImageQualityResult>.from(state.qualityResults);
    newQualityList.removeAt(index);
    
    state = state.copyWith(
      imagePaths: newList,
      qualityResults: newQualityList,
    );
  }

  void reorderImages(int oldIndex, int newIndex) {
    final newList = List<String>.from(state.imagePaths);
    final newQualityList = List<ImageQualityResult>.from(state.qualityResults);
    
    if (newIndex > oldIndex) newIndex -= 1;
    
    final item = newList.removeAt(oldIndex);
    newList.insert(newIndex, item);
    
    final qualityItem = newQualityList.removeAt(oldIndex);
    newQualityList.insert(newIndex, qualityItem);
    
    state = state.copyWith(
      imagePaths: newList,
      qualityResults: newQualityList,
    );
  }

  Future<String?> generatePdf() async {
    if (state.imagePaths.isEmpty) return null;

    state = state.copyWith(isGeneratingPdf: true);

    final pdf = pw.Document();

    for (final imagePath in state.imagePaths) {
      final Uint8List bytes = await XFile(imagePath).readAsBytes();
      final image = pw.MemoryImage(bytes);
      
      pdf.addPage(
        pw.Page(
          build: (pw.Context context) {
            return pw.Center(child: pw.Image(image));
          },
        ),
      );
    }

    final pdfData = await pdf.save();

    if (kIsWeb) {
      state = state.copyWith(
        isGeneratingPdf: false, 
        pdfPath: 'memory:exam_submission.pdf',
        pdfBytes: pdfData,
      );
      return 'memory:exam_submission.pdf';
    } else {
      final output = await getTemporaryDirectory();
      final file = File(p.join(output.path, "exam_submission_${DateTime.now().millisecondsSinceEpoch}.pdf"));
      await file.writeAsBytes(pdfData);

      state = state.copyWith(
        isGeneratingPdf: false, 
        pdfPath: file.path,
        pdfBytes: pdfData,
      );
      return file.path;
    }
  }

  void initializeWithImages(List<String> paths) {
    state = ScannerState(
      imagePaths: paths,
      qualityResults: List.generate(paths.length, (_) => ImageQualityResult(
        brightness: 0.5,
        clarity: 80.0,
        isBlurry: false,
        isTooDark: false,
        isTooBright: false,
      )),
    );
  }

  void reset() {
    state = ScannerState();
  }
}

final scannerProvider = StateNotifierProvider<ScannerNotifier, ScannerState>((ref) {
  return ScannerNotifier();
});

class QuestionScansNotifier extends StateNotifier<Map<String, List<String>>> {
  QuestionScansNotifier() : super(const {});

  void saveScans(String questionId, List<String> paths) {
    state = {
      ...state,
      questionId: List<String>.from(paths),
    };
  }

  void removeScan(String questionId, int index) {
    final list = state[questionId];
    if (list != null && index < list.length) {
      final newList = List<String>.from(list)..removeAt(index);
      state = {
        ...state,
        questionId: newList,
      };
    }
  }

  void clear() {
    state = const {};
  }
}

final questionScansProvider = StateNotifierProvider<QuestionScansNotifier, Map<String, List<String>>>((ref) {
  return QuestionScansNotifier();
});
