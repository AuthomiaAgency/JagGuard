# JaGuarD — COEX 5.0

**Plataforma cívico-ambiental nativa (Flutter) para reportar y prevenir conflictos entre humanos y fauna silvestre** — con énfasis en felinos mayores (jaguar, puma) y comunidades ganaderas de Perú y Sudamérica.

| | |
|---|---|
| **Backend** | Supabase — proyecto **`Jaguard`** (`wxrgitoukbowtygfyrel.supabase.co`, región sa-east-1) |
| **App** | Flutter 3.44 · Dart 3.12 · Riverpod · go_router |
| **Base de datos** | PostgreSQL 17 + Row Level Security |
| **Storage** | Buckets públicos `reports` y `guides-media` |
| **Mapas** | Google Maps SDK (Android/iOS) con estilo oscuro |
| **Idiomas** | Español · English · Português · Quechua · Aymara |

---

## 1. Qué incluye

### App de usuarios
- **Onboarding** de 5 slides animados + **splash** con el logotipo del jaguar (invierte sus colores en modo oscuro).
- **Reportar evento**: 6 categorías (avistamiento, huella, depredación, atropellamiento, tráfico, matanza) → identificación de animal (jaguar/puma/otro/desconocido) → evidencia fotográfica (cámara o galería, comprimida a JPEG 1200 px) → **ubicación con Google Maps** (toque para ajustar, botón GPS, badge de precisión ±m).
- **Offline-first**: sin conexión el reporte se guarda en SQLite y se sincroniza solo al recuperar señal (cola con reintentos, idempotente vía RPC atómica `submit_report`).
- **Aprender**: grupos temáticos, guías con contenido HTML, descarga para lectura offline, consulta a especialistas.
- **Perfil**: gamificación (+10 pts por reporte, +10 al verificarse), barra hacia la meta de 150 pts, **canje atómico** vía RPC `redeem_points` (imposible canjar dos veces), historial de 30 días, avatar, idioma y tema.

### Panel de administración (sidebar lateral)
- Métricas en vivo (total, verificados, canjes pendientes, mensajes sin leer).
- **Gráfica de frecuencia por especie (30 días)** con fl_chart.
- **Mapa de calor** con selector de rango (30 días / histórico), densidad adaptativa por radio, leyenda y conteo de puntos.
- Verificación de reportes (aprueba y asigna puntos una sola vez, transaccional).
- Gestión de canjes (aprobar/rechazar) y bandeja de mensajes.
- **Editor CMS nativo (Quill)**: grupos e historias con formato enriquecido, portadas y adjuntos subidos a Storage (`guides-media`).
- **Exportación** a Excel y CSV (histórico / 30 días / verificados) compartida con Share Sheet.

---

## 2. Estructura del proyecto

```
WWF/
├── jaguard_app/                  # App Flutter (este es el producto)
│   ├── lib/
│   │   ├── core/                 # config, tema, i18n, router, DB local, widgets
│   │   └── features/
│   │       ├── auth/             # login/registro/sesión (Supabase Auth)
│   │       ├── onboarding/       # splash + tutorial
│   │       ├── reports/          # categorías, formulario, mapa, cola offline
│   │       ├── learn/            # guías educativas + especialistas
│   │       ├── profile/          # puntos, canjes, ajustes
│   │       ├── admin/            # dashboard, CMS, exportaciones
│   │       └── sync/             # sincronizador de colas offline
│   └── assets/branding/          # logotipo (claro/oscuro/acento) + icono
└── src/                          # prototipo web original (referencia histórica)
```

---

## 3. Variables de entorno

### Flutter (`jaguard_app`)

Se inyectan con `--dart-define` o `--dart-define-from-file=env.json`. Los valores por defecto ya apuntan al proyecto **Jaguard** de Supabase, así que `flutter run` funciona sin configurar nada en desarrollo.

| Variable | Obligatoria | Descripción |
|---|---|---|
| `SUPABASE_URL` | No (ya embebida) | `https://wxrgitoukbowtygfyrel.supabase.co` |
| `SUPABASE_ANON_KEY` / `SUPABASE_PUBLISHABLE_KEY` | No (ya embebida) | Clave pública; la seguridad real la aplican las políticas RLS |
| `MAPS_API_KEY` | **Sí para compilar** | API key de **Google Maps SDK for Android/iOS** (ver abajo) |

**Lo único que falta para producción: la API key de Google Maps.**

