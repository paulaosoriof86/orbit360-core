# CXOrbia — Instrucciones de Migración a TyA (proyecto cliente)

> Guía para: (1) crear el proyecto de migración a partir de este prototipo maestro,
> (2) traer los datos reales desde la versión antigua de TyA (que vive en OpenAI/ChatGPT),
> (3) probar el backend con datos reales, (4) personalizar TyA como un cliente nuevo.

---

## 0. Concepto: este prototipo es el MAESTRO (plantilla)

- **Este proyecto (`app/`) queda como plantilla maestra white-label.** No lo tocamos para TyA.
- Para TyA creas una **COPIA** y sobre ella personalizas y migras. Así cualquier mejora futura se hace primero en el maestro y se propaga, y cada cliente nuevo nace de la misma base.

### ¿Proyecto "design" o proyecto normal?
**Proyecto normal** (NO un documento de diseño). Esto es una aplicación funcional, no una exploración visual. Un proyecto "design"/canvas es solo para comparar variantes visuales. Crea un **proyecto normal** y copia dentro toda la carpeta `app/`.

### Cómo crear la copia
1. En tu plataforma de proyectos, **crea un proyecto nuevo** (normal) llamado p.ej. **"CXOrbia — TyA (producción)"**.
2. Pídeme en esa nueva conversación que **importe la carpeta `app/` de este proyecto maestro** (puedo copiar archivos entre proyectos si te he dado acceso de lectura al maestro). O descarga el ZIP de este proyecto y súbelo al nuevo.
3. A partir de ahí, en esa conversación trabajamos la personalización + migración de TyA, y este maestro queda intacto.

---

## 1. PROMPT PARA DARLE A LA CONVERSACIÓN DE OPENAI (versión antigua de TyA)

> Copia y pega esto en la conversación de ChatGPT donde está la versión antigua de TyA.
> El objetivo es **EXTRAER solo los datos buenos** en un formato limpio (JSON/CSV) que podamos importar, y que te **señale lo que está mal** para no arrastrarlo.

```
Necesito exportar los datos REALES de esta plataforma de TyA para migrarlos a una
plataforma nueva. NO migres lógica ni código: solo DATOS, limpios y estructurados.

1) EXPORTA en archivos separados (JSON preferido; CSV si es tabular), un objeto por
   registro, con estos conjuntos —y dime de cuáles SÍ hay datos reales y de cuáles no:

   a. SHOPPERS / evaluadores: nombre completo, documento/DPI, teléfono/WhatsApp, correo,
      país, ciudad/departamento, datos bancarios, estado, rating/calificación, fecha de alta.
   b. CERTIFICACIONES ya obtenidas: shopper, proyecto, % obtenido, fecha, estado (vigente/vencida),
      intentos. (Necesito conservar quién YA está certificado.)
   c. DOCUMENTOS y certificaciones ya PRESENTADAS: tipo, shopper/proyecto, nombre de archivo,
      enlace si existe, fecha.
   d. CUESTIONARIOS marcados como REALIZADOS: visita asociada, sucursal, shopper, escenario,
      fecha, puntaje/score, y respuestas si están disponibles.
   e. VISITAS marcadas como REALIZADAS / liquidadas: sucursal, ciudad, país, escenario, quincena/periodo,
      shopper asignado, fecha realizada, honorario, reembolsos, estado, y un IDENTIFICADOR ESTABLE
      por fila (si existe el id de la hoja de ruta, inclúyelo como "extId").
   f. HISTORIAL por shopper: visitas anteriores con fecha, sucursal, estado, puntaje.
   g. HOJA DE RUTA EN VIVO del proyecto Cinépolis: dame el enlace/origen (Google Sheets u otro),
      la estructura de columnas y cómo se lee, para conectarla en vivo en la nueva plataforma.
   h. CUESTIONARIOS (definición): por proyecto, secciones, preguntas, pesos, tipo de respuesta,
      evidencias requeridas, y a qué tipo de sucursal/escenario aplica.

2) NORMALIZA: nombres de shopper en formato "Nombre Apellido" (sin duplicados: si el mismo
   shopper aparece con variantes, indícalo para fusionarlo). Fechas en formato AAAA-MM-DD.
   Montos numéricos con su moneda. País como código (GT, HN, etc.).

3) AUDITORÍA — esto es clave: dime EXPLÍCITAMENTE qué está MAL o sucio para NO migrarlo:
   - Registros duplicados (mismo shopper/visita repetido).
   - Datos incompletos o inconsistentes (visitas sin shopper, fechas imposibles, montos vacíos).
   - Campos calculados que no deberían migrarse (déjalos para recalcular en la nueva plataforma).
   - Cualquier dato de prueba/basura.
   Entrégame una lista de "NO migrar / corregir antes" aparte de los datos limpios.

4) ENTREGA: un ZIP o bloques de código con cada archivo (shoppers.json, certificaciones.json,
   visitas_realizadas.json, cuestionarios.json, historial.json, hoja_ruta_cinepolis.md, etc.)
   + un resumen de cuántos registros buenos hay de cada tipo y qué quedó excluido.

Quiero conservar SÍ o SÍ: que ningún shopper pierda su historial, sus certificaciones ni su
registro actual. Lo demás se puede recrear limpio en la plataforma nueva.
```

