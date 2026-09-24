import 'package:flutter/material.dart' hide Element;

/// Compatibilidad de iconografía: la web usa `lucide-react`; aquí cada
/// icono se mapea a su equivalente de Material Symbols. Se expone con la
/// misma forma `LucideIcons.nombre` para que el código quede legible y
/// con paridad uno a uno respecto del diseño original.
///
/// (El paquete `lucide_icons` 0.257 es incompatible con Flutter >= 3.38,
/// donde `IconData` es final y no admite subclases externas.)
abstract final class LucideIcons {
  static const IconData alertTriangle = Icons.warning_amber_rounded;
  static const IconData arrowLeft = Icons.arrow_back_rounded;
  static const IconData arrowRight = Icons.arrow_forward_rounded;
  static const IconData award = Icons.emoji_events_outlined;
  static const IconData barChart3 = Icons.bar_chart_rounded;
  static const IconData bookOpen = Icons.menu_book_outlined;
  static const IconData camera = Icons.photo_camera_outlined;
  static const IconData car = Icons.directions_car_outlined;
  static const IconData cat = Icons.pets_outlined;
  static const IconData checkCircle = Icons.check_circle_outline;
  static const IconData checkCircle2 = Icons.check_circle_rounded;
  static const IconData chevronRight = Icons.chevron_right_rounded;
  static const IconData download = Icons.download_outlined;
  static const IconData edit3 = Icons.edit_outlined;
  static const IconData eye = Icons.visibility_outlined;
  static const IconData eyeOff = Icons.visibility_off_outlined;
  static const IconData fileText = Icons.description_outlined;
  static const IconData globe = Icons.public_outlined;
  static const IconData heart = Icons.favorite_outline;
  static const IconData helpCircle = Icons.help_outline_rounded;
  static const IconData home = Icons.home_outlined;
  static const IconData image = Icons.image_outlined;
  static const IconData inbox = Icons.inbox_outlined;
  static const IconData info = Icons.info_outline_rounded;
  static const IconData leaf = Icons.energy_savings_leaf_outlined;
  static const IconData link = Icons.link_outlined;
  static const IconData locate = Icons.gps_fixed_rounded;
  static const IconData lock = Icons.lock_outline_rounded;
  static const IconData logOut = Icons.logout_rounded;
  static const IconData mail = Icons.mail_outline_rounded;
  static const IconData map = Icons.map_outlined;
  static const IconData mapPin = Icons.place_outlined;
  static const IconData messageCircle = Icons.chat_bubble_outline_rounded;
  static const IconData moon = Icons.dark_mode_outlined;
  static const IconData packageX = Icons.inventory_2_outlined;
  static const IconData phone = Icons.phone_outlined;
  static const IconData plus = Icons.add_rounded;
  static const IconData refreshCw = Icons.refresh_rounded;
  static const IconData search = Icons.search_rounded;
  static const IconData send = Icons.send_outlined;
  static const IconData settings = Icons.settings_outlined;
  static const IconData share2 = Icons.share_outlined;
  static const IconData shield = Icons.shield_outlined;
  static const IconData skull = Icons.dangerous_outlined;
  static const IconData star = Icons.star_rounded;
  static const IconData sun = Icons.light_mode_outlined;
  static const IconData trash2 = Icons.delete_outline_rounded;
  static const IconData upload = Icons.upload_outlined;
  static const IconData user = Icons.person_outline_rounded;
  static const IconData video = Icons.videocam_outlined;
  static const IconData wifiOff = Icons.wifi_off_rounded;
  static const IconData x = Icons.close_rounded;
  static const IconData xCircle = Icons.cancel_outlined;
  static const IconData zap = Icons.bolt_rounded;
}