1. En [Google Cloud Console](https://console.cloud.google.com/) crea (o reusa) un proyecto y habilita **Maps SDK for Android** y **Maps SDK for iOS**.
2. Crea una API key y restríngela por identificador de app (`com.authomia.jaguard`) y por API.
3. Proporciónala de cualquiera de estas dos formas:
   - Variable de entorno de Gradle: `GMAPS_API_KEY=AIza... flutter build apk` (Android), o
   - `--dart-define=MAPS_API_KEY=AIza...` (Android e iOS).

Ejemplo de compilación final:

```bash
cd jaguard_app
flutter build apk --release \
  --dart-define=MAPS_API_KEY=AIzaTuClave
```

> Las claves de Supabase incluidas son **publishable/anon**: están diseñadas para vivir en el cliente. Nunca coloques aquí la `service_role`.

### Web original (solo referencia)

`cp .env.example .env.local` — requiere `GEMINI_API_KEY` (prototipo de AI Studio). Dependencias con **pnpm**: `pnpm install` (lockfile `pnpm-lock.yaml` ya generado).

---

## 4. Base de datos (Supabase `Jaguard`)

Esquema completo ya aplicado por migraciones (`create_schema`, `storage_buckets`):

| Tabla | Equivalente Firestore | Notas |
|---|---|---|
| `profiles` | `users` | `role user|admin`, `points`, trigger `on_auth_user_created` crea el perfil al registrarse y asigna admin si el correo está en `admin_emails` |
| `reports` | `reports` | `status pending|verified|denied`, índices por estado/fecha/geo |
| `guide_groups` | `groups` | Lectura pública, escritura admin |
| `guides` | `guides` | `group_id` FK (antes se acoplaba por nombre), `files` jsonb |
| `redemptions` | `redemptions` | Canje 150 pts, estados `pending|approved|rejected` |
| `messages` | `messages` | Consultas a especialistas |
| `admin_emails` | lista hardcodeada | Ahora gestionable en BD; seed con los 5 correos originales |

**RPCs atómicas** (corrigen los incrementos no transaccionales de la web):
- `submit_report(...)` — inserta reporte + suma 10 pts en una transacción.
- `redeem_points()` — valida saldo con `FOR UPDATE`, crea canje y descuenta (a prueba de doble tap).
- `set_report_status(id, status)` — verifica/rechaza y otorga +10 una sola vez.
- `resolve_login_email(telefono)` — login por teléfono resuelto en servidor.

**RLS activa en las 7 tablas** (paridad con `firestore.rules`): verificados públicos, propios siempre visibles, admins con CRUD completo, usuarios no pueden tocarse `role`/`points` (trigger `protect_profile_fields`).

**Storage**: bucket `reports/{uid}/{uuid}.jpg` (escritura solo en carpeta propia) y `guides-media` (solo admin), ambos de lectura pública para URLs estables en exportaciones.

---

## 5. Ejecución

```bash
cd jaguard_app
flutter pub get
flutter run                      # con las claves Supabase embebidas
flutter test                     # tests de i18n
flutter analyze                  # 0 errores / 0 warnings
```

Compilación release (requiere solo `MAPS_API_KEY`):

```bash
flutter build apk --release --dart-define=MAPS_API_KEY=AIza...
# o iOS:
flutter build ios --release --dart-define=MAPS_API_KEY=AIza...
```

---

## 6. Guardarraíles de seguridad

1. **RLS en todas las tablas** — sin cliente privilegiado; la clave pública no expone datos.
2. **Escalada de roles controlada** — solo trigger de signup contra `admin_emails`; nadie puede auto-promoverse.
3. **Puntos intocables desde el cliente** — trigger bloquea cambios directos; solo RPCs transaccionales los modifican.
4. **Storage por carpeta** — cada usuario escribe únicamente en `reports/{su-uid}/`.
5. **Idempotencia offline** — reportes con UUID v4 + PK: reintentos nunca duplican filas ni puntos.
6. **Fotos comprimidas** (JPEG ~1200 px, calidad 62) antes de subir — sin Base64 en la base.

---

## 7. Próximos pasos sugeridos

- [ ] API key de Google Maps (único bloqueante para compilar release).
- [ ] Confirmación de email en Supabase Auth (hoy desactivada para pruebas rápidas: Auth → Providers → Email).
- [ ] Migrar usuarios históricos de Firebase (script de export → `auth.admin.importUser` + insert en `profiles`).
- [ ] App Check/Attestation (Play Integrity) para endurecer la RPC de reportes contra abuso.
- [ ] Firmar el release con keystore propio (`android/key.properties`).

---

*Jaguard · COEX 5.0 · 2026*
