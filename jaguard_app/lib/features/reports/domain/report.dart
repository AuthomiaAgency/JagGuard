
import '../../../../core/utils/formatters.dart';
import '../../auth/domain/user_profile.dart';

/// Estado de un reporte.
enum ReportStatus { pending, verified, denied }

extension ReportStatusX on ReportStatus {
  String get value => switch (this) {
        ReportStatus.pending => 'pending',
        ReportStatus.verified => 'verified',
        ReportStatus.denied => 'denied',
      };

  static ReportStatus from(String? value) => switch (value) {
        'verified' => ReportStatus.verified,
        'denied' => ReportStatus.denied,
        _ => ReportStatus.pending,
      };
}

/// Categorías de reporte de la pantalla principal (Home).
enum ReportType {
  avistamiento('avistamiento', 'Avistamiento', 'eye'),
  huella('huella', 'Huella', 'paw'),
  depredacion('depredacion', 'Depredación', 'skull'),
  atropellamiento('atropellamiento', 'Atropellamiento de Fauna', 'car'),
  trafico('trafico', 'Tráfico de Especies', 'package-x'),
  matanza('matanza', 'Matanza por Retaliación', 'alert');

  const ReportType(this.id, this.label, this.iconKey);

  final String id;
  final String label;
  final String iconKey;

  static ReportType? tryFromId(String? id) {
    for (final ReportType type in ReportType.values) {
      if (type.id == id) return type;
    }
    return null;
  }
}

/// Especies seleccionables en el formulario.
enum AnimalOption {
  jaguar('jaguar', 'report.jaguar', 'report.jaguar_desc'),
  puma('puma', 'report.puma', 'report.puma_desc'),
  otros('otros', 'report.other', 'report.other_desc'),
  desconocido('desconocido', 'report.unknown', 'report.unknown_desc');

  const AnimalOption(this.id, this.labelKey, this.descKey);

  final String id;
  final String labelKey;
  final String descKey;
}

/// Modelo de la tabla `reports`.
class Report {
  const Report({
    required this.id,
    required this.type,
    required this.animal,
    required this.lat,
    required this.lng,
    required this.status,
    required this.createdAt,
    this.userId,
    this.userName,
    this.userContact,
    this.specificAnimal,
    this.notes,
    this.locationName,
    this.photoUrl,
    this.anonymous = false,
  });

  final String id;
  final String? userId;
  final String? userName;
  final String? userContact;
  final String type;
  final String animal;
  final String? specificAnimal;
  final String? notes;
  final double lat;
  final double lng;
  final String? locationName;
  final String? photoUrl;
  final bool anonymous;
  final ReportStatus status;
  final DateTime createdAt;

  String get displayAnimal {
    if (animal == 'otros' &&
        specificAnimal != null &&
        specificAnimal!.trim().isNotEmpty) {
      return specificAnimal!;
    }
    return animal;
  }

  factory Report.fromMap(Map<String, dynamic> map) => Report(
        id: map['id'] as String,
        userId: map['user_id'] as String?,
        userName: map['user_name'] as String?,
        userContact: map['user_contact'] as String?,
        type: (map['type'] as String?) ?? 'avistamiento',
        animal: (map['animal'] as String?) ?? 'desconocido',
        specificAnimal: map['specific_animal'] as String?,
        notes: map['notes'] as String?,
        lat: (map['lat'] as num).toDouble(),
        lng: (map['lng'] as num).toDouble(),
        locationName: map['location_name'] as String?,
        photoUrl: map['photo_url'] as String?,
        anonymous: (map['anonymous'] as bool?) ?? false,
        status: ReportStatusX.from(map['status'] as String?),
        createdAt: Formatters.parseDate(map['created_at']),
      );
}

/// Payload serializable de la cola offline.
/// `localPhotoPath` apunta al archivo comprimido en el dispositivo y se
/// elimina del payload antes de enviarlo al servidor.
class PendingReportPayload {
  PendingReportPayload({
    required this.id,
    required this.userId,
    required this.userName,
    required this.userContact,
    required this.type,
    required this.animal,
    required this.lat,
    required this.lng,
    this.specificAnimal,
    this.notes,
    this.locationName,
    this.localPhotoPath,
    this.anonymous = false,
  });

  final String id;
  final String userId;
  final String userName;
  final String userContact;
  final String type;
  final String animal;
  final String? specificAnimal;
  final String? notes;
  final double lat;
  final double lng;
  final String? locationName;
  final String? localPhotoPath;
  final bool anonymous;

  Map<String, dynamic> toJson() => {
        'id': id,
        'user_id': userId,
        'user_name': userName,
        'user_contact': userContact,
        'type': type,
        'animal': animal,
        'specific_animal': specificAnimal,
        'notes': notes,
        'lat': lat,
        'lng': lng,
        'location_name': locationName,
        'local_photo_path': localPhotoPath,
        'anonymous': anonymous,
      };

  factory PendingReportPayload.fromJson(Map<String, dynamic> json) =>
      PendingReportPayload(
        id: json['id'] as String,
        userId: (json['user_id'] as String?) ?? '',
        userName: (json['user_name'] as String?) ?? 'Usuario',
        userContact: (json['user_contact'] as String?) ?? '',
        type: (json['type'] as String?) ?? 'avistamiento',
        animal: (json['animal'] as String?) ?? 'desconocido',
        specificAnimal: json['specific_animal'] as String?,
        notes: json['notes'] as String?,
        lat: (json['lat'] as num).toDouble(),
        lng: (json['lng'] as num).toDouble(),
        locationName: json['location_name'] as String?,
        localPhotoPath: json['local_photo_path'] as String?,
        anonymous: (json['anonymous'] as bool?) ?? false,
      );

  /// Mapa para la RPC `submit_report` (sin campos locales).
  Map<String, dynamic> toRpcParams(String? photoUrl) => {
        'p_type': type,
        'p_animal': animal,
        'p_lat': lat,
        'p_lng': lng,
        'p_specific_animal': specificAnimal,
        'p_notes': notes,
        'p_location_name': locationName,
        'p_photo_url': photoUrl,
        'p_anonymous': anonymous,
      };

  /// Mapa para inserción directa en `reports` (fallback sin RPC).
  Map<String, dynamic> toInsertRow(String? photoUrl) => {
        'user_id': userId,
        'user_name': userName,
        'user_contact': userContact,
        'type': type,
        'animal': animal,
        'specific_animal': specificAnimal,
        'notes': notes,
        'lat': lat,
        'lng': lng,
        'location_name': locationName,
        'photo_url': photoUrl,
        'anonymous': anonymous,
        'status': 'pending',
      };
}

/// Utilidad para construir el perfil a partir de una respuesta Supabase.
UserProfile profileFromRow(Map<String, dynamic> row) =>
    UserProfile.fromMap(row);
