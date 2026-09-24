import 'package:supabase_flutter/supabase_flutter.dart';

import '../../../core/services/app_database.dart';
import '../domain/guide.dart';

/// Acceso al contenido educativo con caché local offline-first.
class LearnRepository {
  LearnRepository(this._client, this._db);

  final SupabaseClient _client;
  final AppDatabase _db;

  /// Grupos + guías: intenta red y cachea; si no hay red, sirve caché.
  Future<({List<GuideGroup> groups, List<Guide> guides})> fetchContent(
      {required bool online}) async {
    if (online) {
      try {
        final List<dynamic> groupRows = await _client
            .from('guide_groups')
            .select()
            .order('created_at', ascending: true);
        final List<dynamic> guideRows = await _client
            .from('guides')
            .select('*, guide_groups(name)')
            .order('created_at', ascending: false);

        final List<GuideGroup> groups = groupRows
            .map((dynamic r) =>
                GuideGroup.fromMap(Map<String, dynamic>.from(r as Map)))
            .toList();
        final List<Guide> guides = guideRows
            .map((dynamic r) =>
                Guide.fromMap(Map<String, dynamic>.from(r as Map)))
            .toList();

        await _db.cacheGroups(
            groups.map((GuideGroup g) => <String, dynamic>{
                  'id': g.id,
                  'name': g.name,
                  'icon': g.icon
                }).toList());
        await _db
            .cacheGuides(guides.map((Guide g) => g.toJson()).toList());

        return (groups: groups, guides: guides);
      } catch (_) {
        // Red caída a mitad de la consulta: caemos a caché.
      }
    }

    final List<Map<String, dynamic>> cachedGroups = await _db.cachedGroups();
    final List<Map<String, dynamic>> cachedGuides = await _db.cachedGuides();
    return (
      groups: cachedGroups
          .map((Map<String, dynamic> m) => GuideGroup.fromMap(m))
          .toList(),
      guides: cachedGuides.map((Map<String, dynamic> m) => Guide.fromMap(m)).toList(),
    );
  }

  /// Guía por id: primero guardada (offline), luego caché, luego red.
  Future<Guide?> fetchGuide(String guideId, {required bool online}) async {
    final List<Map<String, dynamic>> saved = await _db.listSavedGuides();
    for (final Map<String, dynamic> json in saved) {
      if (json['id'] == guideId) return Guide.fromJson(json);
    }

    if (online) {
      try {
        final List<dynamic> rows = await _client
            .from('guides')
            .select('*, guide_groups(name)')
            .eq('id', guideId)
            .limit(1);
        if (rows.isNotEmpty) {
          return Guide.fromMap(Map<String, dynamic>.from(rows.first as Map));
        }
        return null;
      } catch (_) {
        // cae a caché
      }
    }

    final List<Map<String, dynamic>> cached = await _db.cachedGuides();
    for (final Map<String, dynamic> json in cached) {
      if (json['id'] == guideId) return Guide.fromJson(json);
    }
    return null;
  }

  // ---------------------------------------------------------------------------
  // Guías guardadas para lectura offline
  // ---------------------------------------------------------------------------

  Future<List<Guide>> savedGuides() async {
    final List<Map<String, dynamic>> rows = await _db.listSavedGuides();
    return rows.map((Map<String, dynamic> m) => Guide.fromJson(m)).toList();
  }

  Future<bool> isSaved(String guideId) => _db.isGuideSaved(guideId);

  Future<bool> toggleSaved(Guide guide) async {
    final bool currentlySaved = await _db.isGuideSaved(guide.id);
    if (currentlySaved) {
      await _db.unsaveGuide(guide.id);
      return false;
    }
    await _db.saveGuide(guide.toJson());
    return true;
  }

  // ---------------------------------------------------------------------------
  // Consultas a especialistas
  // ---------------------------------------------------------------------------

  Future<void> sendMessage(SpecialistMessage message) =>
      _client.from('messages').insert(message.toJson());
}
