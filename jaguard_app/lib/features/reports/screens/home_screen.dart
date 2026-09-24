import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/widgets/lucide_compat.dart';

import '../../../core/l10n/translations.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/app_scaffold.dart';
import '../domain/report.dart';

/// Pantalla principal: categorías de reporte (paridad con Home.tsx).
class HomeScreen extends ConsumerWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final AppLanguage lang = ref.watch(languageProvider);
    String t(String key, [Map<String, dynamic>? params]) => translate(lang.code, key, params);
    final bool isDark = Theme.of(context).brightness == Brightness.dark;

    final Map<ReportType, Color> colors = const <ReportType, Color>{
      ReportType.avistamiento: AppColors.reportAvistamiento,
      ReportType.huella: AppColors.reportHuella,
      ReportType.depredacion: AppColors.reportDepredacion,
      ReportType.atropellamiento: AppColors.reportAtropellamiento,
      ReportType.trafico: AppColors.reportTrafico,
      ReportType.matanza: AppColors.reportMatanza,
    };

    final Map<ReportType, IconData> icons = const <ReportType, IconData>{
      ReportType.avistamiento: LucideIcons.eye,
      ReportType.huella: Icons.pets_rounded,
      ReportType.depredacion: LucideIcons.skull,
      ReportType.atropellamiento: LucideIcons.car,
      ReportType.trafico: LucideIcons.packageX,
      ReportType.matanza: LucideIcons.alertTriangle,
    };

    return MainShell(
      child: ListView(
        padding: const EdgeInsets.fromLTRB(20, 20, 20, 24),
        children: <Widget>[
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              Text(
                t('home.title'),
                style: Theme.of(context).textTheme.headlineMedium,
              ),
              const SizedBox(height: 6),
              Text(
                t('home.subtitle'),
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      color: Theme.of(context)
                          .colorScheme
                          .onSurface
                          .withOpacity(0.55),
                    ),
              ),
            ],
          ),
          const SizedBox(height: 22),
          GridView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: 2,
              crossAxisSpacing: 14,
              mainAxisSpacing: 14,
              childAspectRatio: 0.92,
            ),
            itemCount: ReportType.values.length,
            itemBuilder: (BuildContext context, int index) {
              final ReportType type = ReportType.values[index];
              final Color color = colors[type]!;
              return _CategoryCard(
                label: type.label,
                icon: icons[type]!,
                color: color,
                dark: isDark,
                onTap: () => context.go('/report/${type.id}'),
              );
            },
          ),
        ],
      ),
    );
  }
}

class _CategoryCard extends StatelessWidget {
  const _CategoryCard({
    required this.label,
    required this.icon,
    required this.color,
    required this.dark,
    required this.onTap,
  });

  final String label;
  final IconData icon;
  final Color color;
  final bool dark;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: dark ? AppColors.darkSurface : AppColors.lightSurface,
      borderRadius: BorderRadius.circular(24),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(24),
        splashColor: color.withOpacity(0.08),
        highlightColor: color.withOpacity(0.05),
        child: Ink(
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(24),
            border: Border.all(color: Theme.of(context).dividerColor),
            boxShadow: <BoxShadow>[
              BoxShadow(
                color: Colors.black.withOpacity(dark ? 0.4 : 0.04),
                blurRadius: 10,
                offset: const Offset(0, 4),
              ),
            ],
          ),
          child: Padding(
            padding: const EdgeInsets.all(14),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: <Widget>[
                Container(
                  width: 56,
                  height: 56,
                  decoration: BoxDecoration(
                    color: color.withOpacity(0.1),
                    shape: BoxShape.circle,
                  ),
                  child: Icon(icon, size: 28, color: color),
                ),
                const SizedBox(height: 14),
                Text(
                  label,
                  textAlign: TextAlign.center,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    fontFamily: AppTheme.fontFamily,
                    fontSize: 13.5,
                    fontWeight: FontWeight.w700,
                    height: 1.25,
                    color:
                        dark ? AppColors.darkText : AppColors.lightText,
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
