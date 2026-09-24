import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../data/auth_repository.dart';
import '../domain/user_profile.dart';

/// Cliente Supabase compartido.
final Provider<SupabaseClient> supabaseClientProvider =
    Provider<SupabaseClient>((Ref ref) => Supabase.instance.client);

/// Repositorio de autenticación.
final Provider<AuthRepository> authRepositoryProvider =
    Provider<AuthRepository>(
        (Ref ref) => AuthRepository(ref.watch(supabaseClientProvider)));

/// Estado global de sesión usado por el router y la UI.
class SessionState {
  const SessionState({
    required this.ready,
    required this.loggedIn,
    required this.isAdmin,
    required this.onboardingDone,
    this.profile,
  });

  const SessionState.initial()
      : ready = false,
        loggedIn = false,
        isAdmin = false,
        onboardingDone = true,
        profile = null;

  final bool ready;
  final bool loggedIn;
  final bool isAdmin;
  final bool onboardingDone;
  final UserProfile? profile;

  SessionState copyWith({
    bool? ready,
    bool? loggedIn,
    bool? isAdmin,
    bool? onboardingDone,
    UserProfile? profile,
    bool clearProfile = false,
  }) =>
      SessionState(
        ready: ready ?? this.ready,
        loggedIn: loggedIn ?? this.loggedIn,
        isAdmin: isAdmin ?? this.isAdmin,
        onboardingDone: onboardingDone ?? this.onboardingDone,
        profile: clearProfile ? null : (profile ?? this.profile),
      );
}

/// Controlador de sesión: restaura el estado, escucha cambios de auth
/// y expone acciones de login/registro/logout.
class SessionController extends Notifier<SessionState> {
  static const String _onboardingKey = 'coex5_onboarding_done';

  @override
  SessionState build() {
    _bootstrap();
    _listenAuthStream();
    return const SessionState.initial();
  }

  Future<void> _bootstrap() async {
    final SharedPreferences prefs = await SharedPreferences.getInstance();
    final bool onboardingDone = prefs.getBool(_onboardingKey) ?? false;

    final AuthRepository repo = ref.read(authRepositoryProvider);
    final Session? session = repo.currentSession;
    UserProfile? profile;
    if (session != null) {
      profile = await _safeFetchProfile(session.user.id);
    }

    state = state.copyWith(
      ready: true,
      loggedIn: session != null,
      isAdmin: profile?.isAdmin ?? false,
      onboardingDone: onboardingDone,
      profile: profile,
      clearProfile: profile == null,
    );
  }

  /// Reacciona a login/logout/refresh de tokens.
  void _listenAuthStream() {
    final AuthRepository repo = ref.read(authRepositoryProvider);
    repo.onAuthStateChange.listen((AuthState authState) async {
      final bool hasSession = authState.session != null;
      if (hasSession) {
        final UserProfile? profile =
            await _safeFetchProfile(authState.session!.user.id);
        state = state.copyWith(
          loggedIn: true,
          isAdmin: profile?.isAdmin ?? false,
          profile: profile,
          clearProfile: profile == null,
        );
      } else {
        state = state.copyWith(
          loggedIn: false,
          isAdmin: false,
          profile: null,
          clearProfile: true,
        );
      }
    });
  }

  Future<UserProfile?> _safeFetchProfile(String uid) async {
    try {
      return await ref.read(authRepositoryProvider).fetchProfile(uid);
    } catch (_) {
      return null;
    }
  }

  /// Refresca el perfil desde el servidor (puntos, rol, avatar).
  Future<void> refreshProfile() async {
    final AuthRepository repo = ref.read(authRepositoryProvider);
    final Session? session = repo.currentSession;
    if (session == null) return;
    final UserProfile? profile = await _safeFetchProfile(session.user.id);
    if (profile != null) {
      state = state.copyWith(profile: profile, isAdmin: profile.isAdmin);
    }
  }

  /// Actualización local optimista de puntos (+10 por reporte, etc.).
  void adjustPoints(int delta) {
    final UserProfile? current = state.profile;
    if (current == null) return;
    state = state.copyWith(
      profile: current.copyWith(points: current.points + delta),
    );
  }

  Future<void> login(String input, String password) async {
    final AuthRepository repo = ref.read(authRepositoryProvider);
    final UserProfile profile = await repo.login(input, password);
    state = state.copyWith(
      loggedIn: true,
      isAdmin: profile.isAdmin,
      profile: profile,
    );
  }

  Future<void> register({
    required String name,
    required String email,
    required String countryCode,
    required String phone,
    required String password,
  }) async {
    final AuthRepository repo = ref.read(authRepositoryProvider);
    final UserProfile profile = await repo.register(
      name: name,
      email: email,
      countryCode: countryCode,
      phone: phone,
      password: password,
    );
    state = state.copyWith(
      loggedIn: true,
      isAdmin: profile.isAdmin,
      profile: profile,
      onboardingDone: false,
    );
  }

  Future<void> logout() async {
    await ref.read(authRepositoryProvider).signOut();
    state = state.copyWith(
      loggedIn: false,
      isAdmin: false,
      profile: null,
      clearProfile: true,
    );
  }

  Future<void> updateProfileData(String name, String avatar) async {
    final UserProfile? current = state.profile;
    if (current == null) return;
    final AuthRepository repo = ref.read(authRepositoryProvider);
    final UserProfile updated =
        await repo.updateProfileData(current.id, name, avatar);
    state = state.copyWith(profile: updated, isAdmin: updated.isAdmin);
  }

  Future<void> completeOnboarding() async {
    final SharedPreferences prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_onboardingKey, true);
    state = state.copyWith(onboardingDone: true);
  }

  /// Reabre el tutorial desde Perfil.
  Future<void> replayOnboarding() async {
    final SharedPreferences prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_onboardingKey, false);
    state = state.copyWith(onboardingDone: false);
  }
}

final NotifierProvider<SessionController, SessionState> sessionProvider =
    NotifierProvider<SessionController, SessionState>(SessionController.new);
