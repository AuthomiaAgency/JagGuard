import 'package:intl/intl.dart';

/// Formateadores de fechas y coordenadas.
abstract final class Formatters {
  static String shortDate(DateTime date) =>
      DateFormat('dd/MM/yyyy').format(date);

  static String fullDateTime(DateTime date) =>
      DateFormat('dd/MM/yyyy · HH:mm').format(date);

  static String monthDay(DateTime date) => DateFormat('dd MMM').format(date);

  /// Coordenadas con 6 decimales: `-16.290154, -63.588653`.
  static String coordinates(double lat, double lng) =>
      '${lat.toStringAsFixed(6)}, ${lng.toStringAsFixed(6)}';

  /// Parse tolerante de timestamps: acepta ISO-8601 y milisegundos numéricos.
  static DateTime parseDate(dynamic value) {
    if (value is DateTime) return value;
    if (value is int) return DateTime.fromMillisecondsSinceEpoch(value);
    if (value is num) return DateTime.fromMillisecondsSinceEpoch(value.toInt());
    if (value is String && value.isNotEmpty) {
      return DateTime.tryParse(value) ?? DateTime.now();
    }
    return DateTime.now();
  }
}

/// Validadores reutilizables de formularios.
abstract final class Validators {
  static final RegExp _email = RegExp(r'^[\w.+\-]+@[\w\-]+\.[\w.\-]+$');

  static String? notEmpty(String? value, String message) {
    if (value == null || value.trim().isEmpty) return message;
    return null;
  }

  static String? email(String? value, String message) {
    if (value == null || !_email.hasMatch(value.trim())) return message;
    return null;
  }

  static String? password(String? value, String message) {
    if (value == null || value.length < 6) return message;
    return null;
  }

  /// Detecta si el texto es un número telefónico (solo dígitos y `+`).
  static bool isPhoneLike(String input) =>
      RegExp(r'^\+?[0-9\s\-]{6,}$').hasMatch(input.trim());
}
