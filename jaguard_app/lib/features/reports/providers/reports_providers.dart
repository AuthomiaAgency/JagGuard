import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:geolocator/geolocator.dart';
import 'package:permission_handler/permission_handler.dart';

import '../../../core/services/app_database.dart';
import '../../../core/services/connectivity_service.dart';
import '../../auth/providers/auth_providers.dart' show sessionProvider, supabaseClientProvider;
import '../data/reports_repository.dart' show ReportsRepository, ReportFailure;
import '../domain/report.dart';

/// Repositorio de reportes inyectado.
final Provider<ReportsRepository> reportsRepositoryProvider =
    Provider<ReportsRepository>((Ref ref) => ReportsRepository(
          ref.watch(supabaseClientProvider),
          AppDatabase.instance,
        ));

/// Posición GPS de alta precisión con fallback a la última conocida.
/// Devuelve `null` solo si los permisos fueron denegados o no hay señal.
Future<Position?> resolveCurrentPosition() async {
  bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
  if (!serviceEnabled) return null;

  LocationPermission permission = await Geolocator.checkPermission();
  if (permission == LocationPermission.denied) {
    final PermissionStatus status = await Permission.locationWhenInUse.request();
    permission = status == PermissionStatus.granted
        ? LocationPermission.whileInUse
        : LocationPermission.denied;
  }
  if (permission == LocationPermission.denied ||
      permission == LocationPermission.deniedForever) {
    return null;
  }

  try {
    return await Geolocator.getCurrentPosition(
      locationSettings: const LocationSettings(
        accuracy: LocationAccuracy.high,
        timeLimit: Duration(seconds: 8),
      ),
    );
  } catch (_) {
    return Geolocator.getLastKnownPosition();
  }
}

/// Estados de envío del formulario de reporte.
sealed class ReportSubmitState {
  const ReportSubmitState();
}

class ReportIdle extends ReportSubmitState {
  const ReportIdle();
}

class ReportSubmitting extends ReportSubmitState {
  const ReportSubmitting(this.label);
  final String label;
}

class ReportDone extends ReportSubmitState {
  const ReportDone({required this.offline});
  final bool offline;
}

class ReportError extends ReportSubmitState {
  const ReportError(this.message);
  final String message;
}

/// Controlador del flujo de envío de reportes.
class ReportSubmitController extends Notifier<ReportSubmitState> {
  @override
  ReportSubmitState build() => const ReportIdle();

  Future<void> submit(PendingReportPayload payload) async {
    final bool online = ref.read(onlineProvider);

    if (!online) {
      await ref.read(reportsRepositoryProvider).submitOffline(payload);
      state = const ReportDone(offline: true);
      return;
    }

    state = const ReportSubmitting('Enviando...');
    try {
      await ref.read(reportsRepositoryProvider).submitOnline(payload);
      ref.read(sessionProvider.notifier).adjustPoints(10);
      state = const ReportDone(offline: false);
    } on ReportFailure catch (e) {
      // Red caída a mitad del envío: se conserva localmente.
      await ref.read(reportsRepositoryProvider).submitOffline(payload);
      state = ReportDone(offline: true, );
      if (e.message.isNotEmpty) {
        debugPrint('Report submit fallback to offline: ${e.message}');
      }
    }
  }

  void reset() => state = const ReportIdle();
}

final NotifierProvider<ReportSubmitController, ReportSubmitState>
    reportSubmitProvider =
    NotifierProvider<ReportSubmitController, ReportSubmitState>(
        ReportSubmitController.new);
