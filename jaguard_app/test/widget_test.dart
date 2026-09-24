// Smoke test mínimo: verifica que el sistema de traducciones resuelve
// claves con interpolación y fallback correcto.
import 'package:flutter_test/flutter_test.dart';

import 'package:jaguard/core/l10n/generated_translations.dart';
import 'package:jaguard/core/l10n/translations.dart';

void main() {
  test('translate resuelve claves en español', () {
    expect(
      translate('es', 'nav.report'),
      equals(GeneratedTranslations.messages['es']!['nav.report']),
    );
  });

  test('translate hace fallback a español para claves nuevas', () {
    expect(translate('qu', 'auth.welcome'), equals('Bienvenido'));
  });

  test('translate interpola parámetros', () {
    final String result = translate(
      'es',
      'profile.redeem_missing',
      <String, dynamic>{'points': 30},
    );
    expect(result, contains('30'));
  });

  test('las 5 lenguas resuelven las claves críticas sin fallback crudo', () {
    const List<String> criticalKeys = <String>[
      'nav.report',
      'nav.learn',
      'nav.profile',
      'report.identification',
      'report.send',
      'profile.redeem',
      'admin.dashboard',
      'editor.edit',
      'onboarding.start',
      'onboarding.slide_tracks_title',
      'learn.title',
      'auth.welcome',
    ];
    for (final String code in <String>['es', 'en', 'pt', 'qu', 'ay']) {
      for (final String key in criticalKeys) {
        expect(
          translate(code, key),
          isNot(equals(key)),
          reason: 'Clave $key sin traducción en $code',
        );
      }
    }
  });
}
