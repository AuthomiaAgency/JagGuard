import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/widgets/lucide_compat.dart';

import '../../../core/l10n/translations.dart';
import '../../../core/router/app_router.dart';
import '../../../core/widgets/app_toast.dart';
import '../../../core/widgets/common.dart';
import '../domain/guide.dart';
import '../providers/learn_providers.dart';

/// Lista de guías de un grupo (o guías guardadas offline).
class GroupGuidesScreen extends ConsumerWidget {
  const GroupGuidesScreen({super.key, required this.group});

  final GuideGroupArgs group;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final AppLanguage lang = ref.watch(languageProvider);
    String t(String key, [Map<String, dynamic>? params]) => translate(lang.code, key, params);

    final AsyncValue<({List<GuideGroup> groups, List<Guide> guides})> content =
        ref.watch(learnContentProvider);

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
                        group.name,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: Theme.of(context).textTheme.titleMedium,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
          Expanded(
            child: content.when(
              loading: () => const FullScreenLoader(),
              error: (Object e, StackTrace s) => EmptyState(
                icon: LucideIcons.bookOpen,
                message: t('learn.no_guides'),
              ),
              data: (({List<GuideGroup> groups, List<Guide> guides}) data) {
                final Set<String> savedIds =
                    ref.watch(savedGuideIdsProvider).value ?? <String>{};

                final List<Guide> guides = group.isOffline
                    ? data.guides
                        .where((Guide g) => savedIds.contains(g.id))
                        .toList()
                    : data.guides
                        .where((Guide g) =>
                            g.groupId == group.id || g.groupName == group.name)
                        .toList();

                if (guides.isEmpty) {
                  return EmptyState(
                    icon: LucideIcons.bookOpen,
                    message: group.isOffline
                        ? t('learn.no_saved')
                        : t('learn.no_guides'),
                  );
                }

                return ListView.separated(
                  padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
                  itemCount: guides.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 10),
                  itemBuilder: (BuildContext context, int index) {
                    final Guide guide = guides[index];
                    final bool saved = savedIds.contains(guide.id);
                    return _GuideCard(
                      guide: guide,
                      saved: saved,
                      t: t,
                      onOpen: () =>
                          context.push('/learn/guide/${guide.id}'),
                      onToggleSave: () async {
                        final bool nowSaved = await ref
                            .read(learnRepositoryProvider)
                            .toggleSaved(guide);
                        ref.invalidate(savedGuideIdsProvider);
                        if (context.mounted) {
                          AppToast.show(
                            context,
                            nowSaved
                                ? t('learn.saved_success')
                                : t('learn.removed_success'),
                          );
                        }
                      },
                    );
                  },
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}

class _GuideCard extends StatelessWidget {
  const _GuideCard({
    required this.guide,
    required this.saved,
    required this.t,
    required this.onOpen,
    required this.onToggleSave,
  });

  final Guide guide;
  final bool saved;
  final String Function(String, [Map<String, dynamic>?]) t;
  final VoidCallback onOpen;
  final VoidCallback onToggleSave;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Theme.of(context).colorScheme.surface,
      borderRadius: BorderRadius.circular(20),
      child: InkWell(
        onTap: onOpen,
        borderRadius: BorderRadius.circular(20),
        child: Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: Theme.of(context).dividerColor),
          ),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: <Widget>[
              ClipRRect(
                borderRadius: BorderRadius.circular(14),
                child: Container(
                  width: 72,
                  height: 72,
                  color: Theme.of(context).dividerColor.withOpacity(0.4),
                  child: guide.imageUrl != null && guide.imageUrl!.isNotEmpty
                      ? Image.network(
                          guide.imageUrl!,
                          width: 72,
                          height: 72,
                          fit: BoxFit.cover,
                          errorBuilder: (_, __, ___) => const Center(
                            child: Icon(LucideIcons.fileText,
                                size: 26, color: Colors.grey),
                          ),
                        )
                      : const Center(
                          child: Icon(LucideIcons.fileText,
                              size: 26, color: Colors.grey),
                        ),
                ),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: <Widget>[
                    Text(
                      guide.title,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: Theme.of(context).textTheme.titleSmall,
                    ),
                    if (guide.subtitle?.isNotEmpty == true) ...<Widget>[
                      const SizedBox(height: 3),
                      Text(
                        guide.subtitle!,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: Theme.of(context).textTheme.bodySmall,
                      ),
                    ],
                    const SizedBox(height: 6),
                    Row(
                      children: <Widget>[
                        const Icon(LucideIcons.bookOpen,
                            size: 12, color: Colors.grey),
                        const SizedBox(width: 5),
                        Text(
                          t('learn.read_time',
                              <String, dynamic>{'time': guide.readTime}),
                          style: Theme.of(context).textTheme.bodySmall,
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 6),
              IconButton(
                onPressed: onToggleSave,
                icon: Icon(
                  saved ? LucideIcons.checkCircle : LucideIcons.download,
                  size: 22,
                  color: saved ? const Color(0xFF10B981) : Colors.grey,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
