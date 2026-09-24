import 'dart:io' show File;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:geolocator/geolocator.dart' as geo;
import 'package:go_router/go_router.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart' show LatLng;
import '../../../core/widgets/lucide_compat.dart';
import 'package:uuid/uuid.dart';

import '../../../core/config/app_config.dart';
import '../../../core/l10n/translations.dart';
import '../../../core/services/connectivity_service.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/app_toast.dart';
import '../../../core/widgets/common.dart';
import '../../auth/domain/user_profile.dart';
import '../../auth/providers/auth_providers.dart';
import '../domain/report.dart';
import '../providers/reports_providers.dart';
import '../widgets/report_map_picker.dart';

/// Formulario de reporte en dos pasos (paridad con ReportForm.tsx).
/// Paso 1: identificación del animal. Paso 2: evidencia + ubicación + notas.
class ReportFormScreen extends ConsumerStatefulWidget {
  const ReportFormScreen({super.key, required this.typeId});

  final String typeId;

  @override
  ConsumerState<ReportFormScreen> createState() => _ReportFormScreenState();
}

class _ReportFormScreenState extends ConsumerState<ReportFormScreen> {
  final Uuid _uuid = const Uuid();
  final TextEditingController _notes = TextEditingController();

  int _step = 1;
  AnimalOption? _animal;
  String? _specificAnimal;
  String? _photoPath;
  LatLngPair _location = const LatLngPair(-16.290154, -63.588653);

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _acquireLocation();
    });
  }

  @override
  void dispose() {
    _notes.dispose();
    super.dispose();
  }

  Future<void> _acquireLocation() async {
    final geo.Position? position = await resolveCurrentPosition();
    if (!mounted) return;
    if (position != null) {
      setState(() {
        _location = LatLngPair(position.latitude, position.longitude);
      });
    }
  }

  Future<void> _pickPhoto({required bool camera}) async {
    try {
      final String? path = await ref
          .read(reportsRepositoryProvider)
          .pickPhoto(fromCamera: camera);
      if (path != null && mounted) setState(() => _photoPath = path);
    } catch (_) {
      if (mounted) {
        AppToast.show(context, 'No se pudo obtener la foto.', error: true);
      }
    }
  }

  Future<void> _submit() async {
    final UserProfile? profile = ref.read(sessionProvider).profile;
    if (profile == null) {
      AppToast.show(context, 'Error de sesión. Inicia sesión nuevamente.',
          error: true);
      return;
    }
    if (_animal == null || _photoPath == null) {
      AppToast.show(context, 'Completa todos los campos requeridos.',
          error: true);
      return;
    }

    await ref.read(reportSubmitProvider.notifier).submit(
          PendingReportPayload(
            id: _uuid.v4(),
            userId: profile.id,
            userName: profile.name,
            userContact: profile.displayContact,
            type: widget.typeId,
            animal: _animal!.id,
            specificAnimal: _animal == AnimalOption.otros
                ? (_specificAnimal ?? '')
                : null,
            notes: _notes.text.trim().isEmpty ? null : _notes.text.trim(),
            lat: _location.lat,
            lng: _location.lng,
            localPhotoPath: _photoPath,
            anonymous: false,
          ),
        );
  }

  void _showSuccessModal(bool offline) {
    final AppLanguage lang = ref.read(languageProvider);
    String t(String key, [Map<String, dynamic>? params]) => translate(lang.code, key, params);

    showDialog<void>(
      context: context,
      barrierDismissible: false,
      builder: (BuildContext dialogContext) {
        return Dialog(
          child: Padding(
            padding: const EdgeInsets.all(28),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: <Widget>[
                Container(
                  width: 76,
                  height: 76,
                  decoration: const BoxDecoration(
                    color: Color(0xFFECFDF5),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(LucideIcons.checkCircle2,
                      size: 40, color: Color(0xFF10B981)),
                ),
                const SizedBox(height: 20),
                Text(
                  offline
                      ? t('report.offline_saved_title')
                      : t('report.success_title'),
                  textAlign: TextAlign.center,
                  style: Theme.of(context).textTheme.headlineSmall,
                ),
                const SizedBox(height: 10),
                Text(
                  offline
                      ? t('report.offline_saved_desc')
                      : t('report.success_desc'),
                  textAlign: TextAlign.center,
                  style: Theme.of(context).textTheme.bodyMedium,
                ),
                const SizedBox(height: 18),
                Container(
                  padding: const EdgeInsets.symmetric(
                      horizontal: 18, vertical: 12),
                  decoration: BoxDecoration(
                    color: AppColors.primarySoft,
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: <Widget>[
                      Text(
                        '+${AppConfig.pointsPerReport}',
                        style: const TextStyle(
                          fontFamily: AppTheme.fontFamily,
                          fontSize: 18,
                          fontWeight: FontWeight.w900,
                          color: AppColors.primary,
                        ),
                      ),
                      const SizedBox(width: 10),
                      Text(
                        'Puntos ganados',
                        style: Theme.of(context).textTheme.labelLarge,
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 22),
                FilledButton(
                  onPressed: () {
                    Navigator.of(dialogContext).pop();
                    ref.read(reportSubmitProvider.notifier).reset();
                    context.go('/');
                  },
                  child: Text(t('profile.understood')),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final AppLanguage lang = ref.watch(languageProvider);
    String t(String key, [Map<String, dynamic>? params]) => translate(lang.code, key, params);
    final bool online = ref.watch(onlineProvider);
    final ReportSubmitState submitState = ref.watch(reportSubmitProvider);

    ref.listen<ReportSubmitState>(reportSubmitProvider,
        (ReportSubmitState? previous, ReportSubmitState next) {
      if (next is ReportDone) _showSuccessModal(next.offline);
      if (next is ReportError) {
        AppToast.show(context, next.message, error: true);
      }
    });

    final ReportType? type = ReportType.tryFromId(widget.typeId);

    return Scaffold(
      body: Column(
        children: <Widget>[
          const AppHeader(),
          if (!online)
            Container(
              width: double.infinity,
              padding:
                  const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              color: const Color(0xFFF59E0B),
              child: Text(
                t('report.offline_warning'),
                textAlign: TextAlign.center,
                style: const TextStyle(
                  fontFamily: AppTheme.fontFamily,
                  fontSize: 11,
                  fontWeight: FontWeight.w800,
                  color: Colors.white,
                ),
              ),
            ),
          Padding(
            padding: const EdgeInsets.fromLTRB(8, 8, 16, 8),
            child: Row(
              children: <Widget>[
                BackButton(
                  onPressed: () {
                    if (_step == 2) {
                      setState(() => _step = 1);
                    } else {
                      context.pop();
                    }
                  },
                ),
                Text(
                  type?.label ?? t('report.title'),
                  style: Theme.of(context).textTheme.titleMedium,
                ),
              ],
            ),
          ),
          Expanded(
            child: _step == 1
                ? _buildStep1(t)
                : _buildStep2(t, submitState),
          ),
        ],
      ),
    );
  }

  // ---------------------------------------------------------------------------
  // Paso 1: identificación
  // ---------------------------------------------------------------------------

  Widget _buildStep1(String Function(String) t) {
    return SingleChildScrollView(
      padding: const EdgeInsets.fromLTRB(20, 10, 20, 24),
      child: Column(
        children: <Widget>[
          const SizedBox(height: 8),
          Text(
            t('report.identification'),
            textAlign: TextAlign.center,
            style: Theme.of(context).textTheme.headlineMedium,
          ),
          const SizedBox(height: 6),
          Text(
            t('report.select_animal'),
            style: Theme.of(context).textTheme.bodyMedium,
          ),
          const SizedBox(height: 24),
          GridView.count(
            crossAxisCount: 2,
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            mainAxisSpacing: 14,
            crossAxisSpacing: 14,
            childAspectRatio: 0.82,
            children: AnimalOption.values.map((AnimalOption option) {
              return _AnimalCard(
                option: option,
                selected: _animal == option,
                t: t,
                onTap: () => _selectAnimal(option, t),
              );
            }).toList(),
          ),
        ],
      ),
    );
  }

  void _selectAnimal(AnimalOption option, String Function(String) t) {
    setState(() => _animal = option);
    if (option == AnimalOption.otros) {
      _showSpecifyDialog(t);
    } else {
      setState(() => _step = 2);
    }
  }

  void _showSpecifyDialog(String Function(String) t) {
    final TextEditingController controller =
        TextEditingController(text: _specificAnimal);
    showDialog<void>(
      context: context,
      builder: (BuildContext dialogContext) {
        return AlertDialog(
          title: Row(
            children: <Widget>[
              const Icon(LucideIcons.search,
                  size: 20, color: AppColors.primary),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  t('report.specify'),
                  style: Theme.of(context).textTheme.titleMedium,
                ),
              ),
            ],
          ),
          content: TextField(
            controller: controller,
            autofocus: true,
            decoration: InputDecoration(
              labelText: t('report.other_desc'),
              hintText: t('report.specify_placeholder'),
            ),
          ),
          actions: <Widget>[
            TextButton(
              onPressed: () => Navigator.of(dialogContext).pop(),
              child: Text(t('profile.cancel')),
            ),
            FilledButton(
              style: FilledButton.styleFrom(
                  minimumSize: const Size(90, 46)),
              onPressed: () {
                final String value = controller.text.trim();
                if (value.isEmpty) {
                  AppToast.show(context, t('report.specify_placeholder'),
                      error: true);
                  return;
                }
                setState(() => _specificAnimal = value);
                Navigator.of(dialogContext).pop();
                setState(() => _step = 2);
              },
              child: Text(t('onboarding.next')),
            ),
          ],
        );
      },
    );
  }

  // ---------------------------------------------------------------------------
  // Paso 2: evidencia + ubicación
  // ---------------------------------------------------------------------------

  Widget _buildStep2(
      String Function(String) t, ReportSubmitState submitState) {
    final bool submitting = submitState is ReportSubmitting;

    return SingleChildScrollView(
      padding: const EdgeInsets.fromLTRB(20, 10, 20, 32),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: <Widget>[
          // Resumen del animal elegido
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Theme.of(context).colorScheme.surface,
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: Theme.of(context).dividerColor),
            ),
            child: Row(
              children: <Widget>[
                Container(
                  width: 52,
                  height: 52,
                  decoration: BoxDecoration(
                    color: AppColors.primarySoft,
                    borderRadius: BorderRadius.circular(14),
                  ),
                  child: const Icon(Icons.pets_rounded,
                      size: 26, color: AppColors.primary),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: <Widget>[
                      Text(
                        t('report.reporting'),
                        style: Theme.of(context).textTheme.bodySmall,
                      ),
                      Text(
                        _specificAnimal != null
                            ? _specificAnimal!
                            : t(_animal?.labelKey ?? 'report.unknown'),
                        style: Theme.of(context).textTheme.titleMedium,
                      ),
                    ],
                  ),
                ),
                TextButton(
                  onPressed: () => setState(() => _step = 1),
                  child: Text(t('report.change')),
                ),
              ],
            ),
          ),
          const SizedBox(height: 22),

          // Evidencia fotográfica
          SectionTitle(t('report.evidence')),
          const SizedBox(height: 10),
          if (_photoPath != null) ...<Widget>[
            Stack(
              children: <Widget>[
                ClipRRect(
                  borderRadius: BorderRadius.circular(24),
                  child: Image.file(
                    _photoPath != null ? File(_photoPath!) : File(''),
                    width: double.infinity,
                    height: 200,
                    fit: BoxFit.cover,
                  ),
                ),
                Positioned(
                  top: 10,
                  right: 10,
                  child: GestureDetector(
                    onTap: () => setState(() => _photoPath = null),
                    child: Container(
                      padding: const EdgeInsets.all(8),
                      decoration: const BoxDecoration(
                        color: Colors.black54,
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(LucideIcons.x,
                          size: 18, color: Colors.white),
                    ),
                  ),
                ),
              ],
            ),
          ] else
            _PhotoPlaceholder(
              onCamera: () => _pickPhoto(camera: true),
              onGallery: () => _pickPhoto(camera: false),
              t: t,
            ),
          const SizedBox(height: 22),

          // Ubicación
          SectionTitle(t('report.location')),
          const SizedBox(height: 10),
          ReportMapPicker(
            initial: LatLng(_location.lat, _location.lng),
            onChanged: (LatLng target) {
              _location = LatLngPair(target.latitude, target.longitude);
            },
          ),
          const SizedBox(height: 22),

          // Notas
          SectionTitle(t('report.notes')),
          const SizedBox(height: 10),
          TextFormField(
            controller: _notes,
            maxLines: 3,
            maxLength: 500,
            decoration: InputDecoration(
              hintText: t('report.notes_placeholder'),
            ),
          ),
          const SizedBox(height: 26),

          FilledButton(
            style: FilledButton.styleFrom(
                minimumSize: const Size.fromHeight(60)),
            onPressed: submitting ? null : _submit,
            child: submitting
                ? Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: <Widget>[
                      const SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(
                          strokeWidth: 2.4,
                          color: Colors.white,
                        ),
                      ),
                      const SizedBox(width: 12),
                      const Text('Enviando...'),
                    ],
                  )
                : Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: <Widget>[
                      const Icon(LucideIcons.send, size: 18),
                      const SizedBox(width: 10),
                      Text(t('report.send')),
                    ],
                  ),
          ),
        ],
      ),
    );
  }
}

