import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../features/admin/screens/admin_dashboard_screen.dart';
import '../../features/admin/screens/admin_editor_screen.dart';
import '../../features/auth/providers/auth_providers.dart';
import '../../features/auth/screens/login_screen.dart';
import '../../features/auth/screens/register_screen.dart';
import '../../features/learn/screens/guide_detail_screen.dart';
import '../../features/learn/screens/group_guides_screen.dart';
import '../../features/learn/screens/learn_screen.dart';
import '../../features/onboarding/onboarding_screen.dart';
import '../../features/onboarding/splash_screen.dart';
import '../../features/profile/screens/profile_screen.dart';
import '../../features/profile/screens/profile_settings_screen.dart';
import '../../features/profile/screens/report_history_screen.dart';
import '../../features/reports/screens/home_screen.dart';
import '../../features/reports/screens/report_form_screen.dart';

/// Notificador que refresca el router cuando cambia la sesión.
class RouterRefresher extends ChangeNotifier {
  RouterRefresher(this._ref) {
    _ref.listen(sessionProvider, (_, __) => notifyListeners());
  }

  final Ref _ref;
}

final Provider<RouterRefresher> routerRefresherProvider =
    Provider<RouterRefresher>((Ref ref) {
  final RouterRefresher refresher = RouterRefresher(ref);
  ref.onDispose(refresher.dispose);
  return refresher;
});

final GlobalKey<NavigatorState> rootNavigatorKey =
    GlobalKey<NavigatorState>(debugLabel: 'root');

/// Rutas de la aplicación con guardas de sesión y rol.
final Provider<GoRouter> appRouterProvider = Provider<GoRouter>((Ref ref) {
  return GoRouter(
    navigatorKey: rootNavigatorKey,
    initialLocation: '/',
    refreshListenable: ref.watch(routerRefresherProvider),
    redirect: (BuildContext context, GoRouterState state) {
      final SessionState session = ref.read(sessionProvider);
      if (!session.ready) return '/splash'; // splash mientras restaura sesión

      final String path = state.matchedLocation;
      if (path == '/splash') {
        return session.loggedIn
            ? (session.isAdmin ? '/admin' : (session.onboardingDone ? '/' : '/onboarding'))
            : '/login';
      }
      final bool isAuthRoute = path == '/login' || path == '/register';

      if (!session.loggedIn) {
        return isAuthRoute ? null : '/login';
      }

      if (isAuthRoute) {
        return session.isAdmin ? '/admin' : '/';
      }
      if (!session.onboardingDone) {
        return path == '/onboarding' ? null : '/onboarding';
      }
      if (path == '/onboarding') {
        return session.isAdmin ? '/admin' : '/';
      }
      if (path == '/' && session.isAdmin) return '/admin';
      if (path.startsWith('/admin') && !session.isAdmin) return '/';
      return null;
    },
    routes: <RouteBase>[
      GoRoute(
        path: '/splash',
        builder: (_, __) => const SplashScreen(),
      ),
      GoRoute(
        path: '/login',
        builder: (_, __) => const LoginScreen(),
      ),
      GoRoute(
        path: '/register',
        builder: (_, __) => const RegisterScreen(),
      ),
      GoRoute(
        path: '/onboarding',
        builder: (_, __) => const OnboardingScreen(),
      ),
      GoRoute(
        path: '/',
        builder: (_, __) => const HomeScreen(),
      ),
      GoRoute(
        path: '/report/:type',
        builder: (_, GoRouterState state) =>
            ReportFormScreen(typeId: state.pathParameters['type']!),
      ),
      GoRoute(
        path: '/learn',
        builder: (_, __) => const LearnScreen(),
      ),
      GoRoute(
        path: '/learn/group',
        builder: (_, GoRouterState state) =>
            GroupGuidesScreen(group: state.extra as GuideGroupArgs),
      ),
      GoRoute(
        path: '/learn/guide/:id',
        builder: (_, GoRouterState state) =>
            GuideDetailScreen(guideId: state.pathParameters['id']!),
      ),
      GoRoute(
        path: '/profile',
        builder: (_, __) => const ProfileScreen(),
      ),
      GoRoute(
        path: '/profile/history',
        builder: (_, __) => const ReportHistoryScreen(),
      ),
      GoRoute(
        path: '/profile/settings',
        builder: (_, __) => const ProfileSettingsScreen(),
      ),
      GoRoute(
        path: '/admin',
        builder: (_, __) => const AdminDashboardScreen(),
      ),
      GoRoute(
        path: '/admin/editor',
        builder: (_, __) => const AdminEditorScreen(),
      ),
    ],
    errorBuilder: (_, __) => const HomeScreen(),
  );
});

/// Argumentos de navegación hacia la lista de guías de un grupo.
class GuideGroupArgs {
  const GuideGroupArgs({required this.id, required this.name, this.isOffline = false});

  final String id;
  final String name;
  final bool isOffline;
}
