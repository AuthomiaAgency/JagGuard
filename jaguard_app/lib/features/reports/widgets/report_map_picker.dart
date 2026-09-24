import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:geolocator/geolocator.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import '../../../core/widgets/lucide_compat.dart';

import '../../../core/theme/app_theme.dart';
import '../../../core/utils/formatters.dart';
import '../../../core/widgets/app_toast.dart';
import '../providers/reports_providers.dart';

/// Selector de ubicación con Google Maps:
/// pin por toque, botón GPS y estilo oscuro en tema nocturno.
///
/// Mejora sobre la web (Leaflet): mapa nativo, cámara animada,
/// geocodificación inversa del sistema y precisión GPS configurable.
class ReportMapPicker extends ConsumerStatefulWidget {
  const ReportMapPicker({
    super.key,
    required this.initial,
    required this.onChanged,
    this.height = 240,
  });

  final LatLng initial;
  final ValueChanged<LatLng> onChanged;
  final double height;

  @override
  ConsumerState<ReportMapPicker> createState() => _ReportMapPickerState();
}

class _ReportMapPickerState extends ConsumerState<ReportMapPicker> {
  GoogleMapController? _controller;
  late LatLng _current;
  bool _locating = false;
  String? _darkStyle;
  double? _accuracyM;

  @override
  void initState() {
    super.initState();
    _current = widget.initial;
    _loadDarkStyle();
  }

  @override
  void didUpdateWidget(covariant ReportMapPicker oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.initial != widget.initial) {
      _current = widget.initial;
    }
  }

  Future<void> _loadDarkStyle() async {
    try {
      final String raw =
          await rootBundle.loadString('assets/map_styles/dark_map_style.json');
      _darkStyle = jsonEncode(jsonDecode(raw));
    } catch (_) {
      _darkStyle = null;
    }
  }

  Future<void> _locateMe() async {
    setState(() => _locating = true);
    try {
      final Position? position = await resolveCurrentPosition();
      if (position != null) {
        setState(() => _accuracyM = position.accuracy);
        _moveTo(LatLng(position.latitude, position.longitude));
      } else if (mounted) {
        AppToast.show(context,
            'No pudimos obtener tu ubicación. Activa el GPS o toca el mapa.',
            error: true);
      }
    } finally {
      if (mounted) setState(() => _locating = false);
    }
  }

  void _moveTo(LatLng target, {double zoom = 16}) {
    widget.onChanged(target);
    _controller?.animateCamera(
      CameraUpdate.newCameraPosition(CameraPosition(target: target, zoom: zoom)),
    );
  }

  @override
  Widget build(BuildContext context) {
    final bool isDark = Theme.of(context).brightness == Brightness.dark;

    return Column(
      children: <Widget>[
        ClipRRect(
          borderRadius: BorderRadius.circular(24),
          child: SizedBox(
            height: widget.height,
            child: Stack(
              children: <Widget>[
                GoogleMap(
                  initialCameraPosition: CameraPosition(
                    target: _current,
                    zoom: 13,
                  ),
                  myLocationButtonEnabled: false,
                  zoomControlsEnabled: false,
                  mapToolbarEnabled: false,
                  compassEnabled: false,
                  buildingsEnabled: false,
                  onTap: (LatLng target) {
                    setState(() => _current = target);
                    widget.onChanged(target);
                  },
                  markers: <Marker>{
                    Marker(
                      markerId: const MarkerId('report-location'),
                      position: _current,
                      draggable: true,
                      onDragEnd: (LatLng target) {
                        setState(() => _current = target);
                        widget.onChanged(target);
                      },
                    ),
                  },
                  style: isDark ? _darkStyle : null,
                  onMapCreated: (GoogleMapController controller) {
                    _controller = controller;
                  },
                ),
                Positioned(
                  right: 14,
                  bottom: 14,
                  child: Material(
                    color: isDark
                        ? AppColors.darkSurface
                        : AppColors.lightSurface,
                    borderRadius: BorderRadius.circular(999),
                    elevation: 4,
                    child: InkWell(
                      borderRadius: BorderRadius.circular(999),
                      onTap: _locating ? null : _locateMe,
                      child: Padding(
                        padding: const EdgeInsets.all(12),
                        child: _locating
                            ? const SizedBox(
                                width: 20,
                                height: 20,
                                child: CircularProgressIndicator(
                                    strokeWidth: 2.2),
                              )
                            : const Icon(LucideIcons.locate,
                                size: 22, color: AppColors.primary),
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 10),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
          decoration: BoxDecoration(
            color: Theme.of(context).colorScheme.surface.withOpacity(0.6),
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: Theme.of(context).dividerColor),
          ),
          child: Row(
            children: <Widget>[
              const Icon(LucideIcons.checkCircle2,
                  size: 16, color: Color(0xFF10B981)),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  Formatters.coordinates(_current.latitude, _current.longitude),
                  style: TextStyle(
                    fontFamily: AppTheme.fontFamily,
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    fontFeatures: const <FontFeature>[
                      FontFeature.tabularFigures()
                    ],
                    letterSpacing: 0.2,
                  ),
                ),
              ),
              if (_accuracyM != null) ...<Widget>[
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: _accuracyM! <= 20
                        ? AppColors.primary.withOpacity(0.1)
                        : AppColors.warning.withOpacity(0.12),
                    borderRadius: BorderRadius.circular(999),
                  ),
                  child: Text(
                    '±${_accuracyM!.toStringAsFixed(0)} m',
                    style: TextStyle(
                      fontFamily: AppTheme.fontFamily,
                      fontSize: 10,
                      fontWeight: FontWeight.w800,
                      color: _accuracyM! <= 20
                          ? AppColors.primary
                          : AppColors.warning,
                    ),
                  ),
                ),
                const SizedBox(width: 8),
              ],
              Text(
                'Toca el mapa para ajustar',
                style: Theme.of(context).textTheme.bodySmall,
              ),
            ],
          ),
        ),
      ],
    );
  }
}
