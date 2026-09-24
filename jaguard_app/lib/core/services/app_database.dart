import 'dart:convert';

import 'package:path/path.dart' as p;
import 'package:sqflite/sqflite.dart';

/// Base de datos local (SQLite) para el modo offline-first.
///
/// Tablas:
///  - `pending_reports`: cola de reportes sin sincronizar.
///  - `pending_messages`: cola de consultas a especialistas sin sincronizar.
///  - `saved_guides`: guías descargadas para lectura sin conexión.
///  - `cached_groups` / `cached_guides`: caché del contenido educativo.
class AppDatabase {
  AppDatabase._();
  static final AppDatabase instance = AppDatabase._();

  static const String _dbName = 'jaguard.db';
  static const int _dbVersion = 1;

  Database? _db;

  Future<Database> get database async {
    _db ??= await _open();
    return _db!;
  }

  Future<Database> _open() async {
    final String dir = await getDatabasesPath();
    return openDatabase(
      p.join(dir, _dbName),
      version: _dbVersion,
      onConfigure: (Database db) => db.execute('PRAGMA foreign_keys = ON'),
      onCreate: (Database db, int version) async {
        await db.execute('''
          CREATE TABLE pending_reports (
            id TEXT PRIMARY KEY,
            payload TEXT NOT NULL,
            attempts INTEGER NOT NULL DEFAULT 0,
            created_at INTEGER NOT NULL
          )
        ''');
        await db.execute('''
          CREATE TABLE pending_messages (
            id TEXT PRIMARY KEY,
            payload TEXT NOT NULL,
            attempts INTEGER NOT NULL DEFAULT 0,
            created_at INTEGER NOT NULL
          )
        ''');
        await db.execute('''
          CREATE TABLE saved_guides (
            id TEXT PRIMARY KEY,
            payload TEXT NOT NULL,
            saved_at INTEGER NOT NULL
          )
        ''');
        await db.execute('''
          CREATE TABLE cached_groups (
            id TEXT PRIMARY KEY,
            payload TEXT NOT NULL,
            cached_at INTEGER NOT NULL
          )
        ''');
        await db.execute('''
          CREATE TABLE cached_guides (
            id TEXT PRIMARY KEY,
            payload TEXT NOT NULL,
            cached_at INTEGER NOT NULL
          )
        ''');
      },
    );
  }

  // ---------------------------------------------------------------------------
  // Cola de reportes offline
  // ---------------------------------------------------------------------------

  Future<void> enqueueReport(String id, Map<String, dynamic> payload) async {
    final Database db = await database;
    await db.insert(
      'pending_reports',
      {
        'id': id,
        'payload': jsonEncode(payload),
        'attempts': 0,
        'created_at': DateTime.now().millisecondsSinceEpoch,
      },
      conflictAlgorithm: ConflictAlgorithm.replace,
    );
  }

  Future<List<Map<String, dynamic>>> dequeueAllReports() async {
    final Database db = await database;
    final List<Map<String, Object?>> rows = await db.query(
      'pending_reports',
      orderBy: 'created_at ASC',
    );
    return rows
        .map((Map<String, Object?> row) => {
              'id': row['id'] as String,
              'attempts': row['attempts'] as int,
              'payload':
                  Map<String, dynamic>.from(jsonDecode(row['payload'] as String)
                      as Map<String, dynamic>),
            })
        .toList();
  }

  Future<void> removeReport(String id) async {
    final Database db = await database;
    await db.delete('pending_reports', where: 'id = ?', whereArgs: [id]);
  }

  Future<void> markReportAttempt(String id, int attempts) async {
    final Database db = await database;
    await db.update(
      'pending_reports',
      {'attempts': attempts},
      where: 'id = ?',
      whereArgs: [id],
    );
  }

  Future<int> countPendingReports() async {
    final Database db = await database;
    final List<Map<String, Object?>> rows =
        await db.query('pending_reports', columns: ['COUNT(*) AS n']);
    return SqfliteFirstIntHelper.count(rows);
  }

  // ---------------------------------------------------------------------------
  // Cola de mensajes offline
  // ---------------------------------------------------------------------------

