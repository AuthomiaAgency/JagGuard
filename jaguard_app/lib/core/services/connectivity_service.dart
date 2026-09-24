import 'dart:async';

import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Estado de conectividad expuesto como provider reactivo.
/// Equivalente al `navigator.onLine` de la web, pero con eventos reales.
class ConnectivityService {
  ConnectivityService(this._ref) {
    _subscription = Connectivity()
        .onConnectivityChanged
        .listen((List<ConnectivityResult> results) {
      final bool online = !results.contains(ConnectivityResult.none);
      _ref.read(onlineProvider.notifier).state = online;
      if (online) _onReconnect?.call();
    });
  }

  final Ref _ref;
  StreamSubscription<List<ConnectivityResult>>? _subscription;
  void Function()? _onReconnect;

  /// Registra un callback que se dispara al recuperar la conexión.
  void onReconnect(void Function() callback) => _onReconnect = callback;

  Future<bool> checkNow() async {
    final List<ConnectivityResult> results =
        await Connectivity().checkConnectivity();
    final bool online = !results.contains(ConnectivityResult.none);
    _ref.read(onlineProvider.notifier).state = online;
    return online;
  }

  void dispose() => _subscription?.cancel();
}

/// `true` cuando el dispositivo tiene conexión.
final StateProvider<bool> onlineProvider = StateProvider<bool>((_) => true);

/// Provider raíz del servicio (se inicializa en `main`).
final Provider<ConnectivityService> connectivityServiceProvider =
    Provider<ConnectivityService>((Ref ref) {
  final ConnectivityService service = ConnectivityService(ref);
  ref.onDispose(service.dispose);
  return service;
});
