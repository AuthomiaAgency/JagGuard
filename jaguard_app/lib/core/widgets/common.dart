import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../services/connectivity_service.dart';
import '../theme/app_theme.dart';

/// Marca de JagGuard: logotipo del jaguar (arte original del cliente).
/// En tema claro usa el trazo navy; en tema oscuro se invierte a blanco
/// con transición suave.
class BrandMark extends StatelessWidget {
  const BrandMark({
    super.key,
    this.size = 40,
    this.showWordmark = false,
    this.monochrome,
  });

  final double size;
  final bool showWordmark;

  /// Fuerza una variante: `false` = navy (claro), `true` = blanco (oscuro).
  /// Si es `null` sigue el tema del contexto.
  final bool? monochrome;

  @override
  Widget build(BuildContext context) {
    final bool isDark = Theme.of(context).brightness == Brightness.dark;
    final bool useWhite = monochrome ?? isDark;

    final Widget mark = AnimatedSwitcher(
      duration: const Duration(milliseconds: 420),
      switchInCurve: Curves.easeOutCubic,
      switchOutCurve: Curves.easeInCubic,
      transitionBuilder: (Widget child, Animation<double> animation) =>
          FadeTransition(
        opacity: animation,
        child: ScaleTransition(scale: animation, child: child),
      ),
      child: Image.asset(
        useWhite
            ? 'assets/branding/jaguard_logo_light_on_dark.png'
            : 'assets/branding/jaguard_logo_dark_on_light.png',
        key: ValueKey<bool>(useWhite),
        width: size,
        height: size,
        fit: BoxFit.contain,
        filterQuality: FilterQuality.high,
      ),
    );

    if (!showWordmark) return mark;

    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        mark,
        const SizedBox(width: 12),
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'JaGuarD',
              style: TextStyle(
                fontFamily: AppTheme.fontFamily,
                fontSize: size * 0.42,
                fontWeight: FontWeight.w900,
                letterSpacing: 0.6,
                color: isDark ? AppColors.darkText : AppColors.lightText,
                height: 1.1,
              ),
            ),
            Text(
              'PROTECCIÓN DE FAUNA',
              style: TextStyle(
                fontFamily: AppTheme.fontFamily,
                fontSize: size * 0.24,
                fontWeight: FontWeight.w700,
                letterSpacing: 3,
                color: AppColors.primary,
                height: 1.2,
              ),
            ),
          ],
        ),
      ],
    );
  }
}

/// Header sticky: marca a la izquierda, indicador de conexión a la derecha.
class AppHeader extends ConsumerWidget {
  const AppHeader({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final bool online = ref.watch(onlineProvider);
    final bool isDark = Theme.of(context).brightness == Brightness.dark;

    return Material(
      color: (isDark ? AppColors.darkBackground : AppColors.lightBackground)
          .withOpacity(0.92),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            const BrandMark(size: 34),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
              decoration: BoxDecoration(
                color: online
                    ? const Color(0xFFECFDF5)
                    : const Color(0xFFFEF2F2),
                borderRadius: BorderRadius.circular(999),
                border: Border.all(
                  color: online
                      ? const Color(0xFFA7F3D0)
                      : const Color(0xFFFECACA),
                ),
              ),
              child: Row(
                children: [
                  Icon(
                    online ? Icons.wifi_rounded : Icons.wifi_off_rounded,
                    size: 12,
                    color: online
                        ? const Color(0xFF059669)
                        : const Color(0xFFDC2626),
                  ),
                  const SizedBox(width: 5),
                  Text(
                    online ? 'CONECTADO' : 'SIN CONEXIÓN',
                    style: TextStyle(
                      fontFamily: AppTheme.fontFamily,
                      fontSize: 9,
                      fontWeight: FontWeight.w800,
                      letterSpacing: 1,
                      color: online
                          ? const Color(0xFF059669)
                          : const Color(0xFFDC2626),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Título de sección con espaciado editorial.
class SectionTitle extends StatelessWidget {
  const SectionTitle(this.text, {super.key});

  final String text;

  @override
  Widget build(BuildContext context) {
    return Text(
      text,
      style: Theme.of(context).textTheme.labelMedium?.copyWith(
            letterSpacing: 1.2,
            color: Theme.of(context).colorScheme.onSurface.withOpacity(0.55),
          ),
    );
  }
}

/// Chip de estado de reporte/canje/mensaje.
class StatusChip extends StatelessWidget {
  const StatusChip({super.key, required this.label, required this.color});

  final String label;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: color.withOpacity(0.12),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Text(
        label.toUpperCase(),
        style: TextStyle(
          fontFamily: AppTheme.fontFamily,
          fontSize: 10,
          fontWeight: FontWeight.w800,
          letterSpacing: 0.6,
          color: color,
        ),
      ),
    );
  }
}

/// Estado vacío con icono y mensaje.
class EmptyState extends StatelessWidget {
  const EmptyState({
    super.key,
    required this.icon,
    required this.message,
  });

  final IconData icon;
  final String message;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 32, horizontal: 24),
        child: Column(
          children: [
            Icon(icon, size: 48, color: Theme.of(context).disabledColor),
            const SizedBox(height: 14),
            Text(
              message,
              textAlign: TextAlign.center,
              style: Theme.of(context).textTheme.bodyMedium,
            ),
          ],
        ),
      ),
    );
  }
}

/// Spinner circular de carga de pantalla completa.
class FullScreenLoader extends StatelessWidget {
  const FullScreenLoader({super.key, this.label});

  final String? label;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const CircularProgressIndicator(),
          if (label != null) ...[
            const SizedBox(height: 16),
            Text(label!, style: Theme.of(context).textTheme.bodyMedium),
          ],
        ],
      ),
    );
  }
}