/// Par inmutable de coordenadas para el estado del formulario.
class LatLngPair {
  const LatLngPair(this.lat, this.lng);
  final double lat;
  final double lng;
}

/// Placeholder de foto con acciones de cámara y galería.
class _PhotoPlaceholder extends StatelessWidget {
  const _PhotoPlaceholder({
    required this.onCamera,
    required this.onGallery,
    required this.t,
  });

  final VoidCallback onCamera;
  final VoidCallback onGallery;
  final String Function(String) t;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(26),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(24),
        border: Border.all(
          color: Theme.of(context).dividerColor,
          style: BorderStyle.solid,
          width: 1.6,
        ),
        color: Theme.of(context).colorScheme.surface.withOpacity(0.5),
      ),
      child: Column(
        children: <Widget>[
          Container(
            width: 60,
            height: 60,
            decoration: const BoxDecoration(
              color: AppColors.primarySoft,
              shape: BoxShape.circle,
            ),
            child:
                const Icon(LucideIcons.camera, size: 28, color: AppColors.primary),
          ),
          const SizedBox(height: 14),
          Text(
            t('report.take_photo'),
            style: Theme.of(context).textTheme.titleMedium,
          ),
          const SizedBox(height: 4),
          Text(
            t('report.evidence_desc'),
            textAlign: TextAlign.center,
            style: Theme.of(context).textTheme.bodySmall,
          ),
          const SizedBox(height: 18),
          Row(
            children: <Widget>[
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: onCamera,
                  icon: const Icon(LucideIcons.camera, size: 18),
                  label: const Text('Cámara'),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: onGallery,
                  icon: const Icon(LucideIcons.image, size: 18),
                  label: const Text('Galería'),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

/// Tarjeta de selección de animal del paso 1.
class _AnimalCard extends StatelessWidget {
  const _AnimalCard({
    required this.option,
    required this.selected,
    required this.t,
    required this.onTap,
  });

  final AnimalOption option;
  final bool selected;
  final String Function(String) t;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final bool isDark = Theme.of(context).brightness == Brightness.dark;
    final IconData icon = switch (option.id) {
      'jaguar' => Icons.pets_rounded,
      'puma' => LucideIcons.cat,
      'otros' => LucideIcons.search,
      _ => LucideIcons.helpCircle,
    };

    return Material(
      color: selected
          ? AppColors.primary.withOpacity(0.06)
          : (isDark ? AppColors.darkSurface : AppColors.lightSurface),
      borderRadius: BorderRadius.circular(28),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(28),
        child: Ink(
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(28),
            border: Border.all(
              color: selected ? AppColors.primary : Theme.of(context).dividerColor,
              width: selected ? 2 : 1,
            ),
            boxShadow: selected
                ? <BoxShadow>[
                    BoxShadow(
                      color: AppColors.primary.withOpacity(0.18),
                      blurRadius: 18,
                      offset: const Offset(0, 6),
                    ),
                  ]
                : null,
          ),
          child: Padding(
            padding: const EdgeInsets.all(12),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: <Widget>[
                Container(
                  width: 62,
                  height: 62,
                  decoration: BoxDecoration(
                    color: selected
                        ? AppColors.primary
                        : Theme.of(context).dividerColor.withOpacity(0.4),
                    shape: BoxShape.circle,
                  ),
                  child: Icon(
                    icon,
                    size: 30,
                    color: selected ? Colors.white : Colors.grey,
                  ),
                ),
                const SizedBox(height: 10),
                Text(
                  t(option.labelKey),
                  textAlign: TextAlign.center,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    fontFamily: AppTheme.fontFamily,
                    fontSize: 17,
                    fontWeight: FontWeight.w900,
                    color: isDark ? AppColors.darkText : AppColors.lightText,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  t(option.descKey),
                  textAlign: TextAlign.center,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    fontFamily: AppTheme.fontFamily,
                    fontSize: 9,
                    fontWeight: FontWeight.w900,
                    letterSpacing: 1.6,
                    color: Theme.of(context)
                        .colorScheme
                        .onSurface
                        .withOpacity(0.4),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
