import 'package:flutter/foundation.dart' show kIsWeb;
import 'dart:typed_data' show Uint8List;
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter/services.dart' show rootBundle;
import 'package:fl_chart/fl_chart.dart';
import 'package:go_router/go_router.dart';
import '../../../core/widgets/lucide_compat.dart';
import 'package:http/http.dart' as http;
import 'package:share_plus/share_plus.dart';
import 'package:syncfusion_flutter_xlsio/xlsio.dart' as xl;
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'dart:convert';
import 'dart:io' as io;
import 'package:path_provider/path_provider.dart';

import '../../../core/l10n/translations.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/utils/formatters.dart';
import '../../../core/widgets/app_scaffold.dart';
import '../../../core/widgets/app_toast.dart';
import '../../../core/widgets/common.dart';
import '../../reports/domain/report.dart';
import '../data/admin_repository.dart';
import '../providers/admin_providers.dart';

/// Dashboard de administración: métricas, gráfica, mapas de calor,
/// verificación de reportes, canjes y mensajes.
class AdminDashboardScreen extends ConsumerStatefulWidget {
  const AdminDashboardScreen({super.key});

  @override
  ConsumerState<AdminDashboardScreen> createState() =>
      _AdminDashboardScreenState();
}

class _AdminDashboardScreenState extends ConsumerState<AdminDashboardScreen>
    with SingleTickerProviderStateMixin {
  late final TabController _tabs =
      TabController(length: 4, vsync: this);

  @override
  void dispose() {
    _tabs.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final AppLanguage lang = ref.watch(languageProvider);
    String t(String key, [Map<String, dynamic>? params]) => translate(lang.code, key, params);

    return MainShell(
      child: ref.watch(adminOverviewProvider).when(
            loading: () => const FullScreenLoader(),
            error: (Object e, StackTrace s) => const EmptyState(
              icon: LucideIcons.alertTriangle,
              message: 'Error al cargar el dashboard',
            ),
            data: (AdminOverview overview) => _buildContent(context, overview, t),
          ),
    );
  }

  Widget _buildContent(
      BuildContext context, AdminOverview overview, String Function(String) t) {
    Future<void> reload() async {
      ref.invalidate(adminOverviewProvider);
    }

    return DefaultTabController(
      length: 4,
      child: NestedScrollView(
              headerSliverBuilder:
                  (BuildContext context, bool innerBoxIsScrolled) =>
                      <Widget>[
                SliverToBoxAdapter(
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(16, 16, 16, 0),
                    child: Row(
                      children: <Widget>[
                        Expanded(
                          child: Text(t('admin.dashboard'),
                              style: Theme.of(context).textTheme.headlineSmall),
                        ),
                        IconButton(
                          onPressed: () => context.push('/admin/editor'),
                          icon: const Icon(LucideIcons.edit3, size: 20),
                          tooltip: t('editor.title'),
                        ),
                        OutlinedButton.icon(
                          onPressed: () => _showExportSheet(context, overview, t),
                          icon: const Icon(LucideIcons.download, size: 16),
                          label: Text(t('admin.export_data'),
                              style: const TextStyle(fontSize: 12)),
                        ),
                      ],
                    ),
                  ),
                ),
                SliverToBoxAdapter(
                  child: _MetricsSection(overview: overview, t: t),
                ),
                SliverToBoxAdapter(
                  child: TabBar(
                    controller: _tabs,
                    isScrollable: true,
                    tabAlignment: TabAlignment.start,
                    dividerColor: Colors.transparent,
                    labelColor: AppColors.primary,
                    unselectedLabelColor:
                        Theme.of(context).colorScheme.onSurface.withOpacity(0.4),
                    labelStyle: const TextStyle(
                        fontFamily: AppTheme.fontFamily,
                        fontWeight: FontWeight.w800,
                        fontSize: 13),
                    tabs: <Widget>[
                      Tab(text: t('admin.pending_reports')),
                      Tab(text: t('admin.verified_reports')),
                      Tab(text: t('admin.redemption_requests')),
                      Tab(text: t('admin.messages')),
                    ],
                  ),
                ),
              ],
              body: TabBarView(
                controller: _tabs,
                children: <Widget>[
                  _ReportsTab(
                      overview: overview,
                      only: ReportStatus.pending,
                      reload: reload,
                      t: t),
                  _ReportsTab(
                      overview: overview,
                      only: ReportStatus.verified,
                      reload: reload,
                      t: t),
                  _RedemptionsTab(overview: overview, reload: reload, t: t),
                  _MessagesTab(overview: overview, reload: reload, t: t),
                ],
              ),
            ),
          );
  }

  /// Exporta un Excel con formato corporativo y la **imagen real** de cada
  /// evidencia incrustada en su celda (descargada del Storage de Supabase).
  Future<void> _exportExcelWithImages(
    List<Report> reports,
    String stamp,
    String Function(String) t,
  ) async {
    final xl.Workbook workbook = xl.Workbook();
    final xl.Worksheet sheet = workbook.worksheets[0];
    sheet.name = 'Reportes';

    const List<String> headers = <String>[
      'TIPO DE REPORTE',
      'FECHA Y HORA',
      'COORDENADAS EXACTAS',
      'ANIMAL',
      'SITUACIÓN / NOTAS',
      'EVIDENCIA',
      'CONTACTO DE USUARIO',
      'ESTADO',
    ];

    // Encabezado con estilo de marca
    for (int i = 0; i < headers.length; i++) {
      final xl.Range cell = sheet.getRangeByIndex(0, i);
      cell.setText(headers[i]);
      cell.cellStyle.backColor = '#0F172A';
      cell.cellStyle.fontColor = '#FFFFFF';
      cell.cellStyle.bold = true;
      cell.cellStyle.fontSize = 10;
      cell.cellStyle.vAlign = xl.VAlignType.center;
      cell.cellStyle.hAlign = xl.HAlignType.left;
    }

    // Anchos de columna
    const List<double> widths = <double>[22, 22, 26, 20, 44, 24, 28, 14];
    for (int i = 0; i < widths.length; i++) {
      sheet.getRangeByIndex(0, i).columnWidth = widths[i];
    }

    final http.Client client = http.Client();
    int embeddedImages = 0;

    try {
      for (int i = 0; i < reports.length; i++) {
        final Report r = reports[i];
        final int row = i + 2; // 1-based + encabezado

        sheet.getRangeByIndex(row - 1, 0).setText(r.type.toUpperCase());
        sheet
            .getRangeByIndex(row - 1, 1)
            .setText(Formatters.fullDateTime(r.createdAt));
        sheet
            .getRangeByIndex(row - 1, 2)
            .setText(Formatters.coordinates(r.lat, r.lng));
        sheet
            .getRangeByIndex(row - 1, 3)
            .setText(r.displayAnimal.toUpperCase());
        sheet.getRangeByIndex(row - 1, 4).setText(
            (r.notes?.isNotEmpty == true) ? r.notes! : 'N/A');
        sheet.getRangeByIndex(row - 1, 6).setText(r.anonymous
            ? t('admin.anonymous')
            : (r.userName ?? 'N/A'));
        final String statusLabel = switch (r.status) {
          ReportStatus.verified => 'VERIFICADO',
          ReportStatus.denied => 'DENEGADO',
          ReportStatus.pending => 'PENDIENTE',
        };
        sheet.getRangeByIndex(row - 1, 7).setText(statusLabel);

        // Estado con color semántico
        final xl.Range statusCell = sheet.getRangeByIndex(row - 1, 7);
        statusCell.cellStyle.fontColor = switch (r.status) {
          ReportStatus.verified => '#10B981',
          ReportStatus.denied => '#EF4444',
          ReportStatus.pending => '#F59E0B',
        };
        statusCell.cellStyle.bold = true;

        // Evidencia: imagen real incrustada
        final String? url = r.photoUrl;
        if (url != null && url.startsWith('http')) {
          try {
            final http.Response response = await client
                .get(Uri.parse(url))
                .timeout(const Duration(seconds: 8));
            if (response.statusCode == 200 && response.bodyBytes.isNotEmpty) {
              final xl.Picture picture = sheet.pictures.addStream(
                row - 1,
                5,
                response.bodyBytes,
              );
              picture.height = 72;
              picture.width = 96;
              embeddedImages++;
            }
          } catch (_) {
            sheet.getRangeByIndex(row - 1, 5).setText('(sin conexión a foto)');
          }
        } else {
          sheet.getRangeByIndex(row - 1, 5).setText('Sin foto');
        }

        // Alto de fila para alojar la miniatura
        sheet.getRangeByIndex(row - 1, 0).rowHeight = 62;
      }
    } finally {
      client.close();
    }

    // Bordes suaves en la tabla completa
    final xl.Range table =
        sheet.getRangeByName('A1:H${reports.length + 1}');
    table.cellStyle.borders.all.lineStyle = xl.LineStyle.thin;
    table.cellStyle.borders.all.color = '#E2E8F0';

    sheet.getRangeByName('A2').freezePanes();

    final List<int> bytes = workbook.saveAsStream();
    workbook.dispose();

    final String fileName = 'Reportes_JagGuard_$stamp.xlsx';
    if (kIsWeb) {
      await Share.shareXFiles(<XFile>[
        XFile.fromData(Uint8List.fromList(bytes), name: fileName, mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'),
      ], text: 'Reportes JaGuarD');
    } else {
      final io.Directory dir = await getTemporaryDirectory();
      final io.File file = io.File('${dir.path}/$fileName');
      await file.writeAsBytes(bytes);
      await Share.shareXFiles(<XFile>[XFile(file.path)]);
    }
    if (mounted) {
      AppToast.show(context,
          'Excel generado ($embeddedImages imágenes incrustadas)');
    }
  }

  void _showExportSheet(BuildContext context, AdminOverview overview,
      String Function(String) t) {
    showModalBottomSheet<void>(
      context: context,
      builder: (BuildContext sheetContext) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(20, 4, 20, 20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: <Widget>[
              Text(t('admin.export_excel'),
                  style: Theme.of(context).textTheme.titleMedium),
              const SizedBox(height: 16),
              Wrap(
                spacing: 10,
                runSpacing: 10,
                children: <Widget>[
                  _ExportButton(
                    label: t('admin.export_excel_history'),
                    onTap: () => _export(overview.reports, t, asExcel: true),
                  ),
                  _ExportButton(
                    label: t('admin.export_csv_history'),
                    onTap: () => _export(overview.reports, t, asExcel: false),
                  ),
                  _ExportButton(
                    label: t('admin.export_excel_30'),
                    onTap: () =>
                        _export(overview.recent30, t, asExcel: true),
                  ),
                  _ExportButton(
                    label: t('admin.export_csv_30'),
                    onTap: () =>
                        _export(overview.recent30, t, asExcel: false),
                  ),
                  _ExportButton(
                    label: t('admin.export_excel_verified'),
                    onTap: () => _export(
                        overview.recent30
                            .where((Report r) =>
                                r.status == ReportStatus.verified)
                            .toList(),
                        t,
                        asExcel: true),
                  ),
                  _ExportButton(
                    label: t('admin.export_csv_verified'),
                    onTap: () => _export(
                        overview.recent30
                            .where((Report r) =>
                                r.status == ReportStatus.verified)
                            .toList(),
                        t,
                        asExcel: false),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _export(List<Report> reports, String Function(String) t,
      {required bool asExcel}) async {
    if (reports.isEmpty) {
      if (mounted) {
        AppToast.show(context, 'No hay datos para exportar', error: true);
      }
      return;
    }
    final String stamp =
        DateTime.now().toIso8601String().split('T').first;

    if (asExcel) {
      await _exportExcelWithImages(reports, stamp, t);
    } else {
      final String csv = const ListCsvEncoder().encode(<List<String?>>[
        <String?>[
          'TIPO DE REPORTE',
          'FECHA Y HORA',
          'COORDENADAS EXACTAS',
          'ANIMAL',
          'SITUACIÓN / NOTAS',
          'EVIDENCIA',
          'CONTACTO DE USUARIO',
          'ESTADO',
        ],
        ...reports.map((Report r) => <String?>[
          r.type.toUpperCase(),
          Formatters.fullDateTime(r.createdAt),
          Formatters.coordinates(r.lat, r.lng),
          r.displayAnimal.toUpperCase(),
          r.notes ?? 'N/A',
          r.photoUrl ?? 'Sin foto',
          r.anonymous ? t('admin.anonymous') : (r.userName ?? 'N/A'),
          switch (r.status) {
            ReportStatus.verified => 'VERIFICADO',
            ReportStatus.denied => 'DENEGADO',
            ReportStatus.pending => 'PENDIENTE',
          },
        ]),
      ]);
      final String fileName = 'Reportes_JagGuard_$stamp.csv';
      if (kIsWeb) {
        await Share.shareXFiles(<XFile>[
          XFile.fromData(utf8.encode(csv), name: fileName, mimeType: 'text/csv'),
        ], text: 'Reportes JaGuarD');
      } else {
        final io.Directory dir = await getTemporaryDirectory();
        final io.File file = io.File('${dir.path}/$fileName');
        await file.writeAsString(csv, encoding: utf8);
        await Share.shareXFiles(<XFile>[XFile(file.path)]);
      }
    }
    if (mounted) AppToast.show(context, 'Exportado correctamente');
  }
}

/// Codificador CSV con escape correcto de comillas y comas.
class ListCsvEncoder {
  const ListCsvEncoder();

  String encode(List<List<String?>> rows) {
    String cell(String? value) {
      final String v = (value ?? '').replaceAll('"', '""');
      return '"$v"';
    }

    return rows.map((List<String?> row) => row.map(cell).join(',')).join('\n');
  }
}

// ---------------------------------------------------------------------------
// Métricas: tarjetas, gráfica de frecuencia y mapa de calor
// ---------------------------------------------------------------------------

class _MetricsSection extends StatefulWidget {
  const _MetricsSection({required this.overview, required this.t});

  final AdminOverview overview;
  final String Function(String) t;

  @override
  State<_MetricsSection> createState() => _MetricsSectionState();
}

class _MetricsSectionState extends State<_MetricsSection> {
  String? _darkStyle;
  bool _heatLast30 = false;

  static const CameraPosition _saCamera = CameraPosition(
    target: LatLng(-16.290154, -63.588653),
    zoom: 4.2,
  );

  @override
  void initState() {
    super.initState();
    _loadDarkStyle();
  }

  Future<void> _loadDarkStyle() async {
    try {
      final String raw =
          await rootBundle.loadString('assets/map_styles/dark_map_style.json');
      _darkStyle = jsonEncode(jsonDecode(raw));
    } catch (_) {
      _darkStyle = null;
    }
  }

  @override
  Widget build(BuildContext context) {
    final bool isDark = Theme.of(context).brightness == Brightness.dark;
    final AdminOverview o = widget.overview;

    final Map<String, int> animalCounts = <String, int>{};
    for (final Report r in o.recent30) {
      animalCounts[r.displayAnimal] =
          (animalCounts[r.displayAnimal] ?? 0) + 1;
    }
    final List<MapEntry<String, int>> entries =
        animalCounts.entries.toList()
          ..sort((MapEntry<String, int> a, MapEntry<String, int> b) =>
              b.value.compareTo(a.value));

    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 4),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          // Tarjetas de métricas
          Row(
            children: <Widget>[
              Expanded(
                  child: _MetricCard(
                      label: widget.t('admin.total_reports'),
                      value: '${o.totalReports}',
                      icon: LucideIcons.fileText,
                      color: AppColors.primary)),
              const SizedBox(width: 10),
              Expanded(
                  child: _MetricCard(
                      label: widget.t('admin.verified_reports'),
                      value: '${o.verifiedCount}',
                      icon: LucideIcons.checkCircle,
                      color: const Color(0xFF22C55E))),
            ],
          ),
          const SizedBox(height: 10),
          Row(
            children: <Widget>[
              Expanded(
                  child: _MetricCard(
                      label: widget.t('admin.pending_redemptions'),
                      value: '${o.pendingRedemptions}',
                      icon: LucideIcons.heart,
                      color: AppColors.accent)),
              const SizedBox(width: 10),
              Expanded(
                  child: _MetricCard(
                      label: widget.t('admin.messages'),
                      value: '${o.unreadMessages}',
                      icon: LucideIcons.messageCircle,
                      color: const Color(0xFF14B8A6))),
            ],
          ),
          const SizedBox(height: 18),

          // Gráfica de frecuencia (30 días)
          Text(
            widget.t('admin.frequency_type'),
            style: Theme.of(context).textTheme.labelMedium,
          ),
          const SizedBox(height: 10),
          Container(
            height: 190,
            padding: const EdgeInsets.fromLTRB(8, 18, 14, 8),
            decoration: BoxDecoration(
              color: Theme.of(context).colorScheme.surface,
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: Theme.of(context).dividerColor),
            ),
            child: entries.isEmpty
                ? Center(child: Text(widget.t('admin.no_data')))
                : BarChart(
                    BarChartData(
                      alignment: BarChartAlignment.spaceAround,
                      maxY: entries.first.value.toDouble() * 1.25,
                      barTouchData: BarTouchData(
                        touchTooltipData: BarTouchTooltipData(
                          getTooltipColor: (_) => AppColors.darkSurfaceLighter,
                          getTooltipItem: (BarChartGroupData group,
                                  int groupIndex, BarChartRodData rod, _) =>
                              BarTooltipItem(
                            '${rod.toY.toInt()}',
                            const TextStyle(
                                color: Colors.white,
                                fontWeight: FontWeight.w800),
                          ),
                        ),
                      ),
                      titlesData: FlTitlesData(
                        leftTitles: const AxisTitles(
                            sideTitles: SideTitles(showTitles: false)),
                        topTitles: const AxisTitles(
                            sideTitles: SideTitles(showTitles: false)),
                        rightTitles: const AxisTitles(
                            sideTitles: SideTitles(showTitles: false)),
                        bottomTitles: AxisTitles(
                          sideTitles: SideTitles(
                            showTitles: true,
                            reservedSize: 34,
                            getTitlesWidget: (double value, TitleMeta meta) {
                              final int i = value.toInt();
                              if (i < 0 || i >= entries.length) {
                                return const SizedBox.shrink();
                              }
                              return Padding(
                                padding: const EdgeInsets.only(top: 6),
                                child: Text(
                                  entries[i].key.length > 8
                                      ? '${entries[i].key.substring(0, 8)}…'
                                      : entries[i].key,
                                  style: TextStyle(
                                    fontFamily: AppTheme.fontFamily,
                                    fontSize: 9,
                                    fontWeight: FontWeight.w700,
                                    color: Theme.of(context)
                                        .colorScheme
                                        .onSurface
                                        .withOpacity(0.55),
                                  ),
                                ),
                              );
                            },
                          ),
                        ),
                      ),
                      gridData: FlGridData(
                        drawVerticalLine: false,
                        getDrawingHorizontalLine: (double v) =>
                            FlLine(
                          color: Theme.of(context)
                              .dividerColor
                              .withOpacity(0.4),
                          strokeWidth: 1,
                        ),
                      ),
                      borderData: FlBorderData(show: false),
                      barGroups: entries
                          .asMap()
                          .entries
                          .map((MapEntry<int, MapEntry<String, int>> e) =>
                              BarChartGroupData(
                                x: e.key,
                                barRods: <BarChartRodData>[
                                  BarChartRodData(
                                    toY: e.value.value.toDouble(),
                                    width: 18,
                                    borderRadius:
                                        const BorderRadius.vertical(
                                            top: Radius.circular(4)),
                                    color: AppColors.accent,
                                  ),
                                ],
                              ))
                          .toList(),
                    ),
                  ),
          ),
          const SizedBox(height: 18),

          // Mapa de calor con selector de rango y leyenda
          Row(
            children: <Widget>[
              Expanded(
                child: Text(
                  widget.t('admin.heatmap_history'),
                  style: Theme.of(context).textTheme.labelMedium,
                ),
              ),
              SegmentedButton<bool>(
                segments: const <ButtonSegment<bool>>[
                  ButtonSegment<bool>(
                      value: true, label: Text('30 días', style: TextStyle(fontSize: 11))),
                  ButtonSegment<bool>(
                      value: false, label: Text('Todo', style: TextStyle(fontSize: 11))),
                ],
                selected: <bool>{_heatLast30},
                onSelectionChanged: (Set<bool> selection) =>
                    setState(() => _heatLast30 = selection.first),
                style: SegmentedButton.styleFrom(
                  selectedBackgroundColor: AppColors.primarySoft,
                  selectedForegroundColor: AppColors.primary,
                  visualDensity: VisualDensity.compact,
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          ClipRRect(
            borderRadius: BorderRadius.circular(20),
            child: SizedBox(
              height: 240,
              child: Stack(
                children: <Widget>[
                  GoogleMap(
                    initialCameraPosition: _saCamera,
                    myLocationButtonEnabled: false,
                    zoomControlsEnabled: false,
                    mapToolbarEnabled: false,
                    compassEnabled: false,
                    buildingsEnabled: false,
                    circles: _buildHeatCircles(_heatLast30
                        ? widget.overview.recent30
                        : widget.overview.reports),
                    style: isDark ? _darkStyle : null,
                    onMapCreated: (GoogleMapController controller) {},
                  ),
                  // Leyenda
                  Positioned(
                    left: 10,
                    bottom: 10,
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 10, vertical: 7),
                      decoration: BoxDecoration(
                        color: (isDark
                                ? AppColors.darkSurface
                                : AppColors.lightSurface)
                            .withOpacity(0.92),
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(
                            color: Theme.of(context).dividerColor),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        mainAxisSize: MainAxisSize.min,
                        children: <Widget>[
                          _LegendDot(
                              color: AppColors.primary,
                              label: widget.t('admin.status_verified')),
                          const SizedBox(height: 4),
                          _LegendDot(
                              color: AppColors.accent,
                              label: widget.t('admin.status_pending')),
                        ],
                      ),
                    ),
                  ),
                  // Conteo de puntos visibles
                  Positioned(
                    right: 10,
                    top: 10,
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 10, vertical: 6),
                      decoration: BoxDecoration(
                        color: (isDark
                                ? AppColors.darkSurface
                                : AppColors.lightSurface)
                            .withOpacity(0.92),
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(
                            color: Theme.of(context).dividerColor),
                      ),
                      child: Text(
                        '${(_heatLast30 ? widget.overview.recent30 : widget.overview.reports).length} pts',
                        style: TextStyle(
                          fontFamily: AppTheme.fontFamily,
                          fontSize: 11,
                          fontWeight: FontWeight.w800,
                          color: Theme.of(context)
                              .colorScheme
                              .onSurface
                              .withOpacity(0.7),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),
        ],
      ),
    );
  }

  /// Círculos de calor: el radio se reduce donde los reportes se concentran
  /// (más intensidad visual) y crece en zonas aisladas.
  Set<Circle> _buildHeatCircles(List<Report> reports) {
    final List<Report> valid = reports
        .where((Report r) =>
            !r.lat.isNaN && !r.lng.isNaN && r.lat != 0 && r.lng != 0)
        .toList();
    if (valid.isEmpty) return const <Circle>{};

    Set<Circle> circles = <Circle>{};
    for (final Report r in valid) {
      // Densidad: vecinos dentro de ~0.8°
      int neighbors = 0;
      for (final Report other in valid) {
        if ((other.lat - r.lat).abs() < 0.8 &&
            (other.lng - r.lng).abs() < 0.8) {
          neighbors++;
        }
      }
      final double radius = (90000 / neighbors).clamp(18000, 95000);
      final Color color = r.status == ReportStatus.verified
          ? AppColors.primary
          : AppColors.accent;
      circles.add(Circle(
        circleId: CircleId(r.id),
        center: LatLng(r.lat, r.lng),
        radius: radius,
        strokeWidth: 0,
        fillColor: color.withOpacity(0.38),
      ));
    }
    return circles;
  }
}

/// Punto de leyenda del mapa de calor.
class _LegendDot extends StatelessWidget {
  const _LegendDot({required this.color, required this.label});

  final Color color;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: <Widget>[
        Container(
          width: 8,
          height: 8,
          decoration:
              BoxDecoration(color: color.withOpacity(0.75), shape: BoxShape.circle),
        ),
        const SizedBox(width: 6),
        Text(
          label,
          style: TextStyle(
            fontFamily: AppTheme.fontFamily,
            fontSize: 10,
            fontWeight: FontWeight.w700,
            color: Theme.of(context).colorScheme.onSurface.withOpacity(0.7),
          ),
        ),
      ],
    );
  }
}

class _MetricCard extends StatelessWidget {
  const _MetricCard({
    required this.label,
    required this.value,
    required this.icon,
    required this.color,
  });

  final String label;
  final String value;
  final IconData icon;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surface,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: Theme.of(context).dividerColor),
      ),
      child: Row(
        children: <Widget>[
          Container(
            width: 34,
            height: 34,
            decoration: BoxDecoration(
              color: color.withOpacity(0.12),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(icon, size: 18, color: color),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: <Widget>[
                Text(
                  label,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: Theme.of(context).textTheme.bodySmall,
                ),
                Text(value, style: Theme.of(context).textTheme.headlineSmall),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Tabs
// ---------------------------------------------------------------------------

class _ReportsTab extends ConsumerWidget {
  const _ReportsTab({
    required this.overview,
    required this.only,
    required this.reload,
    required this.t,
  });

  final AdminOverview overview;
  final ReportStatus only;
  final Future<void> Function() reload;
  final String Function(String) t;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final List<Report> list = overview.recent30
        .where((Report r) => r.status == only)
        .toList();
    if (list.isEmpty) {
      return EmptyState(icon: LucideIcons.inbox, message: t('admin.no_data'));
    }

    return ListView.separated(
      padding: const EdgeInsets.all(16),
      itemCount: list.length,
      separatorBuilder: (_, __) => const SizedBox(height: 10),
      itemBuilder: (BuildContext context, int index) {
        final Report report = list[index];
        final bool isDepredacion = report.type == 'depredacion';
        return Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Theme.of(context).colorScheme.surface,
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: Theme.of(context).dividerColor),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              Row(
                children: <Widget>[
                  StatusChip(
                    label: report.type,
                    color: isDepredacion
                        ? AppColors.danger
                        : AppColors.accent,
                  ),
                  const Spacer(),
                  Text(
                    Formatters.shortDate(report.createdAt),
                    style: Theme.of(context).textTheme.bodySmall,
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Text(
                report.displayAnimal,
                style: Theme.of(context).textTheme.titleMedium,
              ),
              if (report.notes?.isNotEmpty == true) ...<Widget>[
                const SizedBox(height: 4),
                Text(
                  report.notes!,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: Theme.of(context).textTheme.bodyMedium,
                ),
              ],
              if (report.photoUrl?.isNotEmpty == true) ...<Widget>[
                const SizedBox(height: 10),
                ClipRRect(
                  borderRadius: BorderRadius.circular(14),
                  child: Image.network(
                    report.photoUrl!,
                    width: double.infinity,
                    height: 120,
                    fit: BoxFit.cover,
                    errorBuilder: (_, __, ___) => const SizedBox(height: 0),
                  ),
                ),
              ],
              const SizedBox(height: 12),
              Row(
                children: <Widget>[
                  CircleAvatar(
                    radius: 11,
                    backgroundColor: Theme.of(context).dividerColor,
                    child: Text(
                      (report.userName ?? '?').characters.first.toUpperCase(),
                      style: const TextStyle(fontSize: 9, fontWeight: FontWeight.w800),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      report.anonymous
                          ? t('admin.anonymous')
                          : (report.userName ?? ''),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: Theme.of(context).textTheme.bodySmall,
                    ),
                  ),
                  if (report.status == ReportStatus.pending) ...<Widget>[
                    _RoundAction(
                      icon: LucideIcons.xCircle,
                      color: AppColors.danger,
                      onTap: () async {
                        try {
                          await ref
                              .read(adminRepositoryProvider)
                              .setReportStatus(
                                  report.id, ReportStatus.denied);
                          await reload();
                        } catch (_) {
                          if (context.mounted) {
                            AppToast.show(
                                context, 'Error al actualizar', error: true);
                          }
                        }
                      },
                    ),
                    const SizedBox(width: 8),
                    _RoundAction(
                      icon: LucideIcons.checkCircle,
                      color: AppColors.primary,
                      onTap: () async {
                        try {
                          await ref
                              .read(adminRepositoryProvider)
                              .setReportStatus(
                                  report.id, ReportStatus.verified);
                          await reload();
                          if (context.mounted) {
                            AppToast.show(context,
                                'Reporte verificado y puntos asignados (+10)');
                          }
                        } catch (_) {
                          if (context.mounted) {
                            AppToast.show(
                                context, 'Error al actualizar', error: true);
                          }
                        }
                      },
                    ),
                  ],
                ],
              ),
            ],
          ),
        );
      },
    );
  }
}

class _RoundAction extends StatelessWidget {
  const _RoundAction({
    required this.icon,
    required this.color,
    required this.onTap,
  });

  final IconData icon;
  final Color color;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        padding: const EdgeInsets.all(8),
        decoration: BoxDecoration(
          color: color.withOpacity(0.1),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Icon(icon, size: 20, color: color),
      ),
    );
  }
}

class _RedemptionsTab extends ConsumerWidget {
  const _RedemptionsTab({
    required this.overview,
    required this.reload,
    required this.t,
  });

  final AdminOverview overview;
  final Future<void> Function() reload;
  final String Function(String) t;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final List<Redemption> pending = overview.redemptions
        .where((Redemption r) => r.status == 'pending')
        .toList();
    if (pending.isEmpty) {
      return EmptyState(icon: LucideIcons.inbox, message: t('admin.no_data'));
    }

    return ListView.separated(
      padding: const EdgeInsets.all(16),
      itemCount: pending.length,
      separatorBuilder: (_, __) => const SizedBox(height: 10),
      itemBuilder: (BuildContext context, int index) {
        final Redemption redemption = pending[index];
        return Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Theme.of(context).colorScheme.surface,
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: Theme.of(context).dividerColor),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              Row(
                children: <Widget>[
                  Expanded(
                    child: Text(redemption.userName,
                        style: Theme.of(context).textTheme.titleMedium),
                  ),
                  Text(
                    '${redemption.points} pts',
                    style: const TextStyle(
                      fontFamily: AppTheme.fontFamily,
                      fontWeight: FontWeight.w900,
                      fontSize: 18,
                      color: AppColors.primary,
                    ),
                  ),
                ],
              ),
              Text(redemption.contact,
                  style: Theme.of(context).textTheme.bodySmall),
              const SizedBox(height: 12),
              Row(
                children: <Widget>[
                  Expanded(
                    child: OutlinedButton(
                      style: OutlinedButton.styleFrom(
                        foregroundColor: AppColors.danger,
                        side: BorderSide(
                            color: AppColors.danger.withOpacity(0.4)),
                        minimumSize: const Size.fromHeight(42),
                      ),
                      onPressed: () async {
                        await ref
                            .read(adminRepositoryProvider)
                            .setRedemptionStatus(
                                redemption.id, 'rejected');
                        await reload();
                      },
                      child: Text(t('admin.reject')),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: FilledButton(
                      style: FilledButton.styleFrom(
                          minimumSize: const Size.fromHeight(42)),
                      onPressed: () async {
                        await ref
                            .read(adminRepositoryProvider)
                            .setRedemptionStatus(redemption.id, 'approved');
                        await reload();
                      },
                      child: Text(t('admin.approve')),
                    ),
                  ),
                ],
              ),
            ],
          ),
        );
      },
    );
  }
}

class _MessagesTab extends ConsumerWidget {
  const _MessagesTab({
    required this.overview,
    required this.reload,
    required this.t,
  });

  final AdminOverview overview;
  final Future<void> Function() reload;
  final String Function(String) t;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final List<InboxMessage> unread = overview.messages
        .where((InboxMessage m) => m.status == 'unread')
        .toList();
    if (unread.isEmpty) {
      return EmptyState(icon: LucideIcons.inbox, message: t('admin.no_data'));
    }

    return ListView.separated(
      padding: const EdgeInsets.all(16),
      itemCount: unread.length,
      separatorBuilder: (_, __) => const SizedBox(height: 10),
      itemBuilder: (BuildContext context, int index) {
        final InboxMessage message = unread[index];
        return Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Theme.of(context).colorScheme.surface,
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: Theme.of(context).dividerColor),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              Row(
                children: <Widget>[
                  Expanded(
                    child: Text(message.userName,
                        style: Theme.of(context).textTheme.titleMedium),
                  ),
                  FilledButton.tonal(
                    style: FilledButton.styleFrom(
                      minimumSize: const Size(84, 38),
                      padding: EdgeInsets.zero,
                    ),
                    onPressed: () async {
                      await ref
                          .read(adminRepositoryProvider)
                          .markMessageRead(message.id);
                      await reload();
                    },
                    child: const Text('Listo'),
                  ),
                ],
              ),
              Text(
                '${t('admin.contact')}: ${message.userContact} · ${message.reference}',
                style: Theme.of(context).textTheme.bodySmall,
              ),
              const SizedBox(height: 10),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Theme.of(context).dividerColor.withOpacity(0.2),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Text(
                  '"${message.message}"',
                  style: Theme.of(context)
                      .textTheme
                      .bodyMedium
                      ?.copyWith(fontStyle: FontStyle.italic),
                ),
              ),
              const SizedBox(height: 8),
              Text(
                Formatters.fullDateTime(message.createdAt),
                textAlign: TextAlign.right,
                style: Theme.of(context).textTheme.bodySmall,
              ),
            ],
          ),
        );
      },
    );
  }
}

class _ExportButton extends StatelessWidget {
  const _ExportButton({required this.label, required this.onTap});

  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return OutlinedButton(
      style: OutlinedButton.styleFrom(
        minimumSize: const Size(150, 44),
        maximumSize: const Size(220, 44),
        padding: const EdgeInsets.symmetric(horizontal: 12),
      ),
      onPressed: onTap,
      child: Text(
        label,
        maxLines: 1,
        overflow: TextOverflow.ellipsis,
        style: const TextStyle(fontSize: 12),
      ),
    );
  }
}
