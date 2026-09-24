import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/widgets/lucide_compat.dart';

import '../auth/providers/auth_providers.dart';
import '../../core/l10n/translations.dart';
import '../../core/theme/app_theme.dart';

/// Tutorial inicial de 5 slides (paridad con Onboarding.tsx).
class OnboardingScreen extends ConsumerStatefulWidget {
  const OnboardingScreen({super.key});

  @override
  ConsumerState<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends ConsumerState<OnboardingScreen> {
  int _current = 0;
  final PageController _controller = PageController();

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Future<void> _finish() async {
    await ref.read(sessionProvider.notifier).completeOnboarding();
    if (mounted) {
      final bool isAdmin = ref.read(sessionProvider).isAdmin;
      context.go(isAdmin ? '/admin' : '/');
    }
  }

  void _next() {
    if (_current == 4) {
      _finish();
    } else {
      _controller.nextPage(
        duration: const Duration(milliseconds: 380),
        curve: Curves.easeOutCirc,
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final AppLanguage lang = ref.watch(languageProvider);
    String t(String key, [Map<String, dynamic>? params]) => translate(lang.code, key, params);

    final bool isDark = Theme.of(context).brightness == Brightness.dark;
    final Color visualBg = isDark ? const Color(0xFF1E293B) : AppColors.lightSurfaceMuted;
    final Color cardBorder = isDark ? AppColors.darkBorder : AppColors.lightBorder;
    final Color skeleton = isDark ? AppColors.darkBorder : const Color(0xFFE2E8F0);

    final List<Widget> visuals = <Widget>[
      _Slide1Visual(visualBg: visualBg, skeleton: skeleton),
      _Slide2Visual(visualBg: visualBg, skeleton: skeleton),
      _Slide3Visual(visualBg: visualBg, skeleton: skeleton),
      _Slide4Visual(visualBg: visualBg, cardBorder: cardBorder, t: t),
      _Slide5Visual(visualBg: visualBg, cardBorder: cardBorder, t: t),
    ];

    final List<String> titles = <String>[
      t('onboarding.slide1_title'),
      t('onboarding.slide2_title'),
      t('onboarding.slide_tracks_title'),
      t('onboarding.slide3_title'),
      t('onboarding.slide4_title'),
    ];
    final List<String> descriptions = <String>[
      t('onboarding.slide1_desc'),
      t('onboarding.slide2_desc'),
      t('onboarding.slide_tracks_desc'),
      t('onboarding.slide3_desc'),
      t('onboarding.slide4_desc'),
    ];

    return Scaffold(
      body: SafeArea(
        child: Column(
          children: <Widget>[
            Align(
              alignment: Alignment.topRight,
              child: Padding(
                padding: const EdgeInsets.only(top: 8, right: 24),
                child: TextButton(
                  onPressed: _finish,
                  child: Text(
                    t('onboarding.skip'),
                    style: const TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                      color: AppColors.lightTextMuted,
                    ),
                  ),
                ),
              ),
            ),
            Expanded(
              child: PageView.builder(
                controller: _controller,
                itemCount: 5,
                onPageChanged: (int index) => setState(() => _current = index),
                itemBuilder: (BuildContext context, int index) {
                  return Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 24),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: <Widget>[
                        AnimatedSwitcher(
                          duration: const Duration(milliseconds: 420),
                          switchInCurve: Curves.easeOutCirc,
                          switchOutCurve: Curves.easeInCirc,
                          transitionBuilder:
                              (Widget child, Animation<double> animation) {
                            final Animation<Offset> slide =
                                Tween<Offset>(
                              begin: const Offset(0.06, 0),
                              end: Offset.zero,
                            ).animate(animation);
                            return FadeTransition(
                              opacity: animation,
                              child: SlideTransition(
                                position: slide,
                                child: child,
                              ),
                            );
                          },
                          child: SizedBox(
                            key: ValueKey<int>(index),
                            width: 320,
                            height: 320,
                            child: visuals[index],
                          ),
                        ),
                        const SizedBox(height: 40),
                        Text(
                          titles[index],
                          textAlign: TextAlign.center,
                          style: Theme.of(context).textTheme.headlineMedium,
                        ),
                        const SizedBox(height: 14),
                        Text(
                          descriptions[index],
                          textAlign: TextAlign.center,
                          style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                                color: Theme.of(context)
                                    .colorScheme
                                    .onSurface
                                    .withOpacity(0.6),
                              ),
                        ),
                      ],
                    ),
                  );
                },
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(24, 8, 24, 24),
              child: Column(
                children: <Widget>[
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: List<Widget>.generate(
                      5,
                      (int i) => AnimatedContainer(
                        duration: const Duration(milliseconds: 350),
                        margin: const EdgeInsets.symmetric(horizontal: 5),
                        height: 8,
                        width: i == _current ? 36 : 10,
                        decoration: BoxDecoration(
                          color: i == _current
                              ? AppColors.primary
                              : skeleton,
                          borderRadius: BorderRadius.circular(999),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 28),
                  FilledButton(
                    onPressed: _next,
                    style: FilledButton.styleFrom(
                      minimumSize: const Size.fromHeight(60),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(20),
                      ),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: <Widget>[
                        Text(_current == 4
                            ? t('onboarding.start')
                            : t('onboarding.next')),
                        const SizedBox(width: 8),
                        const Icon(LucideIcons.arrowRight, size: 20),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Contenedor visual común de cada slide.
class _VisualBox extends StatelessWidget {
  const _VisualBox({required this.child, required this.background});

  final Widget child;
  final Color background;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      height: double.infinity,
      decoration: BoxDecoration(
        color: background,
        borderRadius: BorderRadius.circular(28),
        border: Border.all(color: Colors.black12),
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(28),
        child: child,
      ),
    );
  }
}

class _MiniCard extends StatelessWidget {
  const _MiniCard({
    required this.icon,
    required this.color,
    required this.barWidth,
    required this.skeleton,
    this.highlight = false,
  });

  final IconData icon;
  final Color color;
  final double barWidth;
  final Color skeleton;
  final bool highlight;

  @override
  Widget build(BuildContext context) {
    return TweenAnimationBuilder<double>(
      tween: Tween<double>(begin: 0.8, end: highlight ? 1.08 : 1),
      duration: const Duration(milliseconds: 600),
      curve: Curves.easeOutBack,
      builder: (BuildContext context, double scale, Widget? child) =>
          Transform.scale(scale: scale, child: child),
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(18),
          border: Border.all(
            color: highlight ? AppColors.primary : Colors.black12,
            width: highlight ? 2 : 1,
          ),
          boxShadow: <BoxShadow>[
            BoxShadow(
              color: Colors.black.withOpacity(highlight ? 0.12 : 0.05),
              blurRadius: highlight ? 16 : 6,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: <Widget>[
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: color.withOpacity(0.12),
                shape: BoxShape.circle,
              ),
              child: Icon(icon, size: 22, color: color),
            ),
            const SizedBox(height: 10),
            Container(
              height: 8,
              width: barWidth,
              decoration: BoxDecoration(
                color: skeleton,
                borderRadius: BorderRadius.circular(999),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _Slide1Visual extends StatelessWidget {
  const _Slide1Visual({required this.visualBg, required this.skeleton});

  final Color visualBg;
  final Color skeleton;

  @override
  Widget build(BuildContext context) {
    return _VisualBox(
      background: visualBg,
      child: Padding(
        padding: const EdgeInsets.all(22),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: <Widget>[
            GridView.count(
              crossAxisCount: 2,
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              mainAxisSpacing: 14,
              crossAxisSpacing: 14,
              childAspectRatio: 1.25,
              children: <Widget>[
                _MiniCard(
                    icon: LucideIcons.eye,
                    color: const Color(0xFF3B82F6),
                    barWidth: 58,
                    skeleton: skeleton),
                _MiniCard(
                    icon: Icons.pets_rounded,
                    color: const Color(0xFFF97316),
                    barWidth: 44,
                    skeleton: skeleton,
                    highlight: true),
                _MiniCard(
                    icon: LucideIcons.skull,
                    color: const Color(0xFFEF4444),
                    barWidth: 58,
                    skeleton: skeleton),
                _MiniCard(
                    icon: LucideIcons.camera,
                    color: const Color(0xFF64748B),
                    barWidth: 50,
                    skeleton: skeleton),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _Slide2Visual extends StatelessWidget {
  const _Slide2Visual({required this.visualBg, required this.skeleton});

  final Color visualBg;
  final Color skeleton;

  @override
  Widget build(BuildContext context) {
    return _VisualBox(
      background: visualBg,
      child: Stack(
        alignment: Alignment.center,
        children: <Widget>[
          // Retícula de mapa estilizada
          CustomPaint(
            painter: _MapGridPainter(),
            child: const SizedBox.expand(),
          ),
          Column(
            mainAxisSize: MainAxisSize.min,
            children: <Widget>[
              TweenAnimationBuilder<double>(
                tween: Tween<double>(begin: 0, end: -10),
                duration: const Duration(seconds: 2),
                curve: Curves.easeInOut,
                builder: (BuildContext context, double dy, Widget? child) =>
                    Transform.translate(offset: Offset(0, dy), child: child),
                child: Container(
                  width: 60,
                  height: 60,
                  decoration: BoxDecoration(
                    color: AppColors.primary,
                    shape: BoxShape.circle,
                    border: Border.all(color: Colors.white.withOpacity(0.25), width: 4),
                    boxShadow: <BoxShadow>[
                      BoxShadow(
                        color: AppColors.primary.withOpacity(0.5),
                        blurRadius: 22,
                        offset: const Offset(0, 8),
                      ),
                    ],
                  ),
                  child: const Icon(LucideIcons.mapPin,
                      color: Colors.white, size: 28),
                ),
              ),
              const SizedBox(height: 12),
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                decoration: BoxDecoration(
                  color: Colors.white.withOpacity(0.92),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Text(
                  '-16.2902, -63.5887',
                  style: TextStyle(
                    fontFamily: AppTheme.fontFamily,
                    fontSize: 11,
                    fontWeight: FontWeight.w800,
                    fontFeatures: <FontFeature>[FontFeature.tabularFigures()],
                    color: Color(0xFF0F172A),
                  ),
                ),
              ),
            ],
          ),
          Positioned(
            left: 20,
            right: 20,
            bottom: 20,
            child: Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(18),
                boxShadow: <BoxShadow>[
                  BoxShadow(
                    color: Colors.black.withOpacity(0.15),
                    blurRadius: 20,
                    offset: const Offset(0, 8),
                  ),
                ],
              ),
              child: Row(
                children: <Widget>[
                  Container(
                    width: 46,
                    height: 46,
                    decoration: BoxDecoration(
                      color: skeleton,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: const Icon(LucideIcons.camera,
                        size: 20, color: Colors.grey),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: <Widget>[
                        Container(
                          height: 10,
                          width: 90,
                          decoration: BoxDecoration(
                            color: skeleton,
                            borderRadius: BorderRadius.circular(999),
                          ),
                        ),
                        const SizedBox(height: 8),
                        Container(
                          height: 8,
                          width: 60,
                          decoration: BoxDecoration(
                            color: skeleton,
                            borderRadius: BorderRadius.circular(999),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _MapGridPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final Paint grid = Paint()
      ..color = Colors.white.withOpacity(0.08)
      ..strokeWidth = 1;
    const double step = 34;
    for (double x = 0; x < size.width; x += step) {
      canvas.drawLine(Offset(x, 0), Offset(x, size.height), grid);
    }
    for (double y = 0; y < size.height; y += step) {
      canvas.drawLine(Offset(0, y), Offset(size.width, y), grid);
    }
    final Paint route = Paint()
      ..color = AppColors.primary.withOpacity(0.35)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2.4
      ..strokeCap = StrokeCap.round;
    final Path path = Path()
      ..moveTo(size.width * 0.12, size.height * 0.72)
      ..quadraticBezierTo(
          size.width * 0.34, size.height * 0.5, size.width * 0.5, size.height * 0.58)
      ..quadraticBezierTo(
          size.width * 0.68, size.height * 0.66, size.width * 0.85, size.height * 0.36);
    canvas.drawPath(path, route);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

class _Slide3Visual extends StatelessWidget {
  const _Slide3Visual({required this.visualBg, required this.skeleton});

  final Color visualBg;
  final Color skeleton;

  @override
  Widget build(BuildContext context) {
    return _VisualBox(
      background: visualBg,
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: <Widget>[
          Container(
            margin: const EdgeInsets.symmetric(horizontal: 26),
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: const Color(0xFF0F172A).withOpacity(0.85),
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: Colors.white.withOpacity(0.2), width: 2),
            ),
            child: Stack(
              alignment: Alignment.center,
              children: <Widget>[
                Container(
                  width: 92,
                  height: 92,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    border: Border.all(
                      color: Colors.white.withOpacity(0.6),
                      width: 3,
                    ),
                  ),
                  child: const Icon(Icons.pets_rounded,
                      size: 44, color: Colors.white),
                ),
                Positioned(
                  right: -46,
                  bottom: -18,
                  child: Transform.rotate(
                    angle: 1.2,
                    child: Container(
                      width: 56,
                      height: 78,
                      decoration: BoxDecoration(
                        color: Colors.orange.withOpacity(0.25),
                        border: Border.all(
                            color: Colors.white.withOpacity(0.4), width: 2),
                        borderRadius: const BorderRadius.vertical(
                          top: Radius.circular(28),
                          bottom: Radius.circular(12),
                        ),
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 18),
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: <Widget>[
              const Icon(LucideIcons.checkCircle,
                  size: 16, color: AppColors.primary),
              const SizedBox(width: 8),
              Text(
                'REFERENCIA VISUAL',
                style: TextStyle(
                  fontFamily: AppTheme.fontFamily,
                  fontSize: 11,
                  fontWeight: FontWeight.w900,
                  letterSpacing: 2,
                  color: AppColors.primary,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Container(
            height: 8,
            width: 140,
            decoration: BoxDecoration(
              color: skeleton,
              borderRadius: BorderRadius.circular(999),
            ),
          ),
        ],
      ),
    );
  }
}

class _Slide4Visual extends StatelessWidget {
  const _Slide4Visual({
    required this.visualBg,
    required this.cardBorder,
    required this.t,
  });

  final Color visualBg;
  final Color cardBorder;
  final String Function(String, [Map<String, dynamic>?]) t;

  @override
  Widget build(BuildContext context) {
    return _VisualBox(
      background: visualBg,
      child: Stack(
        children: <Widget>[
          Positioned(
            top: 18,
            right: 18,
            child: Container(
              padding:
                  const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
              decoration: BoxDecoration(
                color: const Color(0xFFEF4444).withOpacity(0.14),
                borderRadius: BorderRadius.circular(999),
                border: Border.all(
                    color: const Color(0xFFEF4444).withOpacity(0.35)),
              ),
              child: Row(
                children: <Widget>[
                  const Icon(LucideIcons.wifiOff,
                      size: 12, color: Color(0xFFEF4444)),
                  const SizedBox(width: 6),
                  Text(
                    t('onboarding.offline_label').toUpperCase(),
                    style: const TextStyle(
                      fontFamily: AppTheme.fontFamily,
                      fontSize: 10,
                      fontWeight: FontWeight.w900,
                      letterSpacing: 0.6,
                      color: Color(0xFFEF4444),
                    ),
                  ),
                ],
              ),
            ),
          ),
          Center(
            child: Container(
              margin: const EdgeInsets.symmetric(horizontal: 22),
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: cardBorder),
                boxShadow: <BoxShadow>[
                  BoxShadow(
                    color: Colors.black.withOpacity(0.12),
                    blurRadius: 24,
                    offset: const Offset(0, 10),
                  ),
                ],
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: <Widget>[
                  Row(
                    children: <Widget>[
                      Container(
                        width: 40,
                        height: 40,
                        decoration: const BoxDecoration(
                          color: Color(0xFFFFEDD5),
                          shape: BoxShape.circle,
                        ),
                        child: const Icon(Icons.pets_rounded,
                            size: 20, color: Color(0xFFF97316)),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: <Widget>[
                            Container(
                              height: 10,
                              width: 92,
                              decoration: BoxDecoration(
                                color: Colors.grey.shade200,
                                borderRadius: BorderRadius.circular(999),
                              ),
                            ),
                            const SizedBox(height: 8),
                            Container(
                              height: 8,
                              width: 60,
                              decoration: BoxDecoration(
                                color: Colors.grey.shade200,
                                borderRadius: BorderRadius.circular(999),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  const Divider(),
                  const SizedBox(height: 4),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: <Widget>[
                      Text(
                        t('onboarding.saved_label'),
                        style: const TextStyle(
                          fontFamily: AppTheme.fontFamily,
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                          color: Colors.grey,
                        ),
                      ),
                      const Icon(LucideIcons.checkCircle,
                          size: 20, color: Color(0xFF10B981)),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _Slide5Visual extends StatelessWidget {
  const _Slide5Visual({
    required this.visualBg,
    required this.cardBorder,
    required this.t,
  });

  final Color visualBg;
  final Color cardBorder;
  final String Function(String, [Map<String, dynamic>?]) t;

  @override
  Widget build(BuildContext context) {
    return _VisualBox(
      background: visualBg,
      child: Center(
        child: Container(
          margin: const EdgeInsets.symmetric(horizontal: 22),
          padding: const EdgeInsets.all(22),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(22),
            border: Border.all(color: cardBorder),
            boxShadow: <BoxShadow>[
              BoxShadow(
                color: Colors.black.withOpacity(0.12),
                blurRadius: 24,
                offset: const Offset(0, 10),
              ),
            ],
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: <Widget>[
              Container(
                width: 62,
                height: 62,
                decoration: const BoxDecoration(
                  color: Color(0xFFD1FAE5),
                  shape: BoxShape.circle,
                ),
                child: const Icon(LucideIcons.star,
                    size: 30, color: Color(0xFF10B981)),
              ),
              const SizedBox(height: 14),
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                crossAxisAlignment: CrossAxisAlignment.baseline,
                textBaseline: TextBaseline.alphabetic,
                children: <Widget>[
                  const Text(
                    '120',
                    style: TextStyle(
                      fontFamily: AppTheme.fontFamily,
                      fontSize: 30,
                      fontWeight: FontWeight.w900,
                      color: Color(0xFF0F172A),
                    ),
                  ),
                  const SizedBox(width: 6),
                  Text(
                    t('onboarding.points_label'),
                    style: const TextStyle(
                      fontFamily: AppTheme.fontFamily,
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                      color: Colors.grey,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              ClipRRect(
                borderRadius: BorderRadius.circular(999),
                child: TweenAnimationBuilder<double>(
                  tween: Tween<double>(begin: 0, end: 0.8),
                  duration: const Duration(milliseconds: 1100),
                  curve: Curves.easeOutCubic,
                  builder: (BuildContext context, double value, _) =>
                      LinearProgressIndicator(
                    value: value,
                    minHeight: 12,
                    backgroundColor: Colors.grey.shade200,
                    valueColor:
                        const AlwaysStoppedAnimation<Color>(Color(0xFF10B981)),
                  ),
                ),
              ),
              const SizedBox(height: 12),
              Text(
                t('profile.redeem_missing', <String, dynamic>{'points': 30}),
                style: const TextStyle(
                  fontFamily: AppTheme.fontFamily,
                  fontSize: 11,
                  fontWeight: FontWeight.w600,
                  color: Colors.grey,
                ),
              ),
              const SizedBox(height: 14),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(vertical: 12),
                decoration: BoxDecoration(
                  color: const Color(0xFFECFDF5),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(
                      color: const Color(0xFF10B981).withOpacity(0.3)),
                ),
                child: Text(
                  t('onboarding.reward_label').toUpperCase(),
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                    fontFamily: AppTheme.fontFamily,
                    fontSize: 11,
                    fontWeight: FontWeight.w900,
                    letterSpacing: 1,
                    color: Color(0xFF059669),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
