# 🏔️ COEX 5.0 - Especificación Arquitectónica y Técnica del Sistema
> **Nota para Agentes de IA (Antigravity) y Desarrolladores:** Este documento contiene la especificación a nivel de software, arquitectura, bases de datos y flujos lógicos de Coex5.0. Su propósito es servir como contexto inyectable para futuras mejoras, migraciones de servicios (ej. implementación de Storage) y escalabilidad del código.

## 1. Visión General del Proyecto
**Coex5.0** es una plataforma de tecnología cívica (*CivicTech*) y ambiental (*EnviroTech*) diseñada para mitigar, reportar y educar sobre conflictos entre humanos y fauna silvestre (especialmente felinos mayores como el Jaguar). 
*   **Arquitectura Base:** Aplicación de Página Única (SPA) React con capacidades *Offline-First* enfocada en despliegues PWA (Progressive Web App) para zonas rurales.
*   **Backend como Servicio (BaaS):** Firebase (Firestore para base de datos, Auth para identidad).

---

## 2. Stack Tecnológico (Dependencias Clave)
*   **Core:** React 18, React Router v6, TypeScript, Vite.
*   **Estilos:** Tailwind CSS (optimizado con clases utilitarias personalizadas para componentes ricos).
*   **Mapas y Geoespacial:** `react-leaflet`, `leaflet`, `leaflet.heat` (Mapas de calor).
*   **Almacenamiento Local (Offline):** `localforage` (Usa IndexedDB de forma asíncrona).
*   **Gestión de Contenido (CMS):** `react-quill-new` con sanitización `dompurify` (prevención XSS).
*   **Exportación y Análisis:** `xlsx` para generación de reportes en Excel, `recharts` para gráficos del tablero, `html-to-image` para exportar mapas/gráficos.
*   **Íconos y UI:** `lucide-react`, `react-hot-toast` (notificaciones).

---

## 3. Infraestructura Backend (Firebase)

### 3.1. Autenticación (Firebase Auth)
*   **Métodos Permitidos:** Correo electrónico/Contraseña.
*   **Logica de Migración Telefónica:** En la pantalla de login, existe lógica retroactiva para aceptar números telefónicos, intentando parsear y buscar el usuario en Firestore, proveyendo un mapeo a un "correo falso" si el usuario era de un sistema anticuado.
*   **Seguridad y Roles (RBAC):** Escalada de privilegios altamente controlada. Los administradores están *hardcodeados* tanto en el Front-End (`App.tsx`, `Login.tsx`, `Register.tsx`) como en las reglas de Firestore (`firestore.rules`).
    *   **Admins Actuales:** `admin@labsnatural.com`, `authomia.agency@gmail.com`, `usuario@gmail.com`, `luiseduardocerron.ec@gmail.com`, `cerronbarrial@gmail.com`.

### 3.2. Modelo de Base de Datos (Cloud Firestore)
La base de datos sigue una arquitectura NoSQL desnormalizada.

#### Colección: `users`
*   `id` (string): Firebase UID.
*   `name`, `email`, `phone`, `contact` (string): Datos de perfil.
*   `role` (enum): `'admin'` | `'user'`.
*   `points` (number): Sistema de gamificación. Se suman 10 pts por reporte.
*   `avatar` (string): URL de imagen generada por Dicebear.

#### Colección: `reports`
*   `user_id`, `user_name`, `user_contact` (string).
*   `type` (string): Tipo de evento (Avistamiento, conflicto, etc.).
*   `animal` (string): Especie (Ej. 'jaguar', 'puma'). `specific_animal` si es 'otros'.
*   `lat`, `lng` (number): Coordenadas GPS.
*   `photo_url` (string): **Actualmente almacena el Data URL en Base64 de la imagen.** Comprimida en Canvas (máx 600x600 px) al momento del reporte.
*   `status` (enum): `'pending'` | `'verified'` | `'denied'`. Se requiere ser admin para pasar de 'pending' a 'verified'.
*   `notes` (string): Observaciones.

#### Colección: `guides` & `groups` (Módulo Educativo)
*   **Groups:** Categorías superiores (`name`, `icon`).
*   **Guides:** Publicaciones enriquecidas. (`title`, `subtitle`, `content` [HTML del Quill Editor], `group`, `image_url`, `video_url`, `read_time`, `files` [adjuntos]).

