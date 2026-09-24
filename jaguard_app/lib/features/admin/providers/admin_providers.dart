import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/services/app_database.dart';
import '../../learn/domain/guide.dart';
import '../data/admin_repository.dart';
import '../../auth/providers/auth_providers.dart';

final Provider<AdminRepository> adminRepositoryProvider =
    Provider<AdminRepository>(
        (Ref ref) => AdminRepository(ref.watch(supabaseClientProvider)));

/// Vista agregada del dashboard, invalidable tras acciones.
final FutureProvider<AdminOverview> adminOverviewProvider =
    FutureProvider<AdminOverview>((Ref ref) =>
        ref.watch(adminRepositoryProvider).fetchOverview());

/// Grupos y guías del CMS.
final FutureProvider<(List<GuideGroupRef>, List<GuideEntry>)>
    adminContentProvider = FutureProvider<(List<GuideGroupRef>, List<GuideEntry>)>(
        (Ref ref) async {
  final AdminRepository repo = ref.watch(adminRepositoryProvider);
  final List<GuideGroupRef> groups = (await repo.fetchGroups())
      .map((GuideGroup g) => GuideGroupRef(id: g.id, name: g.name, icon: g.icon))
      .toList();
  final List<GuideEntry> guides = (await repo.fetchGuides())
      .map((Guide g) => GuideEntry(
            id: g.id,
            title: g.title,
            subtitle: g.subtitle,
            content: g.content,
            groupId: g.groupId,
            groupName: g.groupName,
            imageUrl: g.imageUrl,
            videoUrl: g.videoUrl,
            readTime: g.readTime,
            files: g.files,
          ))
      .toList();
  return (groups, guides);
});

/// Referencia ligera de grupo para el CMS.
class GuideGroupRef {
  const GuideGroupRef({required this.id, required this.name, this.icon = 'paw'});
  final String id;
  final String name;
  final String icon;
}

/// Entrada editable de guía para el CMS.
class GuideEntry {
  const GuideEntry({
    required this.id,
    required this.title,
    required this.content,
    required this.readTime,
    required this.files,
    this.subtitle,
    this.groupId,
    this.groupName,
    this.imageUrl,
    this.videoUrl,
  });

  final String id;
  final String title;
  final String? subtitle;
  final String content;
  final String? groupId;
  final String? groupName;
  final String? imageUrl;
  final String? videoUrl;
  final int readTime;
  final List<GuideFile> files;
}

/// Contador de cola offline mostrado en el shell.
final FutureProvider<int> pendingSyncCountProvider =
    FutureProvider<int>((Ref ref) => AppDatabase.instance.countPendingReports());
