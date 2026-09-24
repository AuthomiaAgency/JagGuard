import 'package:flutter/material.dart';

/// Paleta de JagGuard, portada del sistema Tailwind del diseño web
/// (`--color-primary: #10b981`, superficies oscuras #121212 / #1E1E1E).
abstract final class AppColors {
  // Marca
  static const Color primary = Color(0xFF10B981);
  static const Color primaryDark = Color(0xFF059669);
  static const Color primarySoft = Color(0x1A10B981); // primary @ 10%
  static const Color accent = Color(0xFFF48C25); // naranja de gráficos/badges

  // Semánticos
  static const Color success = Color(0xFF10B981);
  static const Color danger = Color(0xFFEF4444);
  static const Color warning = Color(0xFFF59E0B);
  static const Color info = Color(0xFF3B82F6);

  // Tipo de reporte → color (paridad con Home.tsx)
  static const Color reportAvistamiento = Color(0xFF3B82F6);
  static const Color reportHuella = Color(0xFFF97316);
  static const Color reportDepredacion = Color(0xFFEF4444);
  static const Color reportAtropellamiento = Color(0xFF64748B);
  static const Color reportTrafico = Color(0xFFEAB308);
  static const Color reportMatanza = Color(0xFFA855F7);

  // Tema claro
  static const Color lightBackground = Color(0xFFFFFFFF);
  static const Color lightSurface = Color(0xFFFFFFFF);
  static const Color lightSurfaceMuted = Color(0xFFF8FAFC); // slate-50
  static const Color lightBorder = Color(0xFFE2E8F0); // slate-200
  static const Color lightText = Color(0xFF0F172A); // slate-900
  static const Color lightTextMuted = Color(0xFF64748B); // slate-500

  // Tema oscuro
  static const Color darkBackground = Color(0xFF000000);
  static const Color darkSurface = Color(0xFF121212);
  static const Color darkSurfaceLighter = Color(0xFF1E1E1E);
  static const Color darkBorder = Color(0xFF2A2F3A);
  static const Color darkText = Color(0xFFF1F5F9);
  static const Color darkTextMuted = Color(0xFF94A3B8);
}

/// Temas de la aplicación (Material 3, tipografía Inter).
abstract final class AppTheme {
  static const String fontFamily = 'Inter';

  static ThemeData light() => _build(Brightness.light);
  static ThemeData dark() => _build(Brightness.dark);

