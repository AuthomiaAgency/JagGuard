import 'dart:io' as io;
import 'dart:typed_data';

import 'package:flutter_image_compress/flutter_image_compress.dart';
import 'package:image_picker/image_picker.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:uuid/uuid.dart';

import '../../../core/config/app_config.dart';
import '../../../core/services/app_database.dart';
import '../domain/report.dart';

/// Excepciones con mensaje de usuario.
class ReportFailure implements Exception {
  ReportFailure(this.message);
  final String message;
  @override
  String toString() => message;
}

/// Acceso a la tabla `reports`, Storage y cola offline.
class ReportsRepository {
  ReportsRepository(this._client, this._db);

  final SupabaseClient _client;
  final AppDatabase _db;
  final ImagePicker _picker = ImagePicker();
  final Uuid _uuid = const Uuid();

  // ---------------------------------------------------------------------------
  // Captura y compresión de evidencia
  // ---------------------------------------------------------------------------

  /// Abre la cámara o galería y devuelve la ruta de la imagen comprimida
  /// (máx. 1200 px de lado, JPEG 62 — mejor balance que el 600 px/50% web).
  Future<String?> pickPhoto({required bool fromCamera}) async {
    final XFile? file = await _picker.pickImage(
      source: fromCamera ? ImageSource.camera : ImageSource.gallery,
      imageQuality: 88,
      maxWidth: 1600,
      maxHeight: 1600,
    );
    if (file == null) return null;

    final XFile? compressedPath =
        await FlutterImageCompress.compressAndGetFile(
      file.path,
      '${file.path}_jg.jpg',
      quality: 62,
      minWidth: 1200,
      minHeight: 1200,
      format: CompressFormat.jpeg,
    );
    return compressedPath?.path ?? file.path;
  }

  // ---------------------------------------------------------------------------
  // Envío de reportes
  // ---------------------------------------------------------------------------

  /// Sube la foto a Storage y crea el reporte vía RPC atómica
  /// (`submit_report`: insert + +10 puntos en una transacción).
  Future<Report> submitOnline(PendingReportPayload payload) async {
    String? photoUrl;
    final String? localPath = payload.localPhotoPath;
    if (localPath != null && localPath.isNotEmpty) {
      photoUrl = await _uploadPhoto(localPath, payload.userId);
    }

    try {
      final dynamic result = await _client.rpc(
        'submit_report',
        params: payload.toRpcParams(photoUrl),
      );
      return Report.fromMap(Map<String, dynamic>.from(result as Map));
    } on PostgrestException catch (e) {
      if (e.code == '23505') {
        // Reporte ya sincronizado en un intento previo: idempotente.
        throw ReportFailure('Este reporte ya fue enviado anteriormente.');
      }
      throw ReportFailure('No se pudo enviar el reporte (${e.message}).');
    } catch (_) {
      throw ReportFailure('No se pudo enviar el reporte. Reintentaremos solo.');
    }
  }

  /// Guarda el reporte en la cola local para sincronizar cuando haya red.
  Future<void> submitOffline(PendingReportPayload payload) =>
      _db.enqueueReport(payload.id, payload.toJson());

  Future<String> _uploadPhoto(String path, String userId) async {
    final String objectPath = '$userId/${_uuid.v4()}.jpg';
    final Uint8List bytes = await io.File(path).readAsBytes();
    try {
      await _client.storage.from(AppConfig.reportsBucket).uploadBinary(
            objectPath,
            bytes,
            fileOptions: const FileOptions(contentType: 'image/jpeg'),
          );
    } on StorageException catch (e) {
      throw ReportFailure('No se pudo subir la evidencia (${e.message}).');
    }
    return _client.storage
        .from(AppConfig.reportsBucket)
        .getPublicUrl(objectPath);
  }

  // ---------------------------------------------------------------------------
  // Cola offline
  // ---------------------------------------------------------------------------

  /// Procesa la cola pendiente. Devuelve la cantidad sincronizada.
  Future<int> syncPendingQueue() async {
    final List<Map<String, dynamic>> queued = await _db.dequeueAllReports();
    int synced = 0;

    for (final Map<String, dynamic> item in queued) {
      final String id = item['id'] as String;
      final int attempts = item['attempts'] as int;
      final PendingReportPayload payload =
          PendingReportPayload.fromJson(item['payload']);

      // Reportes que fallaron demasiadas veces se conservan para revisión
      // manual (p. ej. sesión expirada); no bloquean el resto de la cola.
      if (attempts >= 5) continue;

      try {
        await submitOnline(payload);
        await _db.removeReport(id);
        synced++;
      } on ReportFailure {
        await _db.markReportAttempt(id, attempts + 1);
      }
    }
    return synced;
  }

  Future<int> countPending() => _db.countPendingReports();

  // ---------------------------------------------------------------------------
  // Consultas
  // ---------------------------------------------------------------------------

  /// Reportes propios (historial de 30 días en Perfil).
  Future<List<Report>> fetchMyReports(String userId) async {
    final List<dynamic> rows = await _client
        .from('reports')
        .select()
        .eq('user_id', userId)
        .order('created_at', ascending: false);
    return rows
        .map((dynamic r) =>
            Report.fromMap(Map<String, dynamic>.from(r as Map)))
        .toList();
  }
}
