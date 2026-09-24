import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_widget_from_html_core/flutter_widget_from_html_core.dart';
import 'package:go_router/go_router.dart';
import '../../../core/widgets/lucide_compat.dart';
import 'package:share_plus/share_plus.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../core/l10n/translations.dart';
import '../../../core/services/connectivity_service.dart';
import '../../../core/widgets/app_toast.dart';
import '../../../core/widgets/common.dart';
import '../../auth/providers/auth_providers.dart';
import '../domain/guide.dart';
import '../../auth/domain/user_profile.dart';
import '../providers/learn_providers.dart';

/// Detalle de guía: contenido HTML, guardado offline, compartir y
/// consulta a especialistas (paridad con GuideDetail.tsx).
class GuideDetailScreen extends ConsumerStatefulWidget {
  const GuideDetailScreen({super.key, required this.guideId});

  final String guideId;

  @override
  ConsumerState<GuideDetailScreen> createState() => _GuideDetailScreenState();
}

class _GuideDetailScreenState extends ConsumerState<GuideDetailScreen> {
  Guide? _guide;
  bool _loading = true;
  bool _saved = false;
  bool _sendingQuery = false;
  final TextEditingController _query = TextEditingController();

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _query.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    final Guide? guide = await ref
        .read(learnRepositoryProvider)
        .fetchGuide(widget.guideId, online: ref.read(onlineProvider));
    final bool saved =
        guide != null && await ref.read(learnRepositoryProvider).isSaved(guide.id);
    if (!mounted) return;
    setState(() {
      _guide = guide;
      _saved = saved;
      _loading = false;
    });
  }

  Future<void> _toggleSave() async {
    if (_guide == null) return;
    final bool nowSaved =
        await ref.read(learnRepositoryProvider).toggleSaved(_guide!);
    ref.invalidate(savedGuideIdsProvider);
    if (!mounted) return;
    setState(() => _saved = nowSaved);
    final AppLanguage lang = ref.read(languageProvider);
    AppToast.show(
      context,
      nowSaved
          ? translate(lang.code, 'learn.saved_success')
          : translate(lang.code, 'learn.removed_success'),
    );
  }

  Future<void> _share() async {
    if (_guide == null) return;
    final AppLanguage lang = ref.read(languageProvider);
    await Share.share(
      '${translate(lang.code, 'learn.share_text_prefix')} JagGuard: ${_guide!.title}',
      subject: _guide!.title,
    );
  }

  Future<void> _sendQuery() async {
    final UserProfile? profile = ref.read(sessionProvider).profile;
    if (profile == null) {
      AppToast.show(context, 'Inicia sesión para consultar.', error: true);
      context.go('/login');
      return;
    }
    if (_query.text.trim().isEmpty) return;

    setState(() => _sendingQuery = true);
    try {
      await ref.read(learnRepositoryProvider).sendMessage(
            SpecialistMessage(
              userId: profile.id,
              userName: profile.name,
              userContact: profile.displayContact,
              reference: _guide!.title,
              message: _query.text.trim(),
            ),
          );
      if (!mounted) return;
      AppToast.show(context, translate(ref.read(languageProvider).code,
          'learn.query_sent'));
      Navigator.of(context).pop();
      _query.clear();
    } catch (_) {
      if (mounted) {
        AppToast.show(context, 'Error al enviar la consulta.', error: true);
      }
    } finally {
      if (mounted) setState(() => _sendingQuery = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final AppLanguage lang = ref.watch(languageProvider);
    String t(String key, [Map<String, dynamic>? params]) => translate(lang.code, key, params);
    final bool online = ref.watch(onlineProvider);

    if (_loading) {
      return const Scaffold(body: FullScreenLoader());
    }
    if (_guide == null) {
      return Scaffold(
        body: Center(
          child: EmptyState(icon: LucideIcons.bookOpen, message: t('learn.no_guides')),
        ),
      );
    }

    final Guide guide = _guide!;

    return Scaffold(
      body: Column(
        children: <Widget>[
          Material(
            elevation: 0.5,
            child: SafeArea(
              bottom: false,
              child: Padding(
                padding:
                    const EdgeInsets.symmetric(horizontal: 8, vertical: 10),
                child: Row(
                  children: <Widget>[
                    IconButton(
                      onPressed: () => context.pop(),
                      icon: const Icon(LucideIcons.arrowLeft, size: 22),
                    ),
                    Expanded(
                      child: Text(
                        guide.title,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: Theme.of(context).textTheme.titleMedium,
                      ),
                    ),
                    IconButton(
                      onPressed: _toggleSave,
                      icon: Icon(
                        _saved ? LucideIcons.checkCircle : LucideIcons.download,
                        size: 22,
                        color:
                            _saved ? const Color(0xFF10B981) : Colors.grey,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
          Expanded(
            child: ListView(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
              children: <Widget>[
                if (!online && !_saved)
                  Container(
                    margin: const EdgeInsets.only(bottom: 14),
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: const Color(0xFFFEF9C3),
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(color: const Color(0xFFFDE047)),
                    ),
                    child: Row(
                      children: <Widget>[
                        const Icon(LucideIcons.wifiOff,
                            size: 18, color: Color(0xFFA16207)),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Text(
                            t('learn.offline_cache_notice'),
                            style: const TextStyle(
                              fontFamily: 'Inter',
                              fontSize: 12,
                              color: Color(0xFF854D0E),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                if (guide.imageUrl?.isNotEmpty == true)
                  ClipRRect(
                    borderRadius: BorderRadius.circular(20),
                    child: SizedBox(
                      width: double.infinity,
                      height: 190,
                      child: Stack(
                        fit: StackFit.expand,
                        children: <Widget>[
                          Image.network(
                            guide.imageUrl!,
                            fit: BoxFit.cover,
                            errorBuilder: (_, __, ___) =>
                                Container(color: Colors.grey.shade300),
                          ),
                          const DecoratedBox(
                            decoration: BoxDecoration(
                              gradient: LinearGradient(
                                begin: Alignment.topCenter,
                                end: Alignment.bottomCenter,
                                colors: <Color>[
                                  Colors.transparent,
                                  Colors.black54
                                ],
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                if (guide.imageUrl?.isNotEmpty == true)
                  const SizedBox(height: 16),
                Container(
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    color: Theme.of(context).colorScheme.surface,
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: Theme.of(context).dividerColor),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: <Widget>[
                      Text(guide.title,
                          style: Theme.of(context).textTheme.headlineSmall),
                      if (guide.subtitle?.isNotEmpty == true) ...<Widget>[
                        const SizedBox(height: 6),
                        Text(guide.subtitle!,
                            style: Theme.of(context).textTheme.bodyMedium),
                      ],
                      const SizedBox(height: 14),
                      HtmlWidget(
                        guide.content,
                        textStyle: Theme.of(context)
                            .textTheme
                            .bodyLarge
                            ?.copyWith(height: 1.65),
                        onTapUrl: (String url) async {
                          final Uri uri = Uri.parse(url);
                          if (await canLaunchUrl(uri)) {
                            await launchUrl(uri,
                                mode: LaunchMode.externalApplication);
                          }
                          return true;
                        },
                      ),
                      if (guide.files.isNotEmpty) ...<Widget>[
                        const SizedBox(height: 18),
                        const Divider(),
                        const SizedBox(height: 12),
                        Text(t('learn.attachments'),
                            style: Theme.of(context).textTheme.titleMedium),
                        const SizedBox(height: 10),
                        ...guide.files.map(
                          (GuideFile file) => Padding(
                            padding: const EdgeInsets.only(bottom: 10),
                            child: _AttachmentTile(file: file),
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
                const SizedBox(height: 18),
                Row(
                  children: <Widget>[
                    Expanded(
                      child: OutlinedButton.icon(
                        onPressed: _share,
                        icon: const Icon(LucideIcons.share2, size: 18),
                        label: Text(t('learn.share')),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: FilledButton.icon(
                        onPressed: () => _showContactSheet(context, t),
                        icon: const Icon(LucideIcons.messageCircle, size: 18),
                        label: Text(t('learn.consult')),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  void _showContactSheet(BuildContext context, String Function(String) t) {
    final UserProfile? profile = ref.read(sessionProvider).profile;
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      builder: (BuildContext sheetContext) {
        return Padding(
          padding: EdgeInsets.only(
            bottom: MediaQuery.of(sheetContext).viewInsets.bottom,
          ),
          child: Padding(
            padding: const EdgeInsets.fromLTRB(22, 4, 22, 24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: <Widget>[
                Row(
                  children: <Widget>[
                    const Icon(LucideIcons.messageCircle,
                        size: 22, color: Color(0xFF10B981)),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        t('learn.contact_specialist'),
                        style: Theme.of(context).textTheme.titleMedium,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 18),
                _ReadOnlyField(label: t('learn.your_name'), value: profile?.name ?? ''),
                const SizedBox(height: 10),
                _ReadOnlyField(
                    label: t('learn.contact_info'),
                    value: profile?.displayContact ?? ''),
                const SizedBox(height: 10),
                _ReadOnlyField(label: t('learn.reference'), value: _guide?.title ?? ''),
                const SizedBox(height: 14),
                TextFormField(
                  controller: _query,
                  maxLines: 4,
                  maxLength: 800,
                  decoration: InputDecoration(
                    hintText: t('learn.query_placeholder'),
                  ),
                ),
                const SizedBox(height: 14),
                FilledButton(
                  onPressed: _sendingQuery ? null : _sendQuery,
                  child: _sendingQuery
                      ? const SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(
                              strokeWidth: 2.4, color: Colors.white),
                        )
                      : Text(t('learn.send_query')),
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}

class _ReadOnlyField extends StatelessWidget {
  const _ReadOnlyField({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: <Widget>[
        Text(
          label.toUpperCase(),
          style: Theme.of(context).textTheme.labelSmall,
        ),
        const SizedBox(height: 5),
        Container(
          width: double.infinity,
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
          decoration: BoxDecoration(
            color: Theme.of(context).colorScheme.surface.withOpacity(0.6),
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: Theme.of(context).dividerColor),
          ),
          child: Text(
            value,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: Theme.of(context).textTheme.bodyMedium,
          ),
        ),
      ],
    );
  }
}

class _AttachmentTile extends StatelessWidget {
  const _AttachmentTile({required this.file});

  final GuideFile file;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Theme.of(context).colorScheme.surface,
      borderRadius: BorderRadius.circular(14),
      child: InkWell(
        onTap: () async {
          final Uri uri = Uri.parse(file.url);
          if (await canLaunchUrl(uri)) {
            await launchUrl(uri, mode: LaunchMode.externalApplication);
          }
        },
        borderRadius: BorderRadius.circular(14),
        child: Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: Theme.of(context).dividerColor),
          ),
          child: Row(
            children: <Widget>[
              Container(
                width: 42,
                height: 42,
                decoration: BoxDecoration(
                  color: const Color(0xFF3B82F6).withOpacity(0.1),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(
                  file.isLink ? LucideIcons.globe : LucideIcons.fileText,
                  size: 20,
                  color: const Color(0xFF3B82F6),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: <Widget>[
                    Text(
                      file.name,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: Theme.of(context).textTheme.titleSmall,
                    ),
                    Text(
                      file.isLink
                          ? 'Recurso externo'
                          : (file.mimeType ?? 'Archivo'),
                      style: Theme.of(context).textTheme.bodySmall,
                    ),
                  ],
                ),
              ),
              const Icon(LucideIcons.download, size: 18, color: Colors.grey),
            ],
          ),
        ),
      ),
    );
  }
}
