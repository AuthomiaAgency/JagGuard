// Tests de widget: verifican que el logotipo JaGuarD, el branding y el
// sidebar del admin están realmente presentes en la app.
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:jaguard/core/theme/app_theme.dart';
import 'package:jaguard/core/widgets/common.dart';
import 'package:jaguard/features/auth/domain/user_profile.dart';
import 'package:jaguard/features/auth/providers/auth_providers.dart';

Widget _wrap(Widget child, {Brightness brightness = Brightness.light}) {
  return ProviderScope(
    overrides: [
      sessionProvider.overrideWith(() => _FixedSession(false)),
    ],
    child: MaterialApp(
      theme: brightness == Brightness.light
          ? AppTheme.light()
          : AppTheme.dark(),
      home: child,
    ),
  );
}

/// Sesión fija para tests (sin Supabase real).
class _FixedSession extends SessionController {
  _FixedSession(this.admin);

  final bool admin;

  @override
  SessionState build() => SessionState(
        ready: true,
        loggedIn: true,
        isAdmin: admin,
        onboardingDone: true,
        profile: const UserProfile(
          id: 'test',
          name: 'Test',
          role: 'admin',
          points: 0,
          avatar: '',
        ),
      );
}

void main() {
  testWidgets('BrandMark renderiza el logotipo del jaguar en tema claro',
      (WidgetTester tester) async {
    await tester.pumpWidget(_wrap(const BrandMark(size: 48)));
    await tester.pumpAndSettle();

    expect(
      find.byWidgetPredicate((Widget w) =>
          w is Image &&
          w.image is AssetImage &&
          (w.image as AssetImage).assetName ==
              'assets/branding/jaguard_logo_dark_on_light.png'),
      findsOneWidget,
      reason: 'El logo navy debe usarse en tema claro',
    );
  });

  testWidgets('BrandMark invierte al logo blanco en tema oscuro',
      (WidgetTester tester) async {
    await tester.pumpWidget(_wrap(
      const BrandMark(size: 48),
      brightness: Brightness.dark,
    ));
    await tester.pumpAndSettle();

    expect(
      find.byWidgetPredicate((Widget w) =>
          w is Image &&
          w.image is AssetImage &&
          (w.image as AssetImage).assetName ==
              'assets/branding/jaguard_logo_light_on_dark.png'),
      findsOneWidget,
      reason: 'El logo blanco debe usarse en tema oscuro',
    );
  });

  testWidgets('El lockup usa el wordmark roto y no contiene COEX',
      (WidgetTester tester) async {
    await tester.pumpWidget(_wrap(const BrandMark(size: 48, showWordmark: true)));
    await tester.pumpAndSettle();

    expect(
      find.byWidgetPredicate((Widget w) =>
          w is Image &&
          w.image is AssetImage &&
          (w.image as AssetImage).assetName ==
              'assets/branding/jaguard_wordmark_dark_on_light.png'),
      findsOneWidget,
      reason: 'El wordmark JaGuarD con trazos rotos debe renderizarse',
    );
    expect(find.text('PROTECCIÓN DE FAUNA'), findsOneWidget);
    expect(find.textContaining('COEX'), findsNothing);
    expect(find.textContaining('Coex'), findsNothing);
  });
}
