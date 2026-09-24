/// Configuración central de la aplicación.
///
/// Los valores se inyectan en tiempo de compilación con `--dart-define`
/// (o `--dart-define-from-file=env.json`) y cuentan con valores por
/// defecto funcionales para desarrollo local.
///
/// Ejemplo:
/// ```
/// flutter run \
///   --dart-define=SUPABASE_URL=https://xxx.supabase.co \
///   --dart-define=SUPABASE_ANON_KEY=sb_publishable_xxx \
///   --dart-define=MAPS_API_KEY=AIza...
/// ```
abstract final class AppConfig {
  /// URL del proyecto Supabase "Jaguard".
  static const String supabaseUrl = String.fromEnvironment(
    'SUPABASE_URL',
    defaultValue: 'https://wxrgitoukbowtygfyrel.supabase.co',
  );

  /// Clave pública del proyecto Supabase.
  /// Es segura de incluir en el cliente: la seguridad real la aplican
  /// las políticas RLS del servidor.
  static const String supabaseAnonKey = String.fromEnvironment(
    'SUPABASE_ANON_KEY',
    defaultValue:
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4cmdpdG91a2Jvd3R5Z2Z5cmVsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg3MzM5MTgsImV4cCI6MjEwNDMwOTkxOH0.QFYvGF1TSiyPyPHmb77B6fa8VBhiFXSufbVlWP86tWs',
  );

  /// Clave publishable moderna (reemplazo del formato anon JWT).
  static const String supabasePublishableKey = String.fromEnvironment(
    'SUPABASE_PUBLISHABLE_KEY',
    defaultValue: 'sb_publishable_YqA1gRUuMU0jcFUp3lPCnQ_POlLhSzY',
  );

  /// API key de Google Maps para Android/iOS.
  /// En Android también se admite la variable de entorno `GMAPS_API_KEY`
  /// inyectada por Gradle en el AndroidManifest.
  static const String googleMapsApiKey = String.fromEnvironment(
    'MAPS_API_KEY',
    defaultValue: '',
  );

  /// Umbral de puntos para canjear una recompensa.
  static const int redeemGoalPoints = 150;

  /// Puntos otorgados por reporte creado / reporte verificado.
  static const int pointsPerReport = 10;

  /// Correo de soporte visible en el perfil.
  static const String supportEmail = 'luiscbwwf@gmail.com';

  /// Nombre del bucket de Storage para evidencias de reportes.
  static const String reportsBucket = 'reports';

  /// Nombre del bucket de Storage para media del CMS.
  static const String guidesMediaBucket = 'guides-media';
}
