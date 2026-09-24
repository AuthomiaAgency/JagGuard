import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'generated_translations.dart';

/// Idiomas soportados (paridad con LanguageContext.tsx).
enum AppLanguage {
  spanish('es', 'Español'),
  english('en', 'English'),
  portuguese('pt', 'Português'),
  quechua('qu', 'Quechua'),
  aymara('ay', 'Aymara');

  const AppLanguage(this.code, this.label);

  final String code;
  final String label;

  static AppLanguage fromCode(String? code) => AppLanguage.values
      .firstWhere((l) => l.code == code, orElse: () => AppLanguage.spanish);
}

/// Claves nuevas añadidas en la app móvil (pantallas de autenticación),
/// sin equivalente en el archivo generado. Para quechua/aymara se resuelve
/// el fallback a español automáticamente.
const Map<String, Map<String, String>> _authOverlay = <String, Map<String, String>>{
  'es': <String, String>{
    'auth.welcome': 'Bienvenido',
    'auth.login_subtitle': 'Inicia sesión para continuar.',
    'auth.identity_field': 'Correo o Teléfono',
    'auth.identity_hint': 'Ingresa tu usuario...',
    'auth.password_field': 'Contraseña',
    'auth.password_hint': 'Tu contraseña...',
    'auth.sign_in': 'Iniciar Sesión',
    'auth.no_account': '¿No tienes una cuenta?',
    'auth.register_link': 'Regístrate aquí',
    'auth.field_required': 'Campo obligatorio',
    'auth.create_title': 'Crear Cuenta',
    'auth.create_subtitle': 'Únete a la red de protección de fauna.',
    'auth.name_field': 'Nombre Completo',
    'auth.name_hint': 'Tu nombre...',
    'auth.email_field': 'Correo Electrónico',
    'auth.email_hint': 'tucorreo@email.com',
    'auth.phone_field': 'Número de Teléfono',
    'auth.phone_hint': '999 999 999',
    'auth.phone_note':
        '* Usaremos estos datos para contactarte sobre tus reportes.',
    'auth.create': 'Crear Cuenta',
    'auth.have_account': '¿Ya tienes cuenta?',
    'auth.login_link': 'Inicia sesión',
    'auth.terms_prefix': 'Acepto los',
    'auth.terms_link': 'Términos y Condiciones',
    'auth.terms_mid': 'y la',
    'auth.privacy_link': 'Política de Privacidad',
    'auth.terms_error':
        'Debes aceptar los Términos y Condiciones para continuar.',
    'auth.incomplete': 'Por favor completa todos los campos',
    'admin.panel_section': 'GESTIÓN',
    'splash.tagline': 'CONSERVACIÓN · FAUNA · COMUNIDAD',
    'home.title': 'Reportar Evento',
    'home.subtitle':
        'Selecciona una categoría para registrar actividad en el campo.',
    'offline.banner': 'Sin conexión — los reportes se guardan en tu dispositivo',
    'offline.syncing': 'Sincronizando reportes pendientes...',
    'offline.pending': '{count} reporte(s) esperando sincronización',
    'report.offline_warning':
        'Sin conexión — el reporte se guardará en tu dispositivo y se enviará al recuperar señal.',
    'report.notes': 'Observaciones',
    'report.notes_placeholder':
        'Describe la situación: número de animales, contexto, daños...',
    'report.offline_saved_title': 'Reporte Guardado',
    'report.offline_saved_desc':
        'Se guardó en tu dispositivo. Se enviará automáticamente cuando recuperes conexión.',
    'learn.no_guides': 'No hay publicaciones disponibles todavía.',
    'learn.no_saved': 'Aún no has guardado guías para leer sin conexión.',
    'learn.share_text_prefix': 'Mira este artículo de',
    'learn.query_sent':
        'Tu consulta ha sido enviada. Un especialista te contactará pronto.',
    'learn.offline_cache_notice':
        'Sin conexión: estás viendo una versión en caché. Las imágenes y videos pueden no cargar.',
    'profile.redeem_success': '¡Canje solicitado!',
    'profile.redeem_success_desc':
        'Se evaluará la calidad de tus puntos y te contactaremos por el medio indicado.',
    'profile.insufficient_points': 'Aún no tienes los puntos suficientes.',
    'admin.approve': 'Aprobar',
    'admin.reject': 'Rechazar',
    'admin.anonymous': 'Anónimo',
    'admin.user': 'Usuario',
    'admin.contact': 'Contacto',
    'admin.date': 'Fecha',
    'admin.status_verified': 'Verificado',
    'admin.status_denied': 'Denegado',
    'admin.status_pending': 'Pendiente',
    'admin.status_approved': 'Aprobado',
    'admin.status_rejected': 'Rechazado',
    'admin.pending_reports': 'Reportes pendientes (30 días)',
    'admin.report_history': 'Historial de reportes',
    'admin.verified_reports_30': 'Verificados (30 días)',
    'admin.redemption_requests': 'Solicitudes de canje',
    'admin.no_data': 'No hay datos para mostrar.',
    'editor.cancel': 'Cancelar',
    'editor.save': 'Guardar',
    'editor.edit': 'Editar',
    'editor.preview': 'Vista previa',
    'editor.publish': 'Publicar',
    'editor.no_groups': 'Sin grupos creados.',
    'editor.title': 'Editor de Contenido',
    'editor.groups': 'Grupos',
    'editor.guides': 'Publicaciones',
    'editor.create_group': 'Crear grupo',
    'editor.edit_group': 'Editar grupo',
    'editor.create_guide': 'Nueva publicación',
    'editor.edit_guide': 'Editar publicación',
    'editor.group_name': 'Nombre del grupo',
    'editor.group_icon': 'Icono',
    'editor.guide_title': 'Título',
    'editor.guide_subtitle': 'Subtítulo',
    'editor.guide_group': 'Grupo',
    'editor.guide_read_time': 'Lectura (min)',
    'editor.guide_image': 'Portada (imagen)',
    'editor.guide_video': 'Portada (video)',
    'editor.guide_content': 'Contenido',
    'editor.actions': 'Acciones',
    'editor.personalization': 'Personalización',
    'editor.required_fields': 'Título, contenido y grupo son obligatorios',
    'editor.guide_saved': 'Publicación guardada',
    'editor.guide_error': 'Error al guardar la publicación',
  },
  'en': <String, String>{
    'editor.edit': 'Edit',
    'editor.required_fields': 'Title, content and group are required',
    'editor.guide_saved': 'Post saved',
    'editor.guide_error': 'Error saving post',
    'onboarding.slide_tracks_title': 'Measure with references',
    'onboarding.slide_tracks_desc': 'Include an object for scale when photographing tracks.',
    'auth.welcome': 'Welcome',
    'auth.login_subtitle': 'Sign in to continue.',
    'auth.identity_field': 'Email or Phone',
    'auth.identity_hint': 'Enter your user...',
    'auth.password_field': 'Password',
    'auth.password_hint': 'Your password...',
    'auth.sign_in': 'Sign In',
    'auth.no_account': "Don't have an account?",
    'auth.register_link': 'Register here',
    'auth.field_required': 'Required field',
    'auth.create_title': 'Create Account',
    'auth.create_subtitle': 'Join the wildlife protection network.',
    'auth.name_field': 'Full Name',
    'auth.name_hint': 'Your name...',
    'auth.email_field': 'Email',
    'auth.email_hint': 'you@email.com',
    'auth.phone_field': 'Phone Number',
    'auth.phone_hint': '999 999 999',
    'auth.phone_note': '* We will use this data to contact you about your reports.',
    'auth.create': 'Create Account',
    'auth.have_account': 'Already have an account?',
    'auth.login_link': 'Sign in',
    'auth.terms_prefix': 'I accept the',
    'auth.terms_link': 'Terms and Conditions',
    'auth.terms_mid': 'and the',
    'auth.privacy_link': 'Privacy Policy',
    'auth.terms_error': 'You must accept the Terms and Conditions to continue.',
    'auth.incomplete': 'Please complete all fields',
  },
  'pt': <String, String>{
    'editor.edit': 'Editar',
    'editor.required_fields': 'Título, conteúdo e grupo são obrigatórios',
    'editor.guide_saved': 'Publicação salva',
    'editor.guide_error': 'Erro ao salvar a publicação',
    'onboarding.slide_tracks_title': 'Meça com referências',
    'onboarding.slide_tracks_desc': 'Inclua um objeto de escala ao fotografar pegadas.',
    'auth.welcome': 'Bem-vindo',
    'auth.login_subtitle': 'Entre para continuar.',
    'auth.identity_field': 'E-mail ou Telefone',
    'auth.identity_hint': 'Digite seu usuário...',
    'auth.password_field': 'Senha',
    'auth.password_hint': 'Sua senha...',
    'auth.sign_in': 'Entrar',
    'auth.no_account': 'Não tem uma conta?',
    'auth.register_link': 'Registre-se aqui',
    'auth.field_required': 'Campo obrigatório',
    'auth.create_title': 'Criar Conta',
    'auth.create_subtitle': 'Junte-se à rede de proteção da fauna.',
    'auth.name_field': 'Nome Completo',
    'auth.name_hint': 'Seu nome...',
    'auth.email_field': 'E-mail',
    'auth.email_hint': 'voce@email.com',
    'auth.phone_field': 'Número de Telefone',
    'auth.phone_hint': '999 999 999',
    'auth.phone_note':
        '* Usaremos esses dados para contatar você sobre seus relatórios.',
    'auth.create': 'Criar Conta',
    'auth.have_account': 'Já tem uma conta?',
    'auth.login_link': 'Entrar',
    'auth.terms_prefix': 'Aceito os',
    'auth.terms_link': 'Termos e Condições',
    'auth.terms_mid': 'e a',
    'auth.privacy_link': 'Política de Privacidade',
    'auth.terms_error':
        'Você deve aceitar os Termos e Condições para continuar.',
    'auth.incomplete': 'Por favor, preencha todos os campos',
  },
};


