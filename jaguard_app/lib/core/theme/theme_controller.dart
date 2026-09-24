import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Modo de tema persistente (claro/oscuro/sistema).
enum ThemeModePref { light, dark, system }

class ThemeController extends Notifier<ThemeModePref> {
  static const String _prefKey = 'coex5_theme';

  @override
  ThemeModePref build() {
    _restore();
    return ThemeModePref.system;
  }

  Future<void> _restore() async {
    final SharedPreferences prefs = await SharedPreferences.getInstance();
    final String? saved = prefs.getString(_prefKey);
    if (saved != null) {
      state = ThemeModePref.values
          .firstWhere((ThemeModePref m) => m.name == saved,
              orElse: () => ThemeModePref.system);
    }
  }

  Future<void> set(ThemeModePref mode) async {
    state = mode;
    final SharedPreferences prefs = await SharedPreferences.getInstance();
    await prefs.setString(_prefKey, mode.name);
  }

  /// Conmutador rápido claro/oscuro usado en las pantallas de auth.
  Future<void> setDark(bool dark) =>
      set(dark ? ThemeModePref.dark : ThemeModePref.light);
}

final NotifierProvider<ThemeController, ThemeModePref> themeControllerProvider =
    NotifierProvider<ThemeController, ThemeModePref>(ThemeController.new);

ThemeMode themeModeOf(ThemeModePref pref) => switch (pref) {
      ThemeModePref.light => ThemeMode.light,
      ThemeModePref.dark => ThemeMode.dark,
      ThemeModePref.system => ThemeMode.system,
    };
