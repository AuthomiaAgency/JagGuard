import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../features/auth/domain/user_profile.dart';
import '../../features/auth/providers/auth_providers.dart';
import '../l10n/translations.dart';
import '../theme/app_theme.dart';
import 'common.dart';
import 'lucide_compat.dart';

/// Barra de navegación inferior para usuarios (paridad con Navigation.tsx):
/// Reportar · Aprender · Perfil.
class AppBottomNav extends ConsumerWidget {
  const AppBottomNav({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final AppLanguage lang = ref.watch(languageProvider);
    String t(String key, [Map<String, dynamic>? params]) =>
        translate(lang.code, key, params);

    final String path = GoRouterState.of(context).matchedLocation;

    return Container(
      decoration: BoxDecoration(
        color: (Theme.of(context).brightness == Brightness.dark
                ? AppColors.darkSurface
                : AppColors.lightSurface)
            .withOpacity(0.96),
        border: Border(
          top: BorderSide(color: Theme.of(context).dividerColor),
        ),
      ),
      child: SafeArea(
        top: false,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: <Widget>[
              _NavItem(
                icon: LucideIcons.home,
                label: t('nav.report'),
                selected: path == '/',
                onTap: () => context.go('/'),
              ),
              _NavItem(
                icon: LucideIcons.bookOpen,
                label: t('nav.learn'),
                selected: path.startsWith('/learn'),
                onTap: () => context.go('/learn'),
              ),
              _NavItem(
                icon: LucideIcons.user,
                label: t('nav.profile'),
                selected: path.startsWith('/profile'),
                onTap: () => context.go('/profile'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _NavItem extends StatelessWidget {
  const _NavItem({
    required this.icon,
    required this.label,
    required this.selected,
    required this.onTap,
  });

  final IconData icon;
  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final Color color = selected
        ? AppColors.primary
        : Theme.of(context).colorScheme.onSurface.withOpacity(0.38);

    return Expanded(
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 4),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: <Widget>[
              AnimatedContainer(
                duration: const Duration(milliseconds: 220),
                padding:
                    const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
                decoration: BoxDecoration(
                  color: selected ? AppColors.primarySoft : Colors.transparent,
                  borderRadius: BorderRadius.circular(999),
                ),
                child: Icon(icon, size: 22, color: color),
              ),
              const SizedBox(height: 4),
              Text(
                label,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(
                  fontFamily: AppTheme.fontFamily,
                  fontSize: 10,
                  fontWeight: FontWeight.w800,
                  letterSpacing: 0.4,
                  color: color,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Sidebar admin — dashboard de escritorio con navegación lateral
// ---------------------------------------------------------------------------

/// Panel lateral de administración: marca, navegación (Dashboard, Editor,
/// Aprender, Perfil) y tarjeta de usuario con cierre de sesión.
class AdminSidebar extends ConsumerWidget {
  const AdminSidebar({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final AppLanguage lang = ref.watch(languageProvider);
    String t(String key, [Map<String, dynamic>? params]) =>
        translate(lang.code, key, params);

    final String path = GoRouterState.of(context).matchedLocation;
    final UserProfile? profile = ref.watch(sessionProvider).profile;
    final bool isDark = Theme.of(context).brightness == Brightness.dark;
    final Color idle = Theme.of(context).colorScheme.onSurface.withOpacity(0.45);

    return Material(
      color: isDark ? AppColors.darkSurface : AppColors.lightSurface,
      child: Container(
        width: 248,
        decoration: BoxDecoration(
          border: Border(
            right: BorderSide(color: Theme.of(context).dividerColor),
          ),
        ),
        child: SafeArea(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              Padding(
                padding: const EdgeInsets.fromLTRB(20, 20, 20, 8),
                child: BrandMark(size: 40, showWordmark: true),
              ),
              const SizedBox(height: 18),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20),
                child: Text(
                  t('admin.panel_section'),
                  style: Theme.of(context).textTheme.labelSmall,
                ),
              ),
              const SizedBox(height: 8),
              _SideItem(
                icon: LucideIcons.barChart3,
                label: t('nav.dashboard'),
                selected: path == '/admin',
                onTap: () => context.go('/admin'),
              ),
              _SideItem(
                icon: LucideIcons.edit3,
                label: t('nav.editor'),
                selected: path.startsWith('/admin/editor'),
                onTap: () => context.go('/admin/editor'),
              ),
              _SideItem(
                icon: LucideIcons.bookOpen,
                label: t('nav.learn'),
                selected: path.startsWith('/learn'),
                onTap: () => context.go('/learn'),
              ),
              _SideItem(
                icon: LucideIcons.user,
                label: t('nav.profile'),
                selected: path.startsWith('/profile'),
                onTap: () => context.go('/profile'),
              ),
              const Spacer(),
              Divider(height: 1, color: Theme.of(context).dividerColor),
              Padding(
                padding: const EdgeInsets.all(14),
                child: Row(
                  children: <Widget>[
                    CircleAvatar(
                      radius: 17,
                      backgroundColor: AppColors.primarySoft,
                      backgroundImage: profile != null
                          ? NetworkImage(profile.avatar)
                          : null,
                      child: profile == null
                          ? const Icon(LucideIcons.user,
                              size: 18, color: AppColors.primary)
                          : null,
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: <Widget>[
                          Text(
                            profile?.name ?? 'Admin',
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: Theme.of(context).textTheme.titleSmall,
                          ),
                          Text(
                            'Administrador',
                            style: Theme.of(context).textTheme.bodySmall,
                          ),
                        ],
                      ),
                    ),
                    IconButton(
                      tooltip: t('profile.logout'),
                      onPressed: () async {
                        await ref.read(sessionProvider.notifier).logout();
                        if (context.mounted) context.go('/login');
                      },
                      icon: Icon(LucideIcons.logOut, size: 18, color: idle),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _SideItem extends StatelessWidget {
  const _SideItem({
    required this.icon,
    required this.label,
    required this.selected,
    required this.onTap,
  });

  final IconData icon;
  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final Color color = selected
        ? AppColors.primary
        : Theme.of(context).colorScheme.onSurface.withOpacity(0.5);

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 10),
      child: Material(
        color: selected ? AppColors.primarySoft : Colors.transparent,
        borderRadius: BorderRadius.circular(14),
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(14),
          child: Container(
            width: double.infinity,
            padding:
                const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
            child: Row(
              children: <Widget>[
                Icon(icon, size: 19, color: color),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    label,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      fontFamily: AppTheme.fontFamily,
                      fontSize: 13.5,
                      fontWeight:
                          selected ? FontWeight.w800 : FontWeight.w600,
                      color: color,
                    ),
                  ),
                ),
                if (selected)
                  Container(
                    width: 5,
                    height: 5,
                    decoration: const BoxDecoration(
                      color: AppColors.primary,
                      shape: BoxShape.circle,
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

/// Estructura común de pantallas.
///  - Usuarios: header superior + navegación inferior.
///  - Admins: sidebar lateral de dashboard (sin barra inferior).
class MainShell extends ConsumerWidget {
  const MainShell({super.key, required this.child, this.includeHeader = true});

  final Widget child;
  final bool includeHeader;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final bool isAdmin = ref.watch(sessionProvider).isAdmin;

    if (isAdmin) {
      return Scaffold(
        body: Row(
          children: <Widget>[
            const AdminSidebar(),
            Expanded(
              child: Column(
                children: <Widget>[
                  Expanded(child: child),
                ],
              ),
            ),
          ],
        ),
      );
    }

    return Scaffold(
      body: Column(
        children: <Widget>[
          if (includeHeader) const AppHeader(),
          Expanded(child: child),
        ],
      ),
      bottomNavigationBar: const AppBottomNav(),
    );
  }
}