  static ThemeData _build(Brightness brightness) {
    final bool isDark = brightness == Brightness.dark;
    final ColorScheme scheme = ColorScheme.fromSeed(
      seedColor: AppColors.primary,
      brightness: brightness,
      primary: AppColors.primary,
      onPrimary: Colors.white,
      secondary: AppColors.accent,
      surface: isDark ? AppColors.darkSurface : AppColors.lightSurface,
      error: AppColors.danger,
    );

    final Color text = isDark ? AppColors.darkText : AppColors.lightText;
    final Color textMuted =
        isDark ? AppColors.darkTextMuted : AppColors.lightTextMuted;
    final Color border =
        isDark ? AppColors.darkBorder : AppColors.lightBorder;

    return ThemeData(
      useMaterial3: true,
      fontFamily: fontFamily,
      colorScheme: scheme,
      scaffoldBackgroundColor:
          isDark ? AppColors.darkBackground : AppColors.lightBackground,
      splashFactory: InkSparkle.splashFactory,
      appBarTheme: AppBarTheme(
        backgroundColor:
            isDark ? AppColors.darkBackground : AppColors.lightBackground,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        centerTitle: false,
        titleTextStyle: TextStyle(
          fontFamily: fontFamily,
          fontSize: 17,
          fontWeight: FontWeight.w700,
          color: text,
        ),
      ),
      textTheme: TextTheme(
        displaySmall: TextStyle(
            fontSize: 32, fontWeight: FontWeight.w900, color: text, height: 1.15),
        headlineMedium: TextStyle(
            fontSize: 26, fontWeight: FontWeight.w900, color: text, height: 1.2),
        headlineSmall: TextStyle(
            fontSize: 22, fontWeight: FontWeight.w800, color: text, height: 1.25),
        titleLarge: TextStyle(
            fontSize: 19, fontWeight: FontWeight.w800, color: text),
        titleMedium: TextStyle(
            fontSize: 16, fontWeight: FontWeight.w700, color: text),
        titleSmall: TextStyle(
            fontSize: 14, fontWeight: FontWeight.w700, color: text),
        bodyLarge: TextStyle(
            fontSize: 16, fontWeight: FontWeight.w500, color: text, height: 1.5),
        bodyMedium: TextStyle(
            fontSize: 14, fontWeight: FontWeight.w400, color: text, height: 1.5),
        bodySmall: TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.w400,
            color: textMuted,
            height: 1.4),
        labelLarge: TextStyle(
            fontSize: 14, fontWeight: FontWeight.w700, color: text),
        labelMedium: TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.w700,
            color: textMuted,
            letterSpacing: 0.4),
        labelSmall: TextStyle(
            fontSize: 10,
            fontWeight: FontWeight.w800,
            color: textMuted,
            letterSpacing: 0.8),
      ),
      dividerTheme: DividerThemeData(color: border, thickness: 1, space: 1),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor:
            isDark ? AppColors.darkSurfaceLighter : AppColors.lightSurfaceMuted,
        hintStyle: TextStyle(color: textMuted.withOpacity(0.8)),
        contentPadding:
            const EdgeInsets.symmetric(horizontal: 18, vertical: 16),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: BorderSide(color: border),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: BorderSide(color: border),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: const BorderSide(color: AppColors.primary, width: 2),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: const BorderSide(color: AppColors.danger),
        ),
        focusedErrorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: const BorderSide(color: AppColors.danger, width: 2),
        ),
      ),
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          backgroundColor: AppColors.primary,
          foregroundColor: Colors.white,
          disabledBackgroundColor: AppColors.primary.withOpacity(0.45),
          minimumSize: const Size.fromHeight(56),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
          ),
          textStyle: const TextStyle(
            fontFamily: fontFamily,
            fontSize: 16,
            fontWeight: FontWeight.w700,
          ),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: text,
          side: BorderSide(color: border),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
          ),
          minimumSize: const Size.fromHeight(52),
          textStyle: const TextStyle(
            fontFamily: fontFamily,
            fontSize: 15,
            fontWeight: FontWeight.w700,
          ),
        ),
      ),
      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(
          foregroundColor: AppColors.primary,
          textStyle: const TextStyle(
            fontFamily: fontFamily,
            fontWeight: FontWeight.w700,
          ),
        ),
      ),
      cardTheme: CardThemeData(
        color: isDark ? AppColors.darkSurface : AppColors.lightSurface,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(20),
          side: BorderSide(color: border),
        ),
        margin: EdgeInsets.zero,
      ),
      chipTheme: ChipThemeData(
        backgroundColor: AppColors.primarySoft,
        labelStyle: const TextStyle(
          fontFamily: fontFamily,
          fontSize: 12,
          fontWeight: FontWeight.w700,
          color: AppColors.primary,
        ),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(999),
        ),
        side: BorderSide.none,
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 2),
      ),
      snackBarTheme: SnackBarThemeData(
        behavior: SnackBarBehavior.floating,
        backgroundColor: isDark ? AppColors.darkSurfaceLighter : AppColors.lightText,
        contentTextStyle: TextStyle(
          fontFamily: fontFamily,
          fontSize: 14,
          fontWeight: FontWeight.w600,
          color: isDark ? AppColors.darkText : Colors.white,
        ),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(14),
          side: BorderSide(color: border),
        ),
      ),
      bottomSheetTheme: BottomSheetThemeData(
        backgroundColor: isDark ? AppColors.darkSurface : AppColors.lightSurface,
        surfaceTintColor: Colors.transparent,
        shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
        ),
        showDragHandle: true,
      ),
      dialogTheme: DialogThemeData(
        backgroundColor: isDark ? AppColors.darkSurface : AppColors.lightSurface,
        surfaceTintColor: Colors.transparent,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(28),
        ),
      ),
      switchTheme: SwitchThemeData(
        thumbColor: WidgetStateProperty.resolveWith(
          (states) => states.contains(WidgetState.selected)
              ? Colors.white
              : (isDark ? AppColors.darkTextMuted : Colors.white),
        ),
        trackColor: WidgetStateProperty.resolveWith(
          (states) => states.contains(WidgetState.selected)
              ? AppColors.primary
              : (isDark ? AppColors.darkBorder : const Color(0xFFCBD5E1)),
        ),
      ),
      progressIndicatorTheme: const ProgressIndicatorThemeData(
        color: AppColors.primary,
        linearTrackColor: AppColors.primarySoft,
      ),
    );
  }
}
