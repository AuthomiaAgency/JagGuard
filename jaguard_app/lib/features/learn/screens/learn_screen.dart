import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/widgets/lucide_compat.dart';

import '../../../core/l10n/translations.dart';
import '../../../core/router/app_router.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/app_scaffold.dart';
import '../../../core/widgets/common.dart';
import '../domain/guide.dart';
import '../providers/learn_providers.dart';

/// Módulo Aprender: grupos temáticos + guías guardadas offline.
class LearnScreen extends ConsumerWidget {
  const LearnScreen({super.key});

  static const Map<String, IconData> _iconMap = <String, IconData>{
    'paw': Icons.pets_rounded,
    'shield': LucideIcons.shield,
    'eye': LucideIcons.eye,
    'alert': LucideIcons.alertTriangle,
    'info': LucideIcons.info,
    'map': LucideIcons.map,
    'camera': LucideIcons.camera,
    'leaf': LucideIcons.leaf,
    'zap': LucideIcons.zap,
    'heart': LucideIcons.heart,
    'book': LucideIcons.bookOpen,
    'file': LucideIcons.fileText,
  };

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final AppLanguage lang = ref.watch(languageProvider);
    String t(String key, [Map<String, dynamic>? params]) => translate(lang.code, key, params);

    final AsyncValue<({List<GuideGroup> groups, List<Guide> guides})> content =
        ref.watch(learnContentProvider);
    final Set<String> savedIds =
        ref.watch(savedGuideIdsProvider).value ?? <String>{};

    return MainShell(
      child: content.when(
        loading: () => const FullScreenLoader(),
        error: (Object error, StackTrace stack) => EmptyState(
          icon: LucideIcons.bookOpen,
          message: t('learn.no_guides'),
        ),
        data: (({List<GuideGroup> groups, List<Guide> guides}) data) {
          return ListView(
            padding: const EdgeInsets.fromLTRB(20, 20, 20, 24),
            children: <Widget>[
              ShaderMask(
                shaderCallback: (Rect bounds) => const LinearGradient(
                  colors: <Color>[AppColors.primary, Color(0xFF34D399)],
                ).createShader(bounds),
                child: Text(
                  t('learn.title'),
                  style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                        color: Colors.white,
                      ),
                ),
              ),
              const SizedBox(height: 6),
              Text(
                t('learn.subtitle'),
                style: Theme.of(context).textTheme.bodyMedium,
              ),
              const SizedBox(height: 22),
              SectionTitle(t('learn.categories')),
              const SizedBox(height: 12),

              // Categoría offline: guías descargadas
              _GroupTile(
                icon: LucideIcons.download,
                name: t('learn.saved_offline'),
                subtitle: t('learn.saved_count',
                    <String, dynamic>{'count': savedIds.length}),
                accent: true,
                onTap: () => context.push(
                  '/learn/group',
                  extra: GuideGroupArgs(
                    id: 'offline',
                    name: t('learn.saved_offline'),
                    isOffline: true,
                  ),
                ),
              ),
              const SizedBox(height: 10),

              if (data.groups.isEmpty)
                EmptyState(
                  icon: LucideIcons.bookOpen,
                  message: t('learn.no_guides'),
                )
              else
                ...data.groups.map((GuideGroup group) {
                  final int count = data.guides
                      .where((Guide g) =>
                          g.groupId == group.id || g.groupName == group.name)
                      .length;
                  return Padding(
                    padding: const EdgeInsets.only(bottom: 10),
                    child: _GroupTile(
                      icon: _iconMap[group.icon] ?? LucideIcons.bookOpen,
                      name: group.name,
                      subtitle: '$count publicaciones',
                      onTap: () => context.push(
                        '/learn/group',
                        extra: GuideGroupArgs(
                            id: group.id, name: group.name),
                      ),
                    ),
                  );
                }),
            ],
          );
        },
      ),
    );
  }
}

class _GroupTile extends StatelessWidget {
  const _GroupTile({
    required this.icon,
    required this.name,
    required this.subtitle,
    required this.onTap,
    this.accent = false,
  });

  final IconData icon;
  final String name;
  final String subtitle;
  final VoidCallback onTap;
  final bool accent;

  @override
  Widget build(BuildContext context) {
    final Color base = accent ? const Color(0xFF10B981) : AppColors.primary;

    return Material(
      color: accent ? base.withOpacity(0.08) : Theme.of(context).colorScheme.surface,
      borderRadius: BorderRadius.circular(18),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(18),
        child: Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(18),
            border: Border.all(
              color: accent
                  ? base.withOpacity(0.3)
                  : Theme.of(context).dividerColor,
            ),
          ),
          child: Row(
            children: <Widget>[
              Container(
                width: 46,
                height: 46,
                decoration: BoxDecoration(
                  color: base.withOpacity(0.12),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(icon, size: 22, color: base),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: <Widget>[
                    Text(
                      name,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: Theme.of(context).textTheme.titleSmall,
                    ),
                    const SizedBox(height: 2),
                    Text(
                      subtitle,
                      style: Theme.of(context).textTheme.bodySmall,
                    ),
                  ],
                ),
              ),
              Icon(LucideIcons.chevronRight,
                  size: 20,
                  color: Theme.of(context).colorScheme.onSurface.withOpacity(0.3)),
            ],
          ),
        ),
      ),
    );
  }
}
