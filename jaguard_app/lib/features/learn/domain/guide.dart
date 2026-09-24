/// Grupo de contenido educativo (tabla `guide_groups`).
class GuideGroup {
  const GuideGroup({
    required this.id,
    required this.name,
    required this.icon,
  });

  final String id;
  final String name;
  final String icon;

  factory GuideGroup.fromMap(Map<String, dynamic> map) => GuideGroup(
        id: map['id'] as String,
        name: (map['name'] as String?) ?? '',
        icon: (map['icon'] as String?) ?? 'paw',
      );
}

/// Publicación educativa (tabla `guides`).
class Guide {
  const Guide({
    required this.id,
    required this.title,
    required this.content,
    required this.readTime,
    this.subtitle,
    this.groupId,
    this.groupName,
    this.imageUrl,
    this.videoUrl,
    this.files = const <GuideFile>[],
  });

  final String id;
  final String title;
  final String? subtitle;
  final String content;
  final String? groupId;
  final String? groupName;
  final String? imageUrl;
  final String? videoUrl;
  final int readTime;
  final List<GuideFile> files;

  factory Guide.fromMap(Map<String, dynamic> map) {
    final dynamic rawGroup = map['guide_groups'];
    final List<dynamic> rawFiles = (map['files'] as List<dynamic>?) ?? <dynamic>[];
    return Guide(
      id: map['id'] as String,
      title: (map['title'] as String?) ?? '',
      subtitle: map['subtitle'] as String?,
      content: (map['content'] as String?) ?? '',
      groupId: map['group_id'] as String?,
      groupName: rawGroup is Map ? rawGroup['name'] as String? : null,
      imageUrl: map['image_url'] as String?,
      videoUrl: map['video_url'] as String?,
      readTime: (map['read_time'] as num?)?.toInt() ?? 5,
      files: rawFiles
          .map((dynamic f) =>
              GuideFile.fromMap(Map<String, dynamic>.from(f as Map)))
          .toList(),
    );
  }

  Map<String, dynamic> toJson() => <String, dynamic>{
        'id': id,
        'title': title,
        'subtitle': subtitle,
        'content': content,
        'group_id': groupId,
        'group_name': groupName,
        'image_url': imageUrl,
        'video_url': videoUrl,
        'read_time': readTime,
        'files': files.map((GuideFile f) => f.toJson()).toList(),
      };

  factory Guide.fromJson(Map<String, dynamic> json) => Guide(
        id: json['id'] as String,
        title: (json['title'] as String?) ?? '',
        subtitle: json['subtitle'] as String?,
        content: (json['content'] as String?) ?? '',
        groupId: json['group_id'] as String?,
        groupName: json['group_name'] as String?,
        imageUrl: json['image_url'] as String?,
        videoUrl: json['video_url'] as String?,
        readTime: (json['read_time'] as num?)?.toInt() ?? 5,
        files: ((json['files'] as List<dynamic>?) ?? <dynamic>[])
            .map((dynamic f) =>
                GuideFile.fromMap(Map<String, dynamic>.from(f as Map)))
            .toList(),
      );
}

/// Adjunto de una guía: enlace externo o archivo subido.
class GuideFile {
  const GuideFile({
    required this.name,
    required this.url,
    this.isLink = false,
    this.mimeType,
  });

  final String name;
  final String url;
  final bool isLink;
  final String? mimeType;

  factory GuideFile.fromMap(Map<String, dynamic> map) => GuideFile(
        name: (map['name'] as String?) ?? 'Archivo',
        url: (map['url'] as String?) ?? '',
        isLink: (map['type'] as String?) == 'link',
        mimeType: map['mimeType'] as String?,
      );

  Map<String, dynamic> toJson() => <String, dynamic>{
        'name': name,
        'url': url,
        'type': isLink ? 'link' : 'file',
        'mimeType': mimeType,
      };
}

/// Consulta dirigida a un especialista (tabla `messages`).
class SpecialistMessage {
  const SpecialistMessage({
    required this.userId,
    required this.userName,
    required this.userContact,
    required this.reference,
    required this.message,
  });

  final String? userId;
  final String userName;
  final String userContact;
  final String reference;
  final String message;

  Map<String, dynamic> toJson() => <String, dynamic>{
        'user_id': userId,
        'user_name': userName,
        'user_contact': userContact,
        'reference': reference,
        'message': message,
      };
}
