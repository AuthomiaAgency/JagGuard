import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:flutter_quill/flutter_quill.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/widgets/lucide_compat.dart';
import 'package:uuid/uuid.dart';

import '../../../core/l10n/translations.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/app_scaffold.dart';
import '../../../core/widgets/app_toast.dart';
import '../../../core/widgets/common.dart';
import '../data/admin_repository.dart';
import '../../learn/providers/learn_providers.dart';
import '../providers/admin_providers.dart';
import '../utils/content_converters.dart';
import '../../learn/domain/guide.dart';

/// Editor CMS nativo: grupos + guías con editor Quill.
/// Los archivos e imágenes se suben al bucket `guides-media` de Supabase.
class AdminEditorScreen extends ConsumerStatefulWidget {
  const AdminEditorScreen({super.key});

  @override
  ConsumerState<AdminEditorScreen> createState() => _AdminEditorScreenState();
}

class _AdminEditorScreenState extends ConsumerState<AdminEditorScreen>
    with SingleTickerProviderStateMixin {
  late final TabController _tabs = TabController(length: 2, vsync: this);
  bool _saving = false;

  // Formulario de guía
  final TextEditingController _title = TextEditingController();
  final TextEditingController _subtitle = TextEditingController();
  QuillController? _quill;
  GuideGroupRef? _selectedGroup;
  int _readTime = 5;
  String? _imageUrl;
  String? _videoUrl;
  final List<GuideFile> _files = <GuideFile>[];
  String? _editingGuideId;
  bool _uploadingMedia = false;

  // Formulario de grupo
  final TextEditingController _groupName = TextEditingController();
  String _groupIcon = 'paw';
  String? _editingGroupId;

  static const List<(String, IconData)> _availableIcons = <(String, IconData)>[
    ('paw', Icons.pets_rounded),
    ('shield', LucideIcons.shield),
    ('eye', LucideIcons.eye),
    ('alert', LucideIcons.alertTriangle),
    ('info', LucideIcons.info),
    ('map', LucideIcons.map),
    ('camera', LucideIcons.camera),
    ('leaf', LucideIcons.leaf),
    ('zap', LucideIcons.zap),
    ('heart', LucideIcons.heart),
    ('book', LucideIcons.bookOpen),
    ('file', LucideIcons.fileText),
  ];

  @override
  void dispose() {
    _tabs.dispose();
    _title.dispose();
    _subtitle.dispose();
    _groupName.dispose();
    _quill?.dispose();
    super.dispose();
  }

  void _ensureQuill() {
    _quill ??= QuillController.basic();
  }

  void _resetGuideForm() {
    _title.clear();
    _subtitle.clear();
    _quill?.clear();
    _selectedGroup = null;
    _readTime = 5;
    _imageUrl = null;
    _videoUrl = null;
    _files.clear();
    _editingGuideId = null;
    setState(() {});
  }

  void _startEditGuide(GuideEntry guide) {
    _ensureQuill();
    _editingGuideId = guide.id;
    _title.text = guide.title;
    _subtitle.text = guide.subtitle ?? '';
    _quill!.document = Document.fromDelta(
        ContentConverters.htmlToDelta(guide.content));
    _readTime = guide.readTime;
    _imageUrl = guide.imageUrl;
    _videoUrl = guide.videoUrl;
    _files
      ..clear()
      ..addAll(guide.files);
    _selectedGroup = guide.groupId == null
        ? null
        : GuideGroupRef(id: guide.groupId!, name: guide.groupName ?? '');
    _tabs.animateTo(1);
    setState(() {});
  }

  Future<void> _uploadCover({required bool isVideo}) async {
    setState(() => _uploadingMedia = true);
    try {
      final FilePickerResult? result = await FilePicker.platform.pickFiles(
        type: isVideo ? FileType.video : FileType.image,
        withData: true,
      );
      final PlatformFile? picked = result?.files.single;
      if (picked == null || picked.bytes == null) return;

      final String url = await ref.read(adminRepositoryProvider).uploadMedia(
            picked.bytes!,
            picked.name,
            contentType: isVideo ? 'video/mp4' : 'image/jpeg',
          );
      setState(() {
        if (isVideo) {
          _videoUrl = url;
        } else {
          _imageUrl = url;
        }
      });
    } catch (_) {
      if (mounted) {
        AppToast.show(context, 'No se pudo subir el archivo.', error: true);
      }
    } finally {
      if (mounted) setState(() => _uploadingMedia = false);
    }
  }

  Future<void> _addFileAttachment() async {
    final FilePickerResult? result =
        await FilePicker.platform.pickFiles(withData: true);
    final PlatformFile? picked = result?.files.single;
    if (picked == null || picked.bytes == null) return;
    try {
      final String url = await ref.read(adminRepositoryProvider).uploadMedia(
            picked.bytes!,
            picked.name,
            contentType: picked.extension == 'pdf'
                ? 'application/pdf'
                : 'application/octet-stream',
          );
      setState(() => _files.add(GuideFile(
            name: picked.name,
            url: url,
            mimeType: picked.extension ?? 'file',
          )));
    } catch (_) {
      if (mounted) {
        AppToast.show(context, 'No se pudo adjuntar el archivo.', error: true);
      }
    }
  }

  void _addLinkAttachment() {
    final TextEditingController urlCtrl = TextEditingController();
    final TextEditingController nameCtrl = TextEditingController();
    showDialog<void>(
      context: context,
      builder: (BuildContext dialogContext) => AlertDialog(
        title: Text('Agregar enlace',
            style: Theme.of(context).textTheme.titleMedium),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: <Widget>[
            TextField(
              controller: urlCtrl,
              decoration:
                  const InputDecoration(hintText: 'https://...'),
            ),
            const SizedBox(height: 10),
            TextField(
              controller: nameCtrl,
              decoration:
                  const InputDecoration(hintText: 'Nombre del recurso'),
            ),
          ],
        ),
        actions: <Widget>[
          TextButton(
            onPressed: () => Navigator.of(dialogContext).pop(),
            child: const Text('Cancelar'),
          ),
          FilledButton(
            onPressed: () {
              final String url = urlCtrl.text.trim();
              if (url.isEmpty) return;
              setState(() => _files.add(GuideFile(
                    name: nameCtrl.text.trim().isEmpty
                        ? url
                        : nameCtrl.text.trim(),
                    url: url,
                    isLink: true,
                  )));
              Navigator.of(dialogContext).pop();
            },
            child: const Text('Agregar'),
          ),
        ],
      ),
    );
  }

  Future<void> _saveGuide() async {
    String t(String key, [Map<String, dynamic>? params]) => translate(ref.read(languageProvider).code, key, params);
    final QuillController? quill = _quill;
    if (_title.text.trim().isEmpty ||
        _selectedGroup == null ||
        quill == null ||
        quill.document.isEmpty()) {
      AppToast.show(
          context, t('editor.required_fields'), error: true);
      return;
    }

    setState(() => _saving = true);
    try {
      final String html = ContentConverters.deltaToHtml(quill.document.toDelta());
      final Guide guide = Guide(
        id: _editingGuideId ?? const Uuid().v4(),
        title: _title.text.trim(),
        subtitle: _subtitle.text.trim().isEmpty ? null : _subtitle.text.trim(),
        content: html,
        groupId: _selectedGroup!.id,
        groupName: _selectedGroup!.name,
        imageUrl: _imageUrl,
        videoUrl: _videoUrl,
        readTime: _readTime,
        files: List<GuideFile>.from(_files),
      );

      final AdminRepository repo = ref.read(adminRepositoryProvider);
      if (_editingGuideId != null) {
        await repo.updateGuide(guide);
      } else {
        await repo.createGuide(guide);
      }
      ref.invalidate(adminContentProvider);
      ref.invalidate(learnContentProvider);
      if (!mounted) return;
      AppToast.show(context, t('editor.guide_saved'));
      _resetGuideForm();
    } catch (_) {
      if (mounted) {
        AppToast.show(context, t('editor.guide_error'), error: true);
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  Future<void> _saveGroup() async {
    if (_groupName.text.trim().isEmpty) {
      AppToast.show(context, 'El nombre del grupo es obligatorio', error: true);
      return;
    }
    setState(() => _saving = true);
    try {
      final AdminRepository repo = ref.read(adminRepositoryProvider);
      if (_editingGroupId != null) {
        await repo.updateGroup(_editingGroupId!, _groupName.text.trim(),
            _groupIcon);
      } else {
        await repo.createGroup(_groupName.text.trim(), _groupIcon);
      }
      ref.invalidate(adminContentProvider);
      ref.invalidate(learnContentProvider);
      if (!mounted) return;
      AppToast.show(context, 'Grupo guardado');
      _groupName.clear();
      _groupIcon = 'paw';
      _editingGroupId = null;
      setState(() {});
    } catch (_) {
      if (mounted) AppToast.show(context, 'Error al guardar grupo', error: true);
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final AppLanguage lang = ref.watch(languageProvider);
    String t(String key, [Map<String, dynamic>? params]) => translate(lang.code, key, params);

    return MainShell(
      child: ref.watch(adminContentProvider).when(
            loading: () => const FullScreenLoader(),
            error: (Object e, StackTrace s) =>
                const EmptyState(icon: LucideIcons.alertTriangle, message: 'Error al cargar el CMS'),
            data: ((List<GuideGroupRef> groups, List<GuideEntry> guides) data) {
              return Column(
                children: <Widget>[
                  Padding(
                    padding: const EdgeInsets.fromLTRB(16, 14, 16, 0),
                    child: Row(
                      children: <Widget>[
                        Expanded(
                          child: Text(t('editor.title'),
                              style: Theme.of(context).textTheme.headlineSmall),
                        ),
                      ],
                    ),
                  ),
                  TabBar(
                    controller: _tabs,
                    isScrollable: true,
                    tabAlignment: TabAlignment.start,
                    dividerColor: Colors.transparent,
                    labelColor: AppColors.primary,
                    unselectedLabelColor: Theme.of(context)
                        .colorScheme
                        .onSurface
                        .withOpacity(0.4),
                    labelStyle: const TextStyle(
                        fontFamily: AppTheme.fontFamily,
                        fontWeight: FontWeight.w800,
                        fontSize: 13),
                    tabs: <Widget>[
                      Tab(text: t('editor.groups')),
                      Tab(text: t('editor.guides')),
                    ],
                  ),
                  Expanded(
                    child: TabBarView(
                      controller: _tabs,
                      children: <Widget>[
                        _buildGroupsTab(context, data.$1, data.$2, t),
                        _buildGuidesTab(context, data.$1, data.$2, t),
                      ],
                    ),
                  ),
                ],
              );
            },
          ),
    );
  }

  // ---------------------------------------------------------------------------
  // Tab Grupos
  // ---------------------------------------------------------------------------

  Widget _buildGroupsTab(BuildContext context, List<GuideGroupRef> groups,
      List<GuideEntry> guides, String Function(String) t) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: <Widget>[
        Card(
          child: Padding(
            padding: const EdgeInsets.all(18),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: <Widget>[
                Text(
                  _editingGroupId == null
                      ? t('editor.create_group')
                      : t('editor.edit_group'),
                  style: Theme.of(context).textTheme.titleMedium,
                ),
                const SizedBox(height: 14),
                Text(t('editor.group_name'),
                    style: Theme.of(context).textTheme.labelSmall),
                const SizedBox(height: 6),
                TextField(controller: _groupName),
                const SizedBox(height: 14),
                Text(t('editor.group_icon'),
                    style: Theme.of(context).textTheme.labelSmall),
                const SizedBox(height: 8),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: _availableIcons
                      .map(((String, IconData) entry) {
                    final bool selected = _groupIcon == entry.$1;
                    return InkWell(
                      onTap: () => setState(() => _groupIcon = entry.$1),
                      borderRadius: BorderRadius.circular(12),
                      child: Container(
                        width: 46,
                        height: 46,
                        decoration: BoxDecoration(
                          color: selected
                              ? AppColors.primary
                              : Theme.of(context).dividerColor.withOpacity(0.3),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Icon(entry.$2,
                            size: 20,
                            color: selected
                                ? Colors.white
                                : Theme.of(context)
                                    .colorScheme
                                    .onSurface
                                    .withOpacity(0.5)),
                      ),
                    );
                  }).toList(),
                ),
                const SizedBox(height: 18),
                Row(
                  children: <Widget>[
                    if (_editingGroupId != null)
                      Expanded(
                        child: OutlinedButton(
                          onPressed: () => setState(() {
                            _editingGroupId = null;
                            _groupName.clear();
                            _groupIcon = 'paw';
                          }),
                          child: Text(t('editor.cancel')),
                        ),
                      ),
                    if (_editingGroupId != null) const SizedBox(width: 10),
                    Expanded(
                      flex: 2,
                      child: FilledButton.icon(
                        onPressed: _saving ? null : _saveGroup,
                        icon: const Icon(LucideIcons.plus, size: 18),
                        label: Text(_editingGroupId == null
                            ? t('editor.create_group')
                            : t('editor.save')),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 18),
        ...groups.map((GuideGroupRef group) {
          final int count = guides
              .where((GuideEntry g) => g.groupId == group.id)
              .length;
          final IconData icon = _availableIcons
              .firstWhere((entry) => entry.$1 == group.icon,
                  orElse: () => ('paw', Icons.pets_rounded))
              .$2;
          return Padding(
            padding: const EdgeInsets.only(bottom: 10),
            child: Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: Theme.of(context).colorScheme.surface,
                borderRadius: BorderRadius.circular(18),
                border: Border.all(color: Theme.of(context).dividerColor),
              ),
              child: Row(
                children: <Widget>[
                  Container(
                    width: 42,
                    height: 42,
                    decoration: BoxDecoration(
                      color: AppColors.primarySoft,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Icon(icon, size: 20, color: AppColors.primary),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: <Widget>[
                        Text(group.name,
                            style: Theme.of(context).textTheme.titleSmall),
                        Text('$count publicaciones',
                            style: Theme.of(context).textTheme.bodySmall),
                      ],
                    ),
                  ),
                  IconButton(
                    onPressed: () => setState(() {
                      _editingGroupId = group.id;
                      _groupName.text = group.name;
                      _groupIcon = group.icon;
                    }),
                    icon: const Icon(LucideIcons.edit3,
                        size: 18, color: Colors.blue),
                  ),
                  IconButton(
                    onPressed: () async {
                      await ref
                          .read(adminRepositoryProvider)
                          .deleteGroup(group.id);
                      ref.invalidate(adminContentProvider);
                      ref.invalidate(learnContentProvider);
                    },
                    icon: const Icon(LucideIcons.xCircle,
                        size: 18, color: Colors.red),
                  ),
                ],
              ),
            ),
          );
        }),
      ],
    );
  }

  // ---------------------------------------------------------------------------
  // Tab Guías
  // ---------------------------------------------------------------------------

  Widget _buildGuidesTab(BuildContext context, List<GuideGroupRef> groups,
      List<GuideEntry> guides, String Function(String) t) {
    _ensureQuill();
    return ListView(
      padding: const EdgeInsets.all(16),
      children: <Widget>[
        Card(
          child: Padding(
            padding: const EdgeInsets.all(18),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: <Widget>[
                Text(
                  _editingGuideId == null
                      ? t('editor.create_guide')
                      : t('editor.edit_guide'),
                  style: Theme.of(context).textTheme.titleMedium,
                ),
                const SizedBox(height: 14),
                Text(t('editor.guide_title'),
                    style: Theme.of(context).textTheme.labelSmall),
                const SizedBox(height: 6),
                TextField(controller: _title),
                const SizedBox(height: 14),
                Text(t('editor.guide_subtitle'),
                    style: Theme.of(context).textTheme.labelSmall),
                const SizedBox(height: 6),
                TextField(controller: _subtitle, maxLines: 2),
                const SizedBox(height: 14),
                Row(
                  children: <Widget>[
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: <Widget>[
                          Text(t('editor.guide_group'),
                              style: Theme.of(context).textTheme.labelSmall),
                          const SizedBox(height: 6),
                          DropdownButtonFormField<GuideGroupRef>(
                            value: _selectedGroup,
                            items: groups
                                .map((GuideGroupRef g) =>
                                    DropdownMenuItem<GuideGroupRef>(
                                      value: g,
                                      child: Text(g.name,
                                          overflow: TextOverflow.ellipsis),
                                    ))
                                .toList(),
                            onChanged: (GuideGroupRef? value) =>
                                setState(() => _selectedGroup = value),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 12),
                    SizedBox(
                      width: 110,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: <Widget>[
                          Text(t('editor.guide_read_time'),
                              style: Theme.of(context).textTheme.labelSmall),
                          const SizedBox(height: 6),
                          TextFormField(
                            initialValue: '$_readTime',
                            keyboardType: TextInputType.number,
                            onChanged: (String v) =>
                                _readTime = int.tryParse(v) ?? 5,
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 14),
                Row(
                  children: <Widget>[
                    Expanded(
                      child: _MediaSlot(
                        label: t('editor.guide_image'),
                        done: _imageUrl != null,
                        uploading: _uploadingMedia,
                        icon: LucideIcons.image,
                        onTap: () => _uploadCover(isVideo: false),
                        onClear: () => setState(() => _imageUrl = null),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: _MediaSlot(
                        label: t('editor.guide_video'),
                        done: _videoUrl != null,
                        uploading: _uploadingMedia,
                        icon: LucideIcons.video,
                        onTap: () => _uploadCover(isVideo: true),
                        onClear: () => setState(() => _videoUrl = null),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 18),
                Text(t('editor.guide_content'),
                    style: Theme.of(context).textTheme.labelSmall),
                const SizedBox(height: 8),
                Container(
                  height: 330,
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: Theme.of(context).dividerColor),
                  ),
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(16),
                    child: Column(
                      children: <Widget>[
                        QuillSimpleToolbar(
                          controller: _quill!,
                          config: const QuillSimpleToolbarConfig(
                            showUnderLineButton: true,
                            showItalicButton: true,
                            showBoldButton: true,
                            showStrikeThrough: true,
                            showInlineCode: true,
                            showHeaderStyle: true,
                            showListBullets: true,
                            showListNumbers: true,
                            showQuote: true,
                            showCodeBlock: true,
                            showLink: true,
                            
                            
                            showSuperscript: false,
                            showSubscript: false,
                            showClearFormat: true,
                            headerStyleType:
                                HeaderStyleType.original,
                          ),
                        ),
                        const Divider(height: 1),
                        Expanded(
                          child: QuillEditor.basic(
                            controller: _quill!,
                            config: const QuillEditorConfig(
                              padding: EdgeInsets.all(16),
                              placeholder: 'Escribe el contenido aquí...',
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 18),
                Text('Recursos adjuntos',
                    style: Theme.of(context).textTheme.labelSmall),
                const SizedBox(height: 8),
                Row(
                  children: <Widget>[
                    Expanded(
                      child: OutlinedButton.icon(
                        onPressed: _addFileAttachment,
                        icon: const Icon(LucideIcons.upload, size: 16),
                        label: const Text('Archivo',
                            style: TextStyle(fontSize: 12)),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: OutlinedButton.icon(
                        onPressed: _addLinkAttachment,
                        icon: const Icon(LucideIcons.link, size: 16),
                        label: const Text('Enlace',
                            style: TextStyle(fontSize: 12)),
                      ),
                    ),
                  ],
                ),
                ..._files.asMap().entries.map(
                      (MapEntry<int, GuideFile> e) => Padding(
                        padding: const EdgeInsets.only(top: 8),
                        child: Row(
                          children: <Widget>[
                            Icon(
                              e.value.isLink
                                  ? LucideIcons.globe
                                  : LucideIcons.fileText,
                              size: 18,
                              color: Colors.blue,
                            ),
                            const SizedBox(width: 10),
                            Expanded(
                              child: Text(
                                e.value.name,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: Theme.of(context).textTheme.titleSmall,
                              ),
                            ),
                            IconButton(
                              onPressed: () =>
                                  setState(() => _files.removeAt(e.key)),
                              icon: const Icon(LucideIcons.trash2,
                                  size: 16, color: Colors.red),
                            ),
                          ],
                        ),
                      ),
                    ),
                const SizedBox(height: 18),
                Row(
                  children: <Widget>[
                    if (_editingGuideId != null)
                      Expanded(
                        child: OutlinedButton(
                          onPressed: _resetGuideForm,
                          child: Text(t('editor.cancel')),
                        ),
                      ),
                    if (_editingGuideId != null) const SizedBox(width: 10),
                    Expanded(
                      flex: 2,
                      child: FilledButton.icon(
                        onPressed: _saving ? null : _saveGuide,
                        icon: _saving
                            ? const SizedBox(
                                width: 18,
                                height: 18,
                                child: CircularProgressIndicator(
                                    strokeWidth: 2.2, color: Colors.white))
                            : const Icon(LucideIcons.checkCircle, size: 18),
                        label: Text(_editingGuideId == null
                            ? t('editor.publish')
                            : t('editor.save')),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 18),
        ...guides.map((GuideEntry guide) {
          return Padding(
            padding: const EdgeInsets.only(bottom: 10),
            child: Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: Theme.of(context).colorScheme.surface,
                borderRadius: BorderRadius.circular(18),
                border: Border.all(color: Theme.of(context).dividerColor),
              ),
              child: Row(
                children: <Widget>[
                  if (guide.imageUrl?.isNotEmpty == true)
                    ClipRRect(
                      borderRadius: BorderRadius.circular(10),
                      child: Image.network(
                        guide.imageUrl!,
                        width: 46,
                        height: 46,
                        fit: BoxFit.cover,
                        errorBuilder: (_, __, ___) =>
                            const SizedBox(width: 46),
                      ),
                    ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: <Widget>[
                        Text(guide.title,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: Theme.of(context).textTheme.titleSmall),
                        Text(
                          '${guide.groupName ?? '—'} · ${guide.readTime} min',
                          style: Theme.of(context).textTheme.bodySmall,
                        ),
                      ],
                    ),
                  ),
                  IconButton(
                    onPressed: () => _startEditGuide(guide),
                    icon: const Icon(LucideIcons.edit3,
                        size: 18, color: Colors.blue),
                  ),
                  IconButton(
                    onPressed: () async {
                      await ref
                          .read(adminRepositoryProvider)
                          .deleteGuide(guide.id);
                      ref.invalidate(adminContentProvider);
                      ref.invalidate(learnContentProvider);
                    },
                    icon: const Icon(LucideIcons.trash2,
                        size: 18, color: Colors.red),
                  ),
                ],
              ),
            ),
          );
        }),
      ],
    );
  }
}

/// Ranura de media (portada imagen/video) con estado de subida.
class _MediaSlot extends StatelessWidget {
  const _MediaSlot({
    required this.label,
    required this.done,
    required this.uploading,
    required this.icon,
    required this.onTap,
    required this.onClear,
  });

  final String label;
  final bool done;
  final bool uploading;
  final IconData icon;
  final VoidCallback onTap;
  final VoidCallback onClear;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: uploading ? null : onTap,
      borderRadius: BorderRadius.circular(14),
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: done
              ? AppColors.primary.withOpacity(0.08)
              : Theme.of(context).dividerColor.withOpacity(0.15),
          borderRadius: BorderRadius.circular(14),
          border: Border.all(
            color: done
                ? AppColors.primary.withOpacity(0.4)
                : Theme.of(context).dividerColor,
          ),
        ),
        child: Column(
          children: <Widget>[
            Row(
              children: <Widget>[
                Icon(icon,
                    size: 18,
                    color: done
                        ? AppColors.primary
                        : Theme.of(context)
                            .colorScheme
                            .onSurface
                            .withOpacity(0.5)),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    label,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: Theme.of(context).textTheme.labelSmall,
                  ),
                ),
                if (done)
                  GestureDetector(
                    onTap: onClear,
                    child: const Icon(LucideIcons.x,
                        size: 14, color: Colors.red),
                  ),
              ],
            ),
            const SizedBox(height: 6),
            Text(
              uploading
                  ? 'Subiendo...'
                  : done
                      ? 'Cargado ✓'
                      : 'Toca para subir',
              style: Theme.of(context).textTheme.bodySmall,
            ),
          ],
        ),
      ),
    );
  }
}
