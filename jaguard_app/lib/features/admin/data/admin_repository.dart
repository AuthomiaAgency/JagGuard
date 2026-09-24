import 'dart:typed_data';

import 'package:supabase_flutter/supabase_flutter.dart';

import '../../../core/config/app_config.dart';
import '../../learn/domain/guide.dart';
import '../../reports/domain/report.dart';

/// Canje de recompensa.
class Redemption {
  const Redemption({
    required this.id,
    required this.userName,
    required this.contact,
    required this.points,
    required this.status,
    required this.createdAt,
  });

  final String id;
  final String userName;
  final String contact;
  final int points;
  final String status;
  final DateTime createdAt;

  factory Redemption.fromMap(Map<String, dynamic> map) => Redemption(
        id: map['id'] as String,
        userName: (map['user_name'] as String?) ?? '',
        contact: (map['contact'] as String?) ?? '',
        points: (map['points'] as num?)?.toInt() ?? 150,
        status: (map['status'] as String?) ?? 'pending',
        createdAt: DateTime.parse(map['created_at'] as String),
      );
}

/// Mensaje de consulta a especialista.
class InboxMessage {
  const InboxMessage({
    required this.id,
    required this.userName,
    required this.userContact,
    required this.reference,
    required this.message,
    required this.status,
    required this.createdAt,
  });

  final String id;
  final String userName;
  final String userContact;
  final String reference;
  final String message;
  final String status;
  final DateTime createdAt;

  factory InboxMessage.fromMap(Map<String, dynamic> map) => InboxMessage(
        id: map['id'] as String,
        userName: (map['user_name'] as String?) ?? '',
        userContact: (map['user_contact'] as String?) ?? '',
        reference: (map['reference'] as String?) ?? '',
        message: (map['message'] as String?) ?? '',
        status: (map['status'] as String?) ?? 'unread',
        createdAt: DateTime.parse(map['created_at'] as String),
      );
}

/// Agregado de datos del dashboard.
class AdminOverview {
  const AdminOverview({
    required this.reports,
    required this.redemptions,
    required this.messages,
  });

  final List<Report> reports;
  final List<Redemption> redemptions;
  final List<InboxMessage> messages;

  int get totalReports => reports.length;
  int get verifiedCount =>
      reports.where((Report r) => r.status == ReportStatus.verified).length;
  int get pendingRedemptions =>
      redemptions.where((Redemption r) => r.status == 'pending').length;
  List<Report> get recent30 =>
      reports.where((Report r) => r.createdAt
          .isAfter(DateTime.now().subtract(const Duration(days: 30)))).toList();
  int get unreadMessages =>
      messages.where((InboxMessage m) => m.status == 'unread').length;
}

/// Acceso a datos y operaciones de administración.
class AdminRepository {
  AdminRepository(this._client);

  final SupabaseClient _client;

  Future<AdminOverview> fetchOverview() async {
    final List<dynamic> reportRows = await _client
        .from('reports')
        .select()
        .order('created_at', ascending: false);
    final List<dynamic> redemptionRows = await _client
        .from('redemptions')
        .select()
        .order('created_at', ascending: false);
    final List<dynamic> messageRows = await _client
        .from('messages')
        .select()
        .order('created_at', ascending: false);

    return AdminOverview(
      reports: reportRows
          .map((dynamic r) =>
              Report.fromMap(Map<String, dynamic>.from(r as Map)))
          .toList(),
      redemptions: redemptionRows
          .map((dynamic r) =>
              Redemption.fromMap(Map<String, dynamic>.from(r as Map)))
          .toList(),
      messages: messageRows
          .map((dynamic r) =>
              InboxMessage.fromMap(Map<String, dynamic>.from(r as Map)))
          .toList(),
    );
  }

  /// Verifica o rechaza un reporte vía RPC (otorga +10 puntos una vez).
  Future<void> setReportStatus(String reportId, ReportStatus status) =>
      _client.rpc('set_report_status', params: <String, dynamic>{
        'p_report_id': reportId,
        'p_status': status.value,
      });

  /// Aprobar o rechazar un canje.
  Future<void> setRedemptionStatus(String id, String status) =>
      _client.from('redemptions').update(<String, dynamic>{
        'status': status,
      }).eq('id', id);

  Future<void> markMessageRead(String id) =>
      _client.from('messages').update(<String, dynamic>{
        'status': 'read',
      }).eq('id', id);

  // ---------------------------------------------------------------------------
  // CMS: grupos y guías
  // ---------------------------------------------------------------------------

  Future<List<GuideGroup>> fetchGroups() async {
    final List<dynamic> rows = await _client
        .from('guide_groups')
        .select()
        .order('created_at', ascending: true);
    return rows
        .map((dynamic r) =>
            GuideGroup.fromMap(Map<String, dynamic>.from(r as Map)))
        .toList();
  }

  Future<List<Guide>> fetchGuides() async {
    final List<dynamic> rows = await _client
        .from('guides')
        .select('*, guide_groups(name)')
        .order('created_at', ascending: false);
    return rows
        .map((dynamic r) =>
            Guide.fromMap(Map<String, dynamic>.from(r as Map)))
        .toList();
  }

  Future<GuideGroup> createGroup(String name, String icon) async {
    final List<dynamic> rows = await _client
        .from('guide_groups')
        .insert(<String, dynamic>{'name': name, 'icon': icon}).select();
    return GuideGroup.fromMap(Map<String, dynamic>.from(rows.first as Map));
  }

  Future<void> updateGroup(String id, String name, String icon) =>
      _client.from('guide_groups').update(<String, dynamic>{
        'name': name,
        'icon': icon,
      }).eq('id', id);

  Future<void> deleteGroup(String id) =>
      _client.from('guide_groups').delete().eq('id', id);

  Future<Guide> createGuide(Guide guide) async {
    final List<dynamic> rows = await _client.from('guides').insert(<String, dynamic>{
      'title': guide.title,
      'subtitle': guide.subtitle,
      'content': guide.content,
      'group_id': guide.groupId,
      'image_url': guide.imageUrl,
      'video_url': guide.videoUrl,
      'read_time': guide.readTime,
      'files': guide.files.map((GuideFile f) => f.toJson()).toList(),
    }).select('*, guide_groups(name)');
    return Guide.fromMap(Map<String, dynamic>.from(rows.first as Map));
  }

  Future<void> updateGuide(Guide guide) =>
      _client.from('guides').update(<String, dynamic>{
        'title': guide.title,
        'subtitle': guide.subtitle,
        'content': guide.content,
        'group_id': guide.groupId,
        'image_url': guide.imageUrl,
        'video_url': guide.videoUrl,
        'read_time': guide.readTime,
        'files': guide.files.map((GuideFile f) => f.toJson()).toList(),
      }).eq('id', guide.id);

  Future<void> deleteGuide(String id) =>
      _client.from('guides').delete().eq('id', id);

  /// Sube media al bucket `guides-media` y devuelve la URL pública.
  Future<String> uploadMedia(Uint8List bytes, String fileName,
      {required String contentType}) async {
    final String objectPath = 'cms/${DateTime.now().millisecondsSinceEpoch}_$fileName';
    await _client.storage.from(AppConfig.guidesMediaBucket).uploadBinary(
          objectPath,
          bytes,
          fileOptions: FileOptions(contentType: contentType),
        );
    return _client.storage
        .from(AppConfig.guidesMediaBucket)
        .getPublicUrl(objectPath);
  }
}
