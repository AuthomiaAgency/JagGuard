import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/widgets/lucide_compat.dart';

import '../../../core/l10n/translations.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/theme/theme_controller.dart';
import '../../../core/widgets/app_toast.dart';
import '../../auth/domain/user_profile.dart';
import '../../auth/providers/auth_providers.dart';

/// Avatares predeterminados (paridad con RURAL_AVATARS de la web).
const List<String> kRuralAvatars = <String>[
  'https://api.dicebear.com/7.x/notionists-neutral/svg?seed=Felix',
  'https://api.dicebear.com/7.x/notionists-neutral/svg?seed=Aneka',
  'https://api.dicebear.com/7.x/notionists-neutral/svg?seed=Jude',
  'https://api.dicebear.com/7.x/notionists-neutral/svg?seed=Avery',
  'https://api.dicebear.com/7.x/notionists-neutral/svg?seed=Emery',
  'https://api.dicebear.com/7.x/notionists-neutral/svg?seed=Brooklynn',
];

/// Configuración del perfil: avatar, nombre, tema, idioma y contraseña.
class ProfileSettingsScreen extends ConsumerStatefulWidget {
  const ProfileSettingsScreen({super.key});

  @override
  ConsumerState<ProfileSettingsScreen> createState() =>
      _ProfileSettingsScreenState();
}

class _ProfileSettingsScreenState extends ConsumerState<ProfileSettingsScreen> {
  late final TextEditingController _name;
  late String _avatar;
  bool _saving = false;
  bool _savingPassword = false;

  final TextEditingController _newPassword = TextEditingController();
  final TextEditingController _confirmPassword = TextEditingController();

  @override
  void initState() {
    super.initState();
    final UserProfile? profile = ref.read(sessionProvider).profile;
    _name = TextEditingController(text: profile?.name ?? '');
    _avatar = profile?.avatar ?? kRuralAvatars.first;
  }

