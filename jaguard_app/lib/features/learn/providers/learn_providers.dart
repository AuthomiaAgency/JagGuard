import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/services/app_database.dart';
import '../../../core/services/connectivity_service.dart';
import '../../auth/providers/auth_providers.dart';
import '../data/learn_repository.dart';
import '../domain/guide.dart';

final Provider<LearnRepository> learnRepositoryProvider =
    Provider<LearnRepository>((Ref ref) => LearnRepository(
          ref.watch(supabaseClientProvider),
          AppDatabase.instance,
        ));

/// Contenido educativo (grupos + guías) con caché offline.
final FutureProvider<({List<GuideGroup> groups, List<Guide> guides})>
    learnContentProvider = FutureProvider<
        ({List<GuideGroup> groups, List<Guide> guides})>((Ref ref) async {
  final bool online = ref.watch(onlineProvider);
  return ref.watch(learnRepositoryProvider).fetchContent(online: online);
});

/// Ids de guías guardadas para lectura offline (reactivo).
final FutureProvider<Set<String>> savedGuideIdsProvider =
    FutureProvider<Set<String>>((Ref ref) async {
  final List<Guide> saved = await ref.watch(learnRepositoryProvider).savedGuides();
  return saved.map((Guide g) => g.id).toSet();
});
