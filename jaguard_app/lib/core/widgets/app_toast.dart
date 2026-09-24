import 'package:flutter/material.dart';

/// Notificaciones estilo `react-hot-toast`: flotantes, centradas arriba.
abstract final class AppToast {
  static void show(BuildContext context, String message, {bool error = false}) {
    ScaffoldMessenger.of(context)
      ..clearSnackBars()
      ..showSnackBar(
        SnackBar(
          content: Row(
            children: [
              Icon(
                error ? Icons.error_outline : Icons.check_circle_outline,
                size: 20,
                color: error ? const Color(0xFFF87171) : const Color(0xFF34D399),
              ),
              const SizedBox(width: 10),
              Expanded(child: Text(message)),
            ],
          ),
          duration: Duration(milliseconds: error ? 3500 : 2200),
        ),
      );
  }
}