  Future<void> enqueueMessage(String id, Map<String, dynamic> payload) async {
    final Database db = await database;
    await db.insert(
      'pending_messages',
      {
        'id': id,
        'payload': jsonEncode(payload),
        'attempts': 0,
        'created_at': DateTime.now().millisecondsSinceEpoch,
      },
      conflictAlgorithm: ConflictAlgorithm.replace,
    );
  }

  Future<List<Map<String, dynamic>>> dequeueAllMessages() async {
    final Database db = await database;
    final List<Map<String, Object?>> rows = await db.query(
      'pending_messages',
      orderBy: 'created_at ASC',
    );
    return rows
        .map((Map<String, Object?> row) => {
              'id': row['id'] as String,
              'attempts': row['attempts'] as int,
              'payload':
                  Map<String, dynamic>.from(jsonDecode(row['payload'] as String)
                      as Map<String, dynamic>),
            })
        .toList();
  }

  Future<void> removeMessage(String id) async {
    final Database db = await database;
    await db.delete('pending_messages', where: 'id = ?', whereArgs: [id]);
  }

  Future<void> markMessageAttempt(String id, int attempts) async {
    final Database db = await database;
    await db.update(
      'pending_messages',
      {'attempts': attempts},
      where: 'id = ?',
      whereArgs: [id],
    );
  }

  // ---------------------------------------------------------------------------
  // Guías guardadas (lectura offline)
  // ---------------------------------------------------------------------------

  Future<void> saveGuide(Map<String, dynamic> guideJson) async {
    final Database db = await database;
    await db.insert(
      'saved_guides',
      {
        'id': guideJson['id'] as String,
        'payload': jsonEncode(guideJson),
        'saved_at': DateTime.now().millisecondsSinceEpoch,
      },
      conflictAlgorithm: ConflictAlgorithm.replace,
    );
  }

  Future<void> unsaveGuide(String id) async {
    final Database db = await database;
    await db.delete('saved_guides', where: 'id = ?', whereArgs: [id]);
  }

  Future<bool> isGuideSaved(String id) async {
    final Database db = await database;
    final List<Map<String, Object?>> rows = await db.query(
      'saved_guides',
      where: 'id = ?',
      whereArgs: [id],
      limit: 1,
    );
    return rows.isNotEmpty;
  }

  Future<List<Map<String, dynamic>>> listSavedGuides() async {
    final Database db = await database;
    final List<Map<String, Object?>> rows =
        await db.query('saved_guides', orderBy: 'saved_at DESC');
    return rows
        .map((Map<String, Object?> row) =>
            Map<String, dynamic>.from(jsonDecode(row['payload'] as String)
                as Map<String, dynamic>))
        .toList();
  }

  // ---------------------------------------------------------------------------
  // Caché de contenido educativo
  // ---------------------------------------------------------------------------

  Future<void> cacheGroups(List<Map<String, dynamic>> groups) =>
      _replaceCache('cached_groups', groups);

  Future<List<Map<String, dynamic>>> cachedGroups() =>
      _readCache('cached_groups');

  Future<void> cacheGuides(List<Map<String, dynamic>> guides) =>
      _replaceCache('cached_guides', guides);

  Future<List<Map<String, dynamic>>> cachedGuides() =>
      _readCache('cached_guides');

  Future<void> _replaceCache(
      String table, List<Map<String, dynamic>> items) async {
    final Database db = await database;
    final Batch batch = db.batch();
    batch.delete(table);
    final int now = DateTime.now().millisecondsSinceEpoch;
    for (final Map<String, dynamic> item in items) {
      batch.insert(table, {
        'id': item['id'] as String,
        'payload': jsonEncode(item),
        'cached_at': now,
      });
    }
    await batch.commit(noResult: true);
  }

  Future<List<Map<String, dynamic>>> _readCache(String table) async {
    final Database db = await database;
    final List<Map<String, Object?>> rows = await db.query(table);
    return rows
        .map((Map<String, Object?> row) =>
            Map<String, dynamic>.from(jsonDecode(row['payload'] as String)
                as Map<String, dynamic>))
        .toList();
  }
}

/// Helper mínimo para leer `COUNT(*)` de una fila.
abstract final class SqfliteFirstIntHelper {
  static int count(List<Map<String, Object?>> rows) {
    if (rows.isEmpty) return 0;
    final Object? value = rows.first.values.first;
    if (value is int) return value;
    return int.tryParse('$value') ?? 0;
  }
}
