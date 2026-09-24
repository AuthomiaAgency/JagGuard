import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/widgets/lucide_compat.dart';

import '../../../core/l10n/translations.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/utils/formatters.dart';
import '../../../core/widgets/common.dart';
import '../providers/profile_providers.dart';
import '../../reports/domain/report.dart';

/// Historial de reportes de los últimos 30 días (paridad con History modal).
class ReportHistoryScreen extends ConsumerWidget {
  const ReportHistoryScreen({super.key});

  static const Map<String, IconData> _animalIcons = <String, IconData>{
    'jaguar': Icons.pets_rounded,
    'puma': LucideIcons.cat,
    'otros': LucideIcons.search,
  };

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final AppLanguage lang = ref.watch(languageProvider);
    String t(String key, [Map<String, dynamic>? params]) => translate(lang.code, key, params);

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
                        t('profile.history_title'),
                        style: Theme.of(context).textTheme.titleMedium,
                      ),
                    ),
                    IconButton(
                      onPressed: () => ref.invalidate(myReportsProvider),
                      icon: const Icon(LucideIcons.refreshCw, size: 18),
                    ),
                  ],
                ),
              ),
            ),
          ),
          Expanded(
            child: ref.watch(myReportsProvider).when(
                  loading: () => const FullScreenLoader(),
                  error: (Object e, StackTrace s) => EmptyState(
                    icon: LucideIcons.alertTriangle,
                    message: 'Error al cargar el historial',
                  ),
                  data: (List<Report> reports) {
                    final List<Report> recent = reports
                        .where((Report r) => r.createdAt.isAfter(
                            DateTime.now().subtract(const Duration(days: 30))))
                        .toList();
                    if (recent.isEmpty) {
                      return EmptyState(
                        icon: LucideIcons.fileText,
                        message: t('profile.no_reports'),
                      );
                    }
                    return ListView.separated(
                      padding: const EdgeInsets.all(16),
                      itemCount: recent.length,
                      separatorBuilder: (_, __) => const SizedBox(height: 10),
                      itemBuilder: (BuildContext context, int index) {
                        final Report report = recent[index];
                        final IconData animalIcon = _animalIcons[report.animal] ??
                            LucideIcons.helpCircle;
                        return Container(
                          padding: const EdgeInsets.all(16),
                          decoration: BoxDecoration(
                            color: Theme.of(context).colorScheme.surface,
                            borderRadius: BorderRadius.circular(18),
                            border: Border.all(
                                color: Theme.of(context).dividerColor),
                          ),
                          child: Row(
                            children: <Widget>[
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: <Widget>[
                                    Text(
                                      report.type.replaceAll('-', ' '),
                                      style:
                                          Theme.of(context).textTheme.titleSmall,
                                    ),
                                    const SizedBox(height: 4),
                                    Row(
                                      children: <Widget>[
                                        StatusChip(
                                          label: switch (report.status) {
                                            ReportStatus.verified =>
                                              t('admin.status_verified'),
                                            ReportStatus.denied =>
                                              t('admin.status_denied'),
                                            ReportStatus.pending =>
                                              t('admin.status_pending'),
                                          },
                                          color: switch (report.status) {
                                            ReportStatus.verified =>
                                              AppColors.primary,
                                            ReportStatus.denied =>
                                              AppColors.danger,
                                            ReportStatus.pending =>
                                              AppColors.warning,
                                          },
                                        ),
                                        const SizedBox(width: 8),
                                        Text(
                                          Formatters.shortDate(
                                              report.createdAt),
                                          style: Theme.of(context)
                                              .textTheme
                                              .bodySmall,
                                        ),
                                      ],
                                    ),
                                  ],
                                ),
                              ),
                              Icon(animalIcon,
                                  size: 30,
                                  color: AppColors.primary.withOpacity(0.85)),
                            ],
                          ),
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
