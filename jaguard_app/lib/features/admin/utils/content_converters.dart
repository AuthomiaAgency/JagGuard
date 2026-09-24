import 'package:flutter_quill/quill_delta.dart';
import 'package:flutter_quill_delta_from_html/flutter_quill_delta_from_html.dart';
import 'package:vsc_quill_delta_to_html/vsc_quill_delta_to_html.dart';

/// Puente de conversión Delta (editor nativo Quill) ↔ HTML (almacenado en
/// la tabla `guides` y renderizado en el detalle con HtmlWidget).
/// Compatibilidad total con el contenido creado en la web original.
abstract final class ContentConverters {
  /// Delta del editor → HTML.
  static String deltaToHtml(Delta delta) {
    try {
      final QuillDeltaToHtmlConverter converter = QuillDeltaToHtmlConverter(
        delta.toJson(),
      );
      return converter.convert();
    } catch (_) {
      // Rescate: texto plano como párrafos.
      final StringBuffer buffer = StringBuffer();
      for (final Operation op in delta.operations) {
        if (op.data is String) {
          buffer.write('<p>${(op.data as String).trim()}</p>');
        }
      }
      return buffer.toString();
    }
  }

  /// HTML (web o Storage) → Delta para el editor.
  static Delta htmlToDelta(String html) {
    try {
      return HtmlToDelta().convert(html);
    } catch (_) {
      final Delta delta = Delta();
      delta.insert(html);
      return delta;
    }
  }
}
