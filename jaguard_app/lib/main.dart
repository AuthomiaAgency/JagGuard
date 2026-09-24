import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'core/config/app_config.dart';
import 'core/l10n/translations.dart';
import 'core/router/app_router.dart';
import 'core/services/app_database.dart';
import 'core/services/connectivity_service.dart';
import 'core/theme/app_theme.dart';
import 'core/theme/theme_controller.dart';
import 'features/auth/providers/auth_providers.dart';
import 'features/sync/sync_service.dart';

final Provider<SyncService> syncServiceProvider =
    Provider<SyncService>((Ref ref) => SyncService(ref));

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  await Supabase.initialize(
    url: AppConfig.supabaseUrl,
    publishableKey: AppConfig.supabasePublishableKey,
  );

  // Precalienta la base local (colas offline, caché educativa).
  // En web no existe SQLite: el admin usa datos remotos puros.
  if (!kIsWeb) {
    await AppDatabase.instance.database;
  }

  runApp(const ProviderScope(child: JaguardApp()));
}

/// Raíz de la aplicación: temas, idioma y router con guardas de sesión.
class JaguardApp extends ConsumerStatefulWidget {
  const JaguardApp({super.key});

  @override
  ConsumerState<JaguardApp> createState() => _JaguardAppState();
}

class _JaguardAppState extends ConsumerState<JaguardApp> {
  @override
  void initState() {
    super.initState();
    // Arranca el listener de conectividad y el estado de sesión.
    ref.read(connectivityServiceProvider);
    ref.read(sessionProvider.notifier);
    ref.read(syncServiceProvider);

    // Primer intento de sincronización de colas al abrir con red.
    Future<void>.microtask(() async {
      final ConnectivityService connectivity =
          ref.read(connectivityServiceProvider);
      final bool online = await connectivity.checkNow();
      if (online) {
        await ref.read(syncServiceProvider).syncNow();
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final ThemeModePref themePref = ref.watch(themeControllerProvider);
    final AppLanguage language = ref.watch(languageProvider);
    final GoRouter router = ref.watch(appRouterProvider);

    return MaterialApp.router(
      title: 'JaGuarD',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.light(),
      darkTheme: AppTheme.dark(),
      themeMode: themeModeOf(themePref),
      locale: Locale(language.code),
      routerConfig: router,
      localizationsDelegates: const <LocalizationsDelegate<dynamic>>[
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],
      // qu/ay se resuelven con nuestro sistema propio de traducciones.
      supportedLocales: const <Locale>[
        Locale('es'),
        Locale('en'),
        Locale('pt'),
      ],
    );
  }
}
