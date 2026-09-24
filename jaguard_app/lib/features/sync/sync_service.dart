import 'dart:io';

import 'package:flutter/foundation.dart' show kIsWeb;

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../../core/services/app_database.dart';
import '../../../core/services/connectivity_service.dart';
import '../auth/providers/auth_providers.dart';
import '../reports/domain/report.dart';

/// Sincronizador de colas offline (reportes y mensajes) al recuperar señal.
class SyncService {
  SyncService(this._ref) {
    _ref.read(connectivityServiceProvider).onReconnect(_syncAll);
  }

  final Ref _ref;
  bool _busy = false;

  Future<void> syncNow() => _syncAll();

  Future<void> _syncAll() async {
    // La cola offline es exclusiva de móvil/desktop; en web no hay SQLite.
    if (kIsWeb) return;
    if (_busy) return;
    _busy = true;
    try {
      await _syncReports();
      await _syncMessages();
    } finally {
      _busy = false;
    }
  }

  Future<void> _syncReports() async {
    final AppDatabase db = AppDatabase.instance;
    final List<Map<String, dynamic>> queued = await db.dequeueAllReports();
    final SupabaseClient client = _ref.read(supabaseClientProvider);

    for (final Map<String, dynamic> item in queued) {
      final String id = item['id'] as String;
      final int attempts = item['attempts'] as int;
      if (attempts >= 5) continue; // conservado para revisión manual

      final PendingReportPayload payload =
          PendingReportPayload.fromJson(item['payload']);

      // Sin sesión activa no hay forma de enviar: reintenta más tarde.
      if (client.auth.currentSession == null) continue;

      try {
        // Sube la foto si quedó pendiente en local.
        String? photoUrl;
        final String? localPath = payload.localPhotoPath;
        if (localPath != null && localPath.isNotEmpty && File(localPath).existsSync()) {
          final String objectPath =
              '${payload.userId}/${payload.id}.jpg';
          await client.storage.from('reports').uploadBinary(
                objectPath,
                await File(localPath).readAsBytes(),
                fileOptions: const FileOptions(contentType: 'image/jpeg'),
              );
          photoUrl = client.storage.from('reports').getPublicUrl(objectPath);
        }

        await client.rpc(
          'submit_report',
          params: payload.toRpcParams(photoUrl),
        );
        await db.removeReport(id);
        // La foto local ya no es necesaria.
        if (localPath != null && File(localPath).existsSync()) {
          try {
            await File(localPath).delete();
          } catch (_) {}
        }
      } on PostgrestException catch (e) {
        if (e.code == '23505') {
          // Duplicado: el reporte ya existe; se limpia de la cola.
          await db.removeReport(id);
        } else {
          await db.markReportAttempt(id, attempts + 1);
        }
      } catch (_) {
        await db.markReportAttempt(id, attempts + 1);
      }
    }
  }

  Future<void> _syncMessages() async {
    final AppDatabase db = AppDatabase.instance;
    final List<Map<String, dynamic>> queued = await db.dequeueAllMessages();
    final SupabaseClient client = _ref.read(supabaseClientProvider);

    for (final Map<String, dynamic> item in queued) {
      final String id = item['id'] as String;
      final int attempts = item['attempts'] as int;
      if (attempts >= 5) continue;
      if (client.auth.currentSession == null) continue;

      try {
        await client
            .from('messages')
            .insert(Map<String, dynamic>.from(item['payload']));
        await db.removeMessage(id);
      } catch (_) {
        await db.markMessageAttempt(id, attempts + 1);
      }
    }
  }
}
