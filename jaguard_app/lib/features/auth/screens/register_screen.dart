import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/widgets/lucide_compat.dart';

import '../../../core/l10n/translations.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/app_toast.dart';
import '../../../core/widgets/common.dart';
import '../providers/auth_providers.dart';

/// Países disponibles para el prefijo telefónico (paridad con Register.tsx).
class _Country {
  const _Country(this.code, this.name, this.flag);
  final String code;
  final String name;
  final String flag;
}

const List<_Country> _countries = <_Country>[
  _Country('+51', 'Perú', '🇵🇪'),
  _Country('+591', 'Bolivia', '🇧🇴'),
  _Country('+55', 'Brasil', '🇧🇷'),
  _Country('+57', 'Colombia', '🇨🇴'),
  _Country('+54', 'Argentina', '🇦🇷'),
  _Country('+56', 'Chile', '🇨🇱'),
  _Country('+52', 'México', '🇲🇽'),
];

/// Registro de cuenta nueva (paridad con Register.tsx).
class RegisterScreen extends ConsumerStatefulWidget {
  const RegisterScreen({super.key});

  @override
  ConsumerState<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends ConsumerState<RegisterScreen> {
  final GlobalKey<FormState> _formKey = GlobalKey<FormState>();
  final TextEditingController _name = TextEditingController();
  final TextEditingController _email = TextEditingController();
  final TextEditingController _phone = TextEditingController();
  final TextEditingController _password = TextEditingController();
  String _countryCode = '+51';
  bool _acceptedTerms = false;
  bool _obscure = true;
  bool _loading = false;

  @override
  void dispose() {
    _name.dispose();
    _email.dispose();
    _phone.dispose();
    _password.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    String t(String key, [Map<String, dynamic>? params]) => translate(ref.read(languageProvider).code, key, params);

    if (!_acceptedTerms) {
      AppToast.show(context, t('auth.terms_error'), error: true);
      return;
    }
    if (!_formKey.currentState!.validate()) {
      AppToast.show(context, t('auth.incomplete'), error: true);
      return;
    }

    setState(() => _loading = true);
    try {
      await ref.read(sessionProvider.notifier).register(
            name: _name.text.trim(),
            email: _email.text.trim(),
            countryCode: _countryCode,
            phone: _phone.text.trim(),
            password: _password.text,
          );
      if (!mounted) return;
      AppToast.show(context, 'Cuenta creada exitosamente');
    } catch (e) {
      if (mounted) AppToast.show(context, e.toString(), error: true);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final AppLanguage lang = ref.watch(languageProvider);
    String t(String key, [Map<String, dynamic>? params]) => translate(lang.code, key, params);

    return Scaffold(
      resizeToAvoidBottomInset: true,
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
          keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
          child: ConstrainedBox(
            constraints: BoxConstraints(
              minHeight: MediaQuery.of(context).size.height - 64,
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: <Widget>[
                const SizedBox(height: 24),
                const Center(child: BrandMark(size: 64, showWordmark: true)),
                const SizedBox(height: 28),
                Text(
                  t('auth.create_title'),
                  textAlign: TextAlign.center,
                  style: Theme.of(context).textTheme.displaySmall,
                ),
                const SizedBox(height: 8),
                Text(
                  t('auth.create_subtitle'),
                  textAlign: TextAlign.center,
                  style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                        color: Theme.of(context)
                            .colorScheme
                            .onSurface
                            .withOpacity(0.55),
                      ),
                ),
                const SizedBox(height: 28),
                Card(
                  child: Padding(
                    padding: const EdgeInsets.all(22),
                    child: Form(
                      key: _formKey,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: <Widget>[
                          _FieldLabel(t('auth.name_field')),
                          TextFormField(
                            controller: _name,
                            textInputAction: TextInputAction.next,
                            textCapitalization: TextCapitalization.words,
                            validator: (String? v) =>
                                (v == null || v.trim().isEmpty)
                                    ? t('auth.field_required')
                                    : null,
                            decoration: InputDecoration(
                              hintText: t('auth.name_hint'),
                              prefixIcon: const Icon(LucideIcons.user,
                                  size: 20, color: Colors.grey),
                            ),
                          ),
                          const SizedBox(height: 16),
                          _FieldLabel(t('auth.email_field')),
                          TextFormField(
                            controller: _email,
                            keyboardType: TextInputType.emailAddress,
                            textInputAction: TextInputAction.next,
                            validator: (String? v) =>
                                (v == null || !v.contains('@'))
                                    ? t('auth.field_required')
                                    : null,
                            decoration: InputDecoration(
                              hintText: t('auth.email_hint'),
                              prefixIcon: const Icon(LucideIcons.mail,
                                  size: 20, color: Colors.grey),
                            ),
                          ),
                          const SizedBox(height: 16),
                          _FieldLabel(t('auth.phone_field')),
                          Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: <Widget>[
                              DropdownButtonHideUnderline(
                                child: DropdownButton<String>(
                                  value: _countryCode,
                                  items: _countries
                                      .map<DropdownMenuItem<String>>(
                                    (_Country c) => DropdownMenuItem<String>(
                                      value: c.code,
                                      child: Text(
                                        '${c.flag} ${c.code}',
                                        style: const TextStyle(
                                          fontFamily: AppTheme.fontFamily,
                                          fontWeight: FontWeight.w600,
                                          fontSize: 14,
                                        ),
                                      ),
                                    ),
                                  ).toList(),
                                  onChanged: (String? value) => setState(
                                      () => _countryCode = value ?? '+51'),
                                  borderRadius: BorderRadius.circular(14),
                                  padding: const EdgeInsets.symmetric(
                                      horizontal: 10),
                                  icon: const SizedBox.shrink(),
                                ),
                              ),
                              const SizedBox(width: 8),
                              Expanded(
                                child: TextFormField(
                                  controller: _phone,
                                  keyboardType: TextInputType.phone,
                                  textInputAction: TextInputAction.next,
                                  inputFormatters: <TextInputFormatter>[
                                    FilteringTextInputFormatter.allow(
                                        RegExp(r'[0-9\s]')),
                                  ],
                                  validator: (String? v) =>
                                      (v == null || v.trim().length < 6)
                                          ? t('auth.field_required')
                                          : null,
                                  decoration: InputDecoration(
                                    hintText: t('auth.phone_hint'),
                                    prefixIcon: const Icon(LucideIcons.phone,
                                        size: 20, color: Colors.grey),
                                  ),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 6),
                          Text(
                            t('auth.phone_note'),
                            style: Theme.of(context).textTheme.bodySmall,
                          ),
                          const SizedBox(height: 16),
                          _FieldLabel(t('auth.password_field')),
                          TextFormField(
                            controller: _password,
                            obscureText: _obscure,
                            validator: (String? v) =>
                                (v == null || v.length < 6)
                                    ? t('auth.field_required')
                                    : null,
                            decoration: InputDecoration(
                              hintText: t('auth.password_hint'),
                              prefixIcon: const Icon(LucideIcons.lock,
                                  size: 20, color: Colors.grey),
                              suffixIcon: IconButton(
                                onPressed: () =>
                                    setState(() => _obscure = !_obscure),
                                icon: Icon(
                                  _obscure
                                      ? LucideIcons.eye
                                      : LucideIcons.eyeOff,
                                  size: 20,
                                  color: Colors.grey,
                                ),
                              ),
                            ),
                          ),
                          const SizedBox(height: 20),
                          InkWell(
                            borderRadius: BorderRadius.circular(16),
                            onTap: () =>
                                setState(() => _acceptedTerms = !_acceptedTerms),
                            child: Container(
                              padding: const EdgeInsets.all(14),
                              decoration: BoxDecoration(
                                color: Theme.of(context)
                                    .colorScheme
                                    .surface
                                    .withOpacity(0.5),
                                borderRadius: BorderRadius.circular(16),
                                border:
                                    Border.all(color: Theme.of(context).dividerColor),
                              ),
                              child: Row(
                                children: <Widget>[
                                  Checkbox(
                                    value: _acceptedTerms,
                                    onChanged: (bool? value) => setState(
                                        () => _acceptedTerms = value ?? false),
                                    activeColor: AppColors.primary,
                                    shape: RoundedRectangleBorder(
                                      borderRadius: BorderRadius.circular(6),
                                    ),
                                  ),
                                  Expanded(
                                    child: Text.rich(
                                      TextSpan(
                                        style:
                                            Theme.of(context).textTheme.bodySmall,
                                        children: <InlineSpan>[
                                          TextSpan(
                                              text:
                                                  '${t('auth.terms_prefix')} '),
                                          TextSpan(
                                            text: t('auth.terms_link'),
                                            style: const TextStyle(
                                              color: AppColors.primary,
                                              fontWeight: FontWeight.w800,
                                            ),
                                          ),
                                          TextSpan(
                                              text:
                                                  ' ${t('auth.terms_mid')} '),
                                          TextSpan(
                                            text: t('auth.privacy_link'),
                                            style: const TextStyle(
                                              color: AppColors.primary,
                                              fontWeight: FontWeight.w800,
                                            ),
                                          ),
                                          const TextSpan(text: '.'),
                                        ],
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                          const SizedBox(height: 20),
                          FilledButton(
                            onPressed:
                                (_loading || !_acceptedTerms) ? null : _submit,
                            child: _loading
                                ? const SizedBox(
                                    width: 22,
                                    height: 22,
                                    child: CircularProgressIndicator(
                                      strokeWidth: 2.4,
                                      color: Colors.white,
                                    ),
                                  )
                                : Text(t('auth.create')),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 24),
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: <Widget>[
                    Text(
                      t('auth.have_account'),
                      style: Theme.of(context).textTheme.bodyMedium,
                    ),
                    GestureDetector(
                      onTap: () => context.go('/login'),
                      child: Text(
                        ' ${t('auth.login_link')}',
                        style: const TextStyle(
                          fontFamily: AppTheme.fontFamily,
                          fontWeight: FontWeight.w800,
                          color: AppColors.primary,
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _FieldLabel extends StatelessWidget {
  const _FieldLabel(this.text);

  final String text;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8, left: 4),
      child: Text(text, style: Theme.of(context).textTheme.labelLarge),
    );
  }
}
