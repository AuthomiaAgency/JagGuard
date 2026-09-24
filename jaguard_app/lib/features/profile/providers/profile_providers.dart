import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../reports/domain/report.dart';
import '../../auth/domain/user_profile.dart';
import '../../auth/providers/auth_providers.dart';

/// Reportes del usuario autenticado (historial).
final FutureProvider<List<Report>> myReportsProvider =
    FutureProvider<List<Report>>((Ref ref) async {
  final UserProfile? profile = ref.watch(sessionProvider).profile;
  if (profile == null) return <Report>[];
  try {
    return await ref.watch(reportsRepositoryForProfileProvider).fetchMyReports(profile.id);
  } catch (_) {
    return <Report>[];
  }
});

/// Alias para no depender del módulo de reportes en este provider.
final Provider<ReportsFetcher> reportsRepositoryForProfileProvider =
    Provider<ReportsFetcher>((Ref ref) => SupabaseReportsFetcher(
          ref.watch(supabaseClientProvider),
        ));

/// Abstracción mínima para consultar reportes propios.
abstract class ReportsFetcher {
  Future<List<Report>> fetchMyReports(String userId);
}

class SupabaseReportsFetcher implements ReportsFetcher {
  SupabaseReportsFetcher(this._client);
  final SupabaseClient _client;

  @override
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

/// Solicitud de canje vía RPC atómica `redeem_points`.
/// Devuelve `null` si fue exitoso; el mensaje de error si no.
Future<String?> requestRedemption(SupabaseClient client) async {
  try {
    await client.rpc('redeem_points');
    return null;
  } on PostgrestException catch (e) {
    if (e.message.contains('INSUFFICIENT_POINTS') || e.code == 'P0001') {
      return 'Aún no tienes los puntos suficientes.';
    }
    return 'Error al canjear. Intenta nuevamente.';
  } catch (_) {
    return 'Error al canjear. Verifica tu conexión.';
  }
}
