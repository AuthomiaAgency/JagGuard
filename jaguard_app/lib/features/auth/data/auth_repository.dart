import 'package:supabase_flutter/supabase_flutter.dart';

import '../../../core/utils/formatters.dart' show Validators;
import '../domain/user_profile.dart';

/// Excepciones de dominio con mensajes listos para mostrar al usuario.
class AuthFailure implements Exception {
  AuthFailure(this.message);
  final String message;
  @override
  String toString() => message;
}

/// Acceso a autenticación y perfiles (Supabase Auth + tabla `profiles`).
class AuthRepository {
  AuthRepository(this._client);

  final SupabaseClient _client;

  GoTrueClient get _auth => _client.auth;

  /// Sesión activa, o `null`.
  Session? get currentSession => _auth.currentSession;

  /// Stream de cambios de sesión (login, logout, refresh).
  Stream<AuthState> get onAuthStateChange => _auth.onAuthStateChange;

  /// Lee el perfil del usuario autenticado.
  Future<UserProfile?> fetchProfile(String uid) async {
    final List<dynamic> rows = await _client
        .from('profiles')
        .select()
        .eq('id', uid)
        .limit(1);
    if (rows.isEmpty) return null;
    return UserProfile.fromMap(Map<String, dynamic>.from(rows.first as Map));
  }

  /// Inicia sesión con correo **o** teléfono.
  ///
  /// El teléfono se resuelve en el servidor vía la RPC `resolve_login_email`
  /// (mejora: la web construía correos falsos en el cliente).
  Future<UserProfile> login(String input, String password) async {
    String email = input.trim();

    if (!email.contains('@') && Validators.isPhoneLike(email)) {
      final dynamic resolved = await _client.rpc(
        'resolve_login_email',
        params: {'p_input': email},
      );
      final String? resolvedEmail = resolved is String ? resolved : null;
      if (resolvedEmail == null || resolvedEmail.isEmpty) {
        throw AuthFailure(
            'No encontramos una cuenta con ese teléfono. Intenta con tu correo.');
      }
      email = resolvedEmail;
    }

    try {
      await _auth.signInWithPassword(email: email, password: password);
    } on AuthApiException catch (e) {
      throw AuthFailure(_mapAuthError(e));
    } catch (_) {
      throw AuthFailure('Error al iniciar sesión. Verifica tu conexión.');
    }

    final UserProfile? profile = await fetchProfile(_auth.currentUser!.id);
    if (profile == null) {
      // Perfil huérfano (cuenta sin trigger): lo reconstruimos con lo mínimo.
      final User user = _auth.currentUser!;
      final UserProfile fallback = UserProfile(
        id: user.id,
        name: (user.userMetadata?['name'] as String?) ?? 'Usuario',
        email: user.email,
        phone: user.phone,
        contact: user.email,
        role: 'user',
        points: 0,
        avatar: 'https://api.dicebear.com/7.x/notionists-neutral/svg?seed=${user.id}',
      );
      await _client.from('profiles').upsert({
        'id': fallback.id,
        'name': fallback.name,
        'email': fallback.email,
        'contact': fallback.contact,
        'avatar': fallback.avatar,
      });
      return fallback;
    }
    return profile;
  }

  /// Registra una cuenta nueva y devuelve el perfil creado por el trigger.
  Future<UserProfile> register({
    required String name,
    required String email,
    required String countryCode,
    required String phone,
    required String password,
  }) async {
    final String fullPhone = '$countryCode${phone.replaceAll(RegExp(r'\s'), '')}';
    final String avatar =
        'https://api.dicebear.com/7.x/notionists-neutral/svg?seed=${Uri.encodeComponent(email)}';

    try {
      final AuthResponse response = await _auth.signUp(
        email: email.trim(),
        password: password,
        data: {'name': name.trim(), 'phone': fullPhone, 'avatar': avatar},
      );
      final User? user = response.user;
      if (user == null) {
        throw AuthFailure('No se pudo crear la cuenta. Intenta nuevamente.');
      }

      // El trigger `handle_new_user` ya creó el perfil; lo leemos.
      final UserProfile? profile = await fetchProfile(user.id);
      if (profile != null) return profile;

      // RLS permite insertar el propio perfil con role='user'.
      final List<dynamic> rows = await _client
          .from('profiles')
          .upsert({
            'id': user.id,
            'name': name.trim(),
            'email': email.trim(),
            'phone': fullPhone,
            'contact': email.trim(),
            'avatar': avatar,
          })
          .select();
      return UserProfile.fromMap(Map<String, dynamic>.from(rows.first as Map));
    } on AuthApiException catch (e) {
      throw AuthFailure(_mapAuthError(e));
    } on AuthFailure {
      rethrow;
    } catch (_) {
      throw AuthFailure('Error al registrar. Verifica tu conexión.');
    }
  }

  Future<void> signOut() => _auth.signOut();

  /// Cambia la contraseña del usuario autenticado.
  Future<void> updatePassword(String newPassword) async {
    try {
      await _auth.updateUser(UserAttributes(password: newPassword));
    } on AuthApiException catch (e) {
      throw AuthFailure(_mapAuthError(e));
    } catch (_) {
      throw AuthFailure('Error al actualizar la contraseña.');
    }
  }

  /// Actualiza nombre y avatar del perfil.
  Future<UserProfile> updateProfileData(
      String uid, String name, String avatar) async {
    final List<dynamic> rows = await _client
        .from('profiles')
        .update({'name': name.trim(), 'avatar': avatar})
        .eq('id', uid)
        .select();
    return UserProfile.fromMap(Map<String, dynamic>.from(rows.first as Map));
  }

  String _mapAuthError(AuthApiException e) {
    final String code = e.code ?? e.message.toLowerCase();
    if (code.contains('email_not_confirmed')) {
      return 'Debes confirmar tu correo antes de iniciar sesión.';
    }
    if (code.contains('invalid_credentials') ||
        code.contains('user_not_found') ||
        code.contains('invalid login')) {
      return 'Credenciales incorrectas. Verifica tu correo/teléfono y contraseña.';
    }
    if (code.contains('email_address_already_in_use') ||
        code.contains('already registered') ||
        code.contains('user_already_exists')) {
      return 'El correo ya está registrado.';
    }
    if (code.contains('weak_password')) {
      return 'La contraseña debe tener al menos 6 caracteres.';
    }
    if (code.contains('invalid_email') ||
        code.contains('unable to validate email')) {
      return 'El correo no es válido.';
    }
    if (code.contains('over_request_rate_limit') || code.contains('rate limit')) {
      return 'Demasiados intentos. Espera un momento e intenta de nuevo.';
    }
    return 'Credenciales incorrectas. Verifica tus datos e intenta de nuevo.';
  }
}
