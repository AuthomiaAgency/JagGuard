import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/widgets/lucide_compat.dart';

import '../../../core/config/app_config.dart';
import '../../../core/l10n/translations.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/app_toast.dart';
import '../../../core/widgets/app_scaffold.dart';
import '../../../core/widgets/common.dart';
import '../../auth/domain/user_profile.dart';
import '../../auth/providers/auth_providers.dart';
import '../../reports/domain/report.dart';
import '../providers/profile_providers.dart';

/// Perfil del usuario: puntos, canjes, historial y ajustes.
class ProfileScreen extends ConsumerWidget {
  const ProfileScreen({super.key});

  Future<void> _redeemFlow(BuildContext context, WidgetRef ref) async {
    final AppLanguage lang = ref.read(languageProvider);
    String t(String key, [Map<String, dynamic>? params]) => translate(lang.code, key, params);

    final bool? confirmed = await showDialog<bool>(
      context: context,
      builder: (BuildContext dialogContext) => AlertDialog(
        title: Text(t('profile.confirm_redeem_title'),
            style: Theme.of(context).textTheme.titleMedium),
        content: Text(t('profile.confirm_redeem_desc')),
        actions: <Widget>[
          TextButton(
            onPressed: () => Navigator.of(dialogContext).pop(false),
            child: Text(t('profile.cancel')),
          ),
          FilledButton(
            onPressed: () => Navigator.of(dialogContext).pop(true),
            child: Text(t('profile.yes_redeem')),
          ),
        ],
      ),
    );
    if (confirmed != true || !context.mounted) return;

    final String? error =
        await requestRedemption(ref.read(supabaseClientProvider));
    if (!context.mounted) return;
    if (error == null) {
      ref.read(sessionProvider.notifier).adjustPoints(-AppConfig.redeemGoalPoints);
      ref.read(sessionProvider.notifier).refreshProfile();
      ref.invalidate(myReportsProvider);
      AppToast.show(context, t('profile.redeem_success'));
    } else {
      AppToast.show(context, error, error: true);
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final AppLanguage lang = ref.watch(languageProvider);
    String t(String key, [Map<String, dynamic>? params]) => translate(lang.code, key, params);

    final UserProfile? profile = ref.watch(sessionProvider).profile;
    if (profile == null) {
      return const MainShell(child: FullScreenLoader());
    }

    final bool isAdmin = profile.isAdmin;
    final int points = profile.points;
    final double progress =
        (points / AppConfig.redeemGoalPoints).clamp(0.0, 1.0);
    final int reportCount = ref.watch(myReportsProvider).value
            ?.where((Report r) =>
                r.createdAt.isAfter(
                    DateTime.now().subtract(const Duration(days: 30))))
            .length ??
        0;

    return MainShell(
      child: ListView(
        padding: const EdgeInsets.fromLTRB(20, 20, 20, 24),
        children: <Widget>[
          // Encabezado del perfil
          Column(
            children: <Widget>[
              Container(
                width: 92,
                height: 92,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  border: Border.all(color: AppColors.primary, width: 3),
                  color: Theme.of(context).dividerColor.withOpacity(0.3),
                ),
                child: ClipOval(
                  child: Image.network(
                    profile.avatar,
                    fit: BoxFit.cover,
                    errorBuilder: (_, __, ___) => const Icon(
                        LucideIcons.user,
                        size: 36,
                        color: Colors.grey),
                  ),
                ),
              ),
              const SizedBox(height: 12),
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: <Widget>[
                  Flexible(
                    child: Text(
                      profile.name,
                      overflow: TextOverflow.ellipsis,
                      style: Theme.of(context).textTheme.titleLarge,
                    ),
                  ),
                  if (isAdmin) ...<Widget>[
                    const SizedBox(width: 8),
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(
                        color: AppColors.primarySoft,
                        borderRadius: BorderRadius.circular(999),
                      ),
                      child: const Text(
                        'ADMIN',
                        style: TextStyle(
                          fontFamily: AppTheme.fontFamily,
                          fontSize: 9,
                          fontWeight: FontWeight.w900,
                          letterSpacing: 1,
                          color: AppColors.primary,
                        ),
                      ),
                    ),
                  ],
                ],
              ),
              const SizedBox(height: 4),
              Text(
                profile.displayContact,
                style: Theme.of(context).textTheme.bodyMedium,
              ),
            ],
          ),
          const SizedBox(height: 22),

          // Tarjeta de puntos (solo usuarios)
          if (!isAdmin) ...<Widget>[
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: <Color>[AppColors.primary, Color(0xFFEA580C)],
                ),
                borderRadius: BorderRadius.circular(26),
                boxShadow: <BoxShadow>[
                  BoxShadow(
                    color: AppColors.primary.withOpacity(0.35),
                    blurRadius: 22,
                    offset: const Offset(0, 8),
                  ),
                ],
              ),
              child: Column(
                children: <Widget>[
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: <Widget>[
                      const Row(
                        children: <Widget>[
                          Icon(LucideIcons.award,
                              size: 20, color: Color(0xFFFDE047)),
                          SizedBox(width: 8),
                          Text(
                            'Mis Puntos',
                            style: TextStyle(
                              fontFamily: AppTheme.fontFamily,
                              fontSize: 16,
                              fontWeight: FontWeight.w800,
                              color: Colors.white,
                            ),
                          ),
                        ],
                      ),
                      Text(
                        '$points / ${AppConfig.redeemGoalPoints}',
                        style: const TextStyle(
                          fontFamily: AppTheme.fontFamily,
                          fontSize: 20,
                          fontWeight: FontWeight.w900,
                          color: Colors.white,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 14),
                  ClipRRect(
                    borderRadius: BorderRadius.circular(999),
                    child: LinearProgressIndicator(
                      value: progress,
                      minHeight: 12,
                      backgroundColor: Colors.black.withOpacity(0.2),
                      valueColor: const AlwaysStoppedAnimation<Color>(
                          Color(0xFFFDE047)),
                    ),
                  ),
                  const SizedBox(height: 14),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: <Widget>[
                      Expanded(
                        child: Text(
                          points >= AppConfig.redeemGoalPoints
                              ? t('profile.redeem_goal')
                              : t('profile.redeem_missing', <String, dynamic>{
                                  'points':
                                      AppConfig.redeemGoalPoints - points
                                }),
                          style: const TextStyle(
                            fontFamily: AppTheme.fontFamily,
                            fontSize: 13,
                            fontWeight: FontWeight.w600,
                            color: Colors.white,
                          ),
                        ),
                      ),
                      const SizedBox(width: 10),
                      FilledButton(
                        style: FilledButton.styleFrom(
                          backgroundColor: Colors.white,
                          foregroundColor: AppColors.primary,
                          minimumSize: const Size(110, 42),
                          padding: EdgeInsets.zero,
                        ),
                        onPressed:
                            points >= AppConfig.redeemGoalPoints
                                ? () => _redeemFlow(context, ref)
                                : null,
                        child: Text(t('profile.redeem')),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 14),

            // Reportes (30 días)
            InkWell(
              onTap: () => context.push('/profile/history'),
              borderRadius: BorderRadius.circular(22),
              child: Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: Theme.of(context).colorScheme.surface,
                  borderRadius: BorderRadius.circular(22),
                  border: Border.all(color: Theme.of(context).dividerColor),
                ),
                child: Row(
                  children: <Widget>[
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: <Widget>[
                          Text(
                            t('profile.reports_30_days'),
                            style: Theme.of(context).textTheme.bodySmall,
                          ),
                          const SizedBox(height: 4),
                          Text('$reportCount',
                              style: Theme.of(context)
                                  .textTheme
                                  .headlineMedium),
                        ],
                      ),
                    ),
                    Container(
                      width: 48,
                      height: 48,
                      decoration: BoxDecoration(
                        color: AppColors.primarySoft,
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(LucideIcons.fileText,
                          size: 22, color: AppColors.primary),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 14),
          ],

          // Acciones
          _ProfileActionTile(
            icon: LucideIcons.settings,
            label: t('profile.settings'),
            onTap: () => context.push('/profile/settings'),
          ),
          const SizedBox(height: 10),
          _ProfileActionTile(
            icon: LucideIcons.helpCircle,
            label: t('profile.tutorial'),
            onTap: () async {
              await ref.read(sessionProvider.notifier).replayOnboarding();
              if (context.mounted) context.push('/onboarding');
            },
          ),
          const SizedBox(height: 10),
          _ProfileActionTile(
            icon: LucideIcons.logOut,
            label: t('profile.logout'),
            danger: true,
            onTap: () async {
              await ref.read(sessionProvider.notifier).logout();
              if (context.mounted) context.go('/login');
            },
          ),
          const SizedBox(height: 36),
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: <Widget>[
              const Icon(LucideIcons.mail, size: 12, color: Colors.grey),
              const SizedBox(width: 6),
              Text(
                '${t('profile.support')}: ${AppConfig.supportEmail}',
                style: Theme.of(context).textTheme.bodySmall,
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _ProfileActionTile extends StatelessWidget {
  const _ProfileActionTile({
    required this.icon,
    required this.label,
    required this.onTap,
    this.danger = false,
  });

  final IconData icon;
  final String label;
  final VoidCallback onTap;
  final bool danger;

  @override
  Widget build(BuildContext context) {
    final Color tone =
        danger ? AppColors.danger : Theme.of(context).colorScheme.onSurface;

    return Material(
      color: Theme.of(context).colorScheme.surface,
      borderRadius: BorderRadius.circular(18),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(18),
        child: Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(18),
            border: Border.all(color: Theme.of(context).dividerColor),
          ),
          child: Row(
            children: <Widget>[
              Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  color: danger
                      ? AppColors.danger.withOpacity(0.1)
                      : Theme.of(context).dividerColor.withOpacity(0.5),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(icon, size: 20, color: tone),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Text(label,
                    style: Theme.of(context).textTheme.titleSmall),
              ),
              if (!danger)
                Icon(LucideIcons.chevronRight,
                    size: 18,
                    color:
                        Theme.of(context).colorScheme.onSurface.withOpacity(0.3)),
            ],
          ),
        ),
      ),
    );
  }
}
