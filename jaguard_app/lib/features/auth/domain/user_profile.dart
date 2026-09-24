/// Perfil de usuario (tabla `profiles` en Supabase).
class UserProfile {
  const UserProfile({
    required this.id,
    required this.name,
    required this.role,
    required this.points,
    required this.avatar,
    this.email,
    this.phone,
    this.contact,
  });

  final String id;
  final String name;
  final String? email;
  final String? phone;
  final String? contact;
  final String role;
  final int points;
  final String avatar;

  bool get isAdmin => role == 'admin';
  String get displayContact => contact ?? email ?? phone ?? '';

  factory UserProfile.fromMap(Map<String, dynamic> map) => UserProfile(
        id: map['id'] as String,
        name: (map['name'] as String?) ?? 'Usuario',
        email: map['email'] as String?,
        phone: map['phone'] as String?,
        contact: map['contact'] as String?,
        role: (map['role'] as String?) ?? 'user',
        points: (map['points'] as num?)?.toInt() ?? 0,
        avatar: (map['avatar'] as String?) ??
            'https://api.dicebear.com/7.x/notionists-neutral/svg?seed=${map['id']}',
      );

  UserProfile copyWith({String? name, String? avatar, int? points}) =>
      UserProfile(
        id: id,
        name: name ?? this.name,
        email: email,
        phone: phone,
        contact: contact,
        role: role,
        points: points ?? this.points,
        avatar: avatar ?? this.avatar,
      );
}