#### Colección: `redemptions` & `messages`
*   **Redemptions:** Solicitudes para cambiar `points` por bienes físicos.
*   **Messages:** Consultas offline/online dirigidas a especialistas desde las guías.

### 3.3 Reglas de Seguridad (Firestore Rules)
El sistema emplea reglas complejas basadas en validación de tokens y datos del documento:
1.  Lectura de `/users`: El dueño o un admin. Actualización bloqueada para campos sensibles (`role`, `points`).
2.  Lectura de `/reports`: Si `status == 'verified'`, lectura pública. Si no, solo el creador o admins.
3.  Escritura general: Los usuarios solo pueden crear documentos en estado `'pending'` pasando su propio `uid`. Los administradores tienen permisos CRUD completos.

---

## 4. Arquitectura Frontend y Lógica de Negocio

### 4.1. Flujo Offline-First
*   La app revisa constantemente `navigator.onLine`.
*   **Subida a LocalForage:** Si no hay red, el objeto a guardar (reporte, mensaje o lectura guardada) se empuja a un arreglo en IndexedDB (ej. clave `'offline_reports'`).
*   *Área de Mejora (Deuda Técnica):* La sincronización automática hacia Firebase cuando la red vuelve debe robustecerse con un Service Worker de PWA. Actualmente se maneja a nivel de componentes o necesita ser empujado manualmente.

### 4.2. Sistema de Reporte (ReportForm.tsx)
*   **Compresión de Imágenes:** Para evadir el límite de 1MB de los documentos de Firestore, la app intercepta el Input File, lo dibuja en un Canvas HTML5 y exporta un JPG al 50% de calidad.
*   **Geolocalización:** El sistema solicita GPS y usa una ubicación de respaldo estática (Sudamérica central) si falla, permitiendo reajuste manual mediante *Arrastrar y Soltar* o clic en `react-leaflet`.

### 4.3. Panel de Administración (Dashboard)
*   **Visor Independiente de Fotos:** Existe la ruta pública-privada `/p/:id` (`ReportPhotoView.tsx`). Si el Excel se exporta, la URL Base64 gigante se cambia por este enlace.
*   **Manejo de Errores Silencioso y Tolerancia a Fallos:** Implementado usando `handleFirestoreError`. Cuando Firestore devuelve PERMISSION_DENIED, el error bloquea la UI maliciosa o informa al desarrollador sin romper la app.
*   **Exportadores Nativos:** Se usa `xlsx` para construir *blobs* binarios en memoria basados de los arrays de estado de React (`reports`), parseando fechas e inyectando URLs del visor de fotos para evitar que Excel colapse procesando cadenas de 500,000 caracteres Base64.
*   **Editor de Contenido (CMS):** Se aplica CSS personalizado a las clases `.prose-custom` para asegurar que el `overflow-wrap` evite el desbordamiento horizontal en móviles, una complicación frecuente en React Quill.

---

## 5. Plan de Transición a Fase de Producción (Guía para el Agente IA)

Al momento de recibir financiamiento y llevar este código a **escala macro**, el agente IA (Antigravity o similar) debe ejecutar lo siguiente:

### Tarea de Migración 1: Firebase Storage (Urgente)
1. Reemplazar toda compresión a Base64 en `ReportForm.tsx`.
2. Integrar `getStorage` de `firebase/storage`.
3. Subir el `File` crudo o levemente comprimido al Storage (en formato `/reports/{userId}/{uuid}.jpg`).
4. Obtener la `downloadURL` y, esta vez, guardar esa URL corta de Google Storage dentro del documento de Firestore (`reports`).
5. Migrar el panel de Panel de Admin > CMS > Nueva Guía para que también suba los *Covers* e Imágenes del cuerpo del artículo directamente al Storage.

### Tarea de Migración 2: App Check
1. Integrar reCAPTCHA Enterprise (`initializeAppCheck(app, { provider: new ReCaptchaEnterpriseProvider('API_KEY'), isTokenAutoRefreshEnabled: true })`).
2. Esto evitará falsificación de reportes.

### Tarea de Migración 3: Service Workers (PWA pura)
1. Utilizar un plugin como `vite-plugin-pwa`.
2. Mover la lógica offline de `localforage` a `Workbox` (Background Sync) para que los reportes se envíen solos cuando el dispositivo ganadero consiga red, sin requerir que la app esté abierta.

---
*Coex 5.0 - Estandarizado para desarrollo colaborativo IA-Humano. 2026.*