/// Claves faltantes en quechua/aymara (estructuralmente heredan español).
const Map<String, Map<String, String>> _extraOverlay = <String, Map<String, String>>{
  'qu': <String, String>{
    'editor.edit': 'Allichay',
    'onboarding.slide_tracks_title': 'Referenciawan tupuchiy',
    'onboarding.slide_tracks_desc':
        'Siqikunata hapiypti referenciata churanayki.',
    'editor.required_fields': 'Suti, willay huk qupallasqa kanan',
    'editor.guide_saved': 'Willay waqaychasqa',
    'editor.guide_error': 'Pantasqa willayta waqaychay',
  },
  'ay': <String, String>{
    'editor.edit': 'Editar',
    'onboarding.slide_tracks_title': 'Referencia ukxaruña',
    'onboarding.slide_tracks_desc':
        'Laphinakaphi referencia churaniwa siqiñañataki.',
    'editor.required_fields': 'Suti, qillqa ukat obligatorio',
    'editor.guide_saved': 'Qillqa waqaytata',
    'editor.guide_error': 'Jan wali qillqa waqaymaña',
  },
};

/// Resuelve claves de traducción con interpolación de parámetros
/// `{points}`, `{count}`, `{time}`; cae a español y luego a la clave.
String translate(String languageCode, String key, [Map<String, dynamic>? params]) {
  String? lookup(String code) =>
      _authOverlay[code]?[key] ??
      _extraOverlay[code]?[key] ??
      GeneratedTranslations.messages[code]?[key];

  String text = lookup(languageCode) ?? lookup('es') ?? key;
  params?.forEach((String name, dynamic value) {
    text = text.replaceAll('{$name}', '$value');
  });
  return text;
}

/// Controlador persistente del idioma activo.
class LanguageController extends Notifier<AppLanguage> {
  static const String _prefKey = 'coex5_language';

  @override
  AppLanguage build() {
    _restore();
    return AppLanguage.spanish;
  }

  Future<void> _restore() async {
    final SharedPreferences prefs = await SharedPreferences.getInstance();
    state = AppLanguage.fromCode(prefs.getString(_prefKey));
  }

  Future<void> set(AppLanguage language) async {
    state = language;
    final SharedPreferences prefs = await SharedPreferences.getInstance();
    await prefs.setString(_prefKey, language.code);
  }

  String t(String key, [Map<String, dynamic>? params]) =>
      translate(state.code, key, params);
}

final NotifierProvider<LanguageController, AppLanguage> languageProvider =
    NotifierProvider<LanguageController, AppLanguage>(LanguageController.new);