---

## 2. QUÉ HACER CON LO QUE TE ENTREGUE OPENAI (paso a paso)

1. **Revisa la lista de "NO migrar"** que te dé OpenAI. Decide qué corregir antes (normalmente: duplicados y registros incompletos).
2. **Guarda los archivos limpios** (JSON/CSV) — los usarás en el importador de la plataforma nueva.
3. En la **conversación del proyecto TyA nuevo**, me pasas esos archivos y yo:
   - Configuro TyA como **cliente nuevo** (marca, colores, plan, países GT/HN, módulos contratados).
   - Uso el **Importador inteligente** (ya multi-formato/multi-sección) para cargar shoppers → certificaciones → visitas realizadas → historial → cuestionarios, **respetando la deduplicación por llave natural** (sucursal+ciudad+escenario+quincena o `extId`) para que NO se dupliquen.
   - Conecto la **hoja de ruta en vivo de Cinépolis** (Google Sheets) en modo lectura para que alimente las visitas sin duplicar (doble vía ya resuelta).

---

## 3. PERSONALIZAR TyA COMO CLIENTE NUEVO (en el proyecto nuevo)

Todo esto es autoadministrable, sin tocar código:
- **Marca**: nombre, logo, colores, tipografía (Configuración → Marca/Tema).
- **Plan y módulos**: activa solo los módulos que TyA contrata; los demás quedan ocultos pero disponibles para activar después.
- **Países y monedas**: GT (Q) y HN (L) — ya soportado, separación por moneda.
- **Proyecto Cinépolis**: créalo con su periodicidad (ronda mensual / cumplimiento quincenal), escenarios, sucursales y cuestionario; conecta su HR en vivo.
- **Usuarios y permisos**: crea los usuarios de TyA (coordinadores, supervisores) con su matriz de permisos.

---

## 4. PRUEBAS DEL BACKEND (con datos reales de TyA)

> Hazlo en el proyecto nuevo, una vez tengas Firebase/Supabase + la API key de Gemini.

### 4.1 Preparación
1. Crea el proyecto en **Firebase** (o Supabase): activa **Auth** (correo/clave), **Firestore/Realtime DB** y **Storage**.
2. Pásale al desarrollador (o a mí en el proyecto nuevo) el `firebaseConfig`.
3. Consigue la **API key de Gemini** (Google AI Studio) y la de tus **webhooks de Make**.

### 4.2 Checklist de pruebas (en orden)
1. **Persistencia multi-usuario**: crea un shopper desde un navegador y verifica que aparece en otro (o tras recargar). ✅ si persiste.
2. **Login y roles**: entra como admin, shopper y cliente con usuarios reales; confirma que cada uno ve solo lo suyo (matriz de permisos).
3. **Importación real**: corre el importador con los archivos de OpenAI. Verifica:
   - Nº de shoppers/visitas importados = nº de registros buenos (sin duplicados).
   - Cada shopper conserva **historial y certificaciones**.
4. **HR en vivo (Cinépolis)**: edita una fila en el Google Sheet → confirma que la visita se actualiza en la plataforma **sin duplicar** (doble vía).
5. **Sincronía**: marca una visita como realizada → revisa que aparezca en liquidaciones → beneficios → finanzas → portal del cliente.
6. **IA (Gemini)**: genera un cuestionario desde un instructivo y una propuesta; confirma que responde con contenido real (no el de respaldo).
7. **Automatizaciones (Make)**: dispara un evento (p.ej. aprobar postulación) y confirma que llega el WhatsApp/correo real.
8. **Archivos (Storage)**: sube un PDF/evidencia y confirma que se guarda y se puede abrir.

### 4.3 Qué reportarme acá (en el proyecto maestro)
Si en las pruebas detectas algo que falla o se puede mejorar, **me lo dices acá** (en esta conversación del maestro) con: módulo, qué esperabas y qué pasó. Yo lo corrijo en el maestro, te doy el archivo corregido y/o te digo exactamente **qué instrucción darle al proyecto de TyA** para aplicar el cambio. Así el maestro siempre queda mejorado para los próximos clientes.

---

## 5. Resumen del flujo completo
1. Creas proyecto nuevo (normal) = copia del maestro → "CXOrbia — TyA".
2. Le das a OpenAI el **prompt de la sección 1** → obtienes datos limpios + lista de lo malo.
3. En el proyecto nuevo: personalizas TyA como cliente + importas los datos.
4. Conectas backend (Firebase) + Gemini + Make.
5. Corres el **checklist de pruebas** (sección 4).
6. Lo que falle → me lo dices acá → corrijo el maestro → te doy la instrucción para TyA.

> Mantén SIEMPRE el maestro como fuente de verdad. TyA y cada cliente futuro son copias personalizadas.