  @override
  void dispose() {
    _name.dispose();
    _newPassword.dispose();
    _confirmPassword.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    final AppLanguage lang = ref.read(languageProvider);
    String t(String key, [Map<String, dynamic>? params]) => translate(lang.code, key, params);
    if (_name.text.trim().isEmpty) return;

    setState(() => _saving = true);
    try {
      await ref
          .read(sessionProvider.notifier)
          .updateProfileData(_name.text.trim(), _avatar);
      if (!mounted) return;
      AppToast.show(context, t('profile.success_update'));
      context.pop();
    } catch (_) {
      if (mounted) {
        AppToast.show(context, t('profile.error_update'), error: true);
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  Future<void> _changePassword() async {
    final AppLanguage lang = ref.read(languageProvider);
    String t(String key, [Map<String, dynamic>? params]) => translate(lang.code, key, params);

    final String p1 = _newPassword.text;
    final String p2 = _confirmPassword.text;
    if (p1.isEmpty || p2.isEmpty) {
      AppToast.show(context, t('profile.error_password_fields'), error: true);
      return;
    }
    if (p1 != p2) {
      AppToast.show(context, t('profile.error_password_match'), error: true);
      return;
    }
    if (p1.length < 6) {
      AppToast.show(context, t('profile.error_password_length'), error: true);
      return;
    }

    setState(() => _savingPassword = true);
    try {
      await ref
          .read(authRepositoryProvider)
          .updatePassword(p1);
      if (!mounted) return;
      AppToast.show(context, t('profile.success_password'));
      _newPassword.clear();
      _confirmPassword.clear();
      Navigator.of(context).pop();
    } catch (e) {
      if (mounted) AppToast.show(context, e.toString(), error: true);
    } finally {
      if (mounted) setState(() => _savingPassword = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final AppLanguage lang = ref.watch(languageProvider);
    String t(String key, [Map<String, dynamic>? params]) => translate(lang.code, key, params);
    final ThemeModePref themePref = ref.watch(themeControllerProvider);
    final UserProfile? profile = ref.watch(sessionProvider).profile;

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
                        t('profile.edit_profile'),
                        style: Theme.of(context).textTheme.titleMedium,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
          Expanded(
            child: ListView(
              padding: const EdgeInsets.fromLTRB(20, 18, 20, 32),
              children: <Widget>[
                Text(t('profile.avatar'), style: Theme.of(context).textTheme.labelMedium),
                const SizedBox(height: 14),
                Center(
                  child: Container(
                    width: 120,
                    height: 120,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      border: Border.all(color: AppColors.primary, width: 3),
                    ),
                    child: ClipOval(
                      child: Image.network(
                        _avatar,
                        fit: BoxFit.cover,
                        errorBuilder: (_, __, ___) =>
                            const Icon(LucideIcons.user, size: 40, color: Colors.grey),
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 18),
                GridView.builder(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                    crossAxisCount: 4,
                    mainAxisSpacing: 12,
                    crossAxisSpacing: 12,
                  ),
                  itemCount: kRuralAvatars.length,
                  itemBuilder: (BuildContext context, int index) {
                    final String url = kRuralAvatars[index];
                    final bool selected = _avatar == url;
                    return GestureDetector(
                      onTap: () => setState(() => _avatar = url),
                      child: Container(
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          border: Border.all(
                            color: selected
                                ? AppColors.primary
                                : Colors.transparent,
                            width: 2.5,
                          ),
                        ),
                        child: ClipOval(
                          child: Image.network(
                            url,
                            fit: BoxFit.cover,
                            errorBuilder: (_, __, ___) =>
                                const ColoredBox(color: Colors.grey),
                          ),
                        ),
                      ),
                    );
                  },
                ),
                const SizedBox(height: 24),
                Text(t('profile.personal_info'),
                    style: Theme.of(context).textTheme.labelMedium),
                const SizedBox(height: 12),
                Text(t('profile.full_name'),
                    style: Theme.of(context).textTheme.labelLarge),
                const SizedBox(height: 6),
                TextFormField(controller: _name),
                const SizedBox(height: 12),
                Text(t('profile.contact'),
                    style: Theme.of(context).textTheme.labelLarge),
                const SizedBox(height: 6),
                TextFormField(
                  initialValue: profile?.displayContact ?? '',
                  enabled: false,
                ),
                const SizedBox(height: 18),
                if (profile?.displayContact.contains('@') == true &&
                    !profile!.displayContact.contains('@coex5.local') &&
                    !profile.displayContact.contains('@jaguard.local'))
                  OutlinedButton.icon(
                    onPressed: () => showDialog<void>(
                      context: context,
                      builder: (BuildContext dialogContext) => AlertDialog(
                        title: Text(t('profile.change_password'),
                            style: Theme.of(context).textTheme.titleMedium),
                        content: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: <Widget>[
                            TextField(
                              controller: _newPassword,
                              obscureText: true,
                              decoration: InputDecoration(
                                  labelText: t('profile.new_password')),
                            ),
                            const SizedBox(height: 12),
                            TextField(
                              controller: _confirmPassword,
                              obscureText: true,
                              decoration: InputDecoration(
                                  labelText: t('profile.confirm_password')),
                            ),
                          ],
                        ),
                        actions: <Widget>[
                          TextButton(
                            onPressed: () => Navigator.of(dialogContext).pop(),
                            child: Text(t('profile.cancel')),
                          ),
                          FilledButton(
                            onPressed:
                                _savingPassword ? null : _changePassword,
                            child: _savingPassword
                                ? const SizedBox(
                                    width: 18,
                                    height: 18,
                                    child: CircularProgressIndicator(
                                        strokeWidth: 2.2))
                                : Text(t('profile.save')),
                          ),
                        ],
                      ),
                    ),
                    icon: const Icon(LucideIcons.lock, size: 18),
                    label: Text(t('profile.change_password')),
                  ),
                const SizedBox(height: 24),
                Text(t('profile.preferences'),
                    style: Theme.of(context).textTheme.labelMedium),
                const SizedBox(height: 12),
                Container(
                  decoration: BoxDecoration(
                    color: Theme.of(context).colorScheme.surface,
                    borderRadius: BorderRadius.circular(18),
                    border: Border.all(color: Theme.of(context).dividerColor),
                  ),
                  child: Column(
                    children: <Widget>[
                      SwitchListTile(
                        secondary: const Icon(LucideIcons.moon, size: 20),
                        title: Text(t('profile.dark_mode'),
                            style: Theme.of(context).textTheme.titleSmall),
                        value: themePref == ThemeModePref.dark,
                        onChanged: (bool value) => ref
                            .read(themeControllerProvider.notifier)
                            .setDark(value),
                      ),
                      Divider(
                          height: 1,
                          color: Theme.of(context).dividerColor),
                      Padding(
                        padding: const EdgeInsets.all(14),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: <Widget>[
                            Row(
                              children: <Widget>[
                                const Icon(LucideIcons.globe, size: 20),
                                const SizedBox(width: 14),
                                Text(t('profile.language'),
                                    style:
                                        Theme.of(context).textTheme.titleSmall),
                              ],
                            ),
                            const SizedBox(height: 12),
                            Wrap(
                              spacing: 8,
                              runSpacing: 8,
                              children: AppLanguage.values
                                  .map((AppLanguage l) => ChoiceChip(
                                        label: Text(l.label),
                                        selected: lang == l,
                                        selectedColor: AppColors.primary,
                                        labelStyle: TextStyle(
                                          fontFamily: AppTheme.fontFamily,
                                          fontSize: 12,
                                          fontWeight: FontWeight.w700,
                                          color: lang == l
                                              ? Colors.white
                                              : Theme.of(context)
                                                  .colorScheme
                                                  .onSurface
                                                  .withOpacity(0.7),
                                        ),
                                        onSelected: (_) => ref
                                            .read(languageProvider.notifier)
                                            .set(l),
                                      ))
                                  .toList(),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 26),
                FilledButton.icon(
                  onPressed: _saving ? null : _save,
                  icon: _saving
                      ? const SizedBox(
                          width: 18,
                          height: 18,
                          child: CircularProgressIndicator(
                              strokeWidth: 2.2, color: Colors.white))
                      : const Icon(LucideIcons.checkCircle2, size: 18),
                  label: Text(t('profile.save_changes')),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
