# CXOrbia — Capacitación Técnica Interna (solo equipo)

> Documento para el equipo de la consultora: onboarding técnico, configuración, soporte y migración.
> NO es para compartir con clientes ni shoppers.

---

## 1. Estructura de la plataforma (para entender qué hace cada parte)

### Capas principales
- **Frontend** (`app/`): HTML + CSS + JavaScript vanilla. Entrada: `app/index.html`. Sin framework.
- **Módulos** (`app/modules/*.js`): cada sección de la plataforma es un módulo registrado con `CX.module('id', fn)`.
- **Core** (`app/core/*.js`): lógica de negocio (datos, HR, deduplicación, finanzas, automatizaciones, IA).
- **Estilos** (`app/styles/`): `theme.css` (tokens y componentes) + `layout.css` (shell y navegación).
- **Docs** (`app/docs/`): plan de trabajo, handoff, guiones, instrucciones.

### Objeto global `CX`
Todo cuelga de `window.CX`: `CX.data` (datos), `CX.session` (sesión), `CX.bus` (sincronía), `CX.fin` / `CX.finStore` / `CX.liq` (finanzas), `CX.hr` / `CX.dedupe` / `CX.importador` (HR), `CX.automations` / `CX.ai` / `CX.notif` (automatizaciones, IA, notificaciones), `CX.crmStore` / `CX.mktStore` / `CX.supportStore` / `CX.learnStore` / `CX.docStore` / `CX.reservas` / `CX.intStore` (módulos adicionales).

---

## 2. Flujo completo: crear proyecto → set-up → operar

### Paso 1: Crear el cliente
1. Admin del Proyecto → **Clientes** → Nuevo cliente
2. Llenar: nombre, rubro (lista compartida `CX.RUBROS`), país, contactos.
3. El cliente queda disponible para crear proyectos.

### Paso 2: Crear el proyecto
1. Admin del Proyecto → **Proyectos** → Nuevo proyecto
2. Llenar: nombre, cliente, industria, países/monedas, escenarios, periodicidad de rondas, periodo de cumplimiento.
3. Activar el proyecto para operar.

### Paso 3: Set-up del programa (HR + Cuestionario + Instructivo + Certificación)
1. **Hojas de Ruta**: Importar HR (CSV/Excel), conectar Google Sheets (HR viva), o usar HR Inteligente (IA extrae desde instructivo).
2. **Cuestionarios**: Cuestionarios → 🤖 Set-up desde instructivo (cargar PDF/protocolo → IA propone secciones, pesos y evidencias → iterar → aceptar). O crear manualmente sección por sección.
3. **Instructivo**: Aprendizaje → Nuevo bloque → agregar el instructivo como documento (PDF o texto) + video de inducción.
4. **Certificación**: Certificación → 🤖 Crear certificación con IA (carga el instructivo → IA genera banco de preguntas → configurar gate % mínimo).

### Paso 4: Publicar visitas y asignar
1. Las visitas nacen de la HR (importada o en línea).
2. Asignar en Postulaciones (aprobando solicitudes) o manualmente en Visitas → Asignar.
3. Si el cliente envía escenarios mensualmente: Hojas de Ruta → Cargar escenarios del periodo (mensuales); los shoppers reservan sucursales y el equipo cruza.

### Paso 5: Operar (flujo diario)
- Shoppers: reservar → recibir asignación → agendar → realizar → cuestionario → enviar.
- Equipo: revisar postulaciones → aprobar/reasignar → monitorear en Dashboard → liquidar al cierre del mes.

### Paso 6: Liquidar y cerrar el mes
1. Finanzas → Liquidaciones → mover visitas validadas al Lote en construcción.
2. Las no incluidas se diferencian a CxP del mes siguiente.
3. Pagar el lote → genera egresos automáticos → Beneficios del shopper se actualiza.

---

## 3. Configuración técnica del backend (para llevar a producción)

Ver `app/docs/HANDOFF-DESARROLLO.md` para el detalle completo.

**Resumen:**
1. Crear proyecto en **Firebase** (o Supabase).
2. Activar: Firestore (datos), Auth (usuarios), Storage (archivos).
3. Pasar `firebaseConfig` al desarrollador → conecta `CX.db` (capa de persistencia).
4. **API key de Gemini** (Google AI Studio) → pegarla en Configuración → Automatizaciones → IA.
5. **Webhooks de Make** → pegarlos en Automatizaciones, uno por evento (WhatsApp, correo, HR writeback, etc.).
6. **Hosting**: Firebase Hosting, Vercel o Netlify (app estática).

---

## 4. Adaptación a un nuevo cliente (checklist)

- [ ] Crear cliente en el sistema (nombre, rubro, país, contactos).
- [ ] Crear proyecto del cliente (países, monedas, escenarios, periodicidad).
- [ ] Cargar instructivo/protocolo → IA extrae set-up.
- [ ] Revisar y ajustar cuestionario (pesos, secciones, evidencias).
- [ ] Subir instructivo y materiales en Aprendizaje.
- [ ] Crear certificación (banco de preguntas, gate %).
- [ ] Importar HR inicial (o conectar Google Sheets).
- [ ] Configurar automatizaciones del tenant (webhooks Make, API Gemini).
- [ ] Crear usuarios del cliente (plan elegido → módulos activos correctos).
- [ ] Publicar visitas y asignar el primer batch de shoppers.
- [ ] Compartir acceso al portal del cliente.

---

## 5. Cómo dar soporte

### Bugs o errores en la plataforma
1. El usuario reporta desde Soporte → Bandeja.
2. El equipo revisa el ticket en `soporte` (módulo Capacitación & IA).
3. Para bugs de código: abrir la conversación de Claude con el proyecto maestro y describir el error exacto.
4. El fix se aplica en el maestro y se propaga a todos los clientes.

### Migración de datos de un cliente existente (ej. TyA)
1. Exportar datos desde la plataforma anterior (shoppers, visitas históricas, cuestionarios realizados).
2. Usar el **Importador Inteligente** (Admin del Proyecto → Importador) por secciones: HR, Shoppers, Movimientos históricos, CxC/CxP.
3. El sistema detecta columnas automáticamente, muestra vista previa y aplica anti-duplicado.
4. Verificar en Dashboard que los datos quedaron correctos.

### Actualizar la plataforma
1. Claude maestro aplica los cambios en el proyecto `app/`.
2. Se descarga el ZIP y se sube vía Codex o al hosting.
3. Los datos de los clientes NO se pierden (viven en Firebase, no en el código).

---

## 6. Planes y qué incluye cada uno

| Plan | Módulos | Uso |
|---|---|---|
| **Estándar** | Operación + Finanzas básicas + Capacitación | Una consultora, un proyecto |
| **Pro** | Todo estándar + CRM + Marketing + Portal cliente + Integraciones Pro | Consultora en crecimiento, múltiples proyectos |
| **Enterprise** | Todo pro + White-label + Multi-tenant + Integraciones avanzadas + Analítica | Consultora regional o con clientes corporativos |

Cambiar el plan de un cliente: Configuración → Plan → seleccionar y aplicar. Los módulos del menú se actualizan automáticamente.

---

## 7. Videos de capacitación (HeyGen)

Los guiones están en `app/docs/GUION-HEYGEN-POR-MODULO.md`.
El prompt para configurar el avatar en HeyGen está en `app/docs/PROMPT-HEYGEN.md`.

**Distribución de los videos:**
- Videos 01-09: en el módulo **Capacitación & IA → Aprendizaje** (bloque "Capacitación de la plataforma").
- Video 10 (backend): solo uso interno, no se carga en la plataforma del cliente.
- Para clientes: crear un bloque de Aprendizaje específico con los videos relevantes a su plan.

---

## 8. Demo comercial (para mostrar a prospectos)

- **Recorrido en vivo**: `CXOrbia - Prototipo (compartir).html` — archivo único, doble clic, 3 roles. Guion en `app/docs/GUION-DEMO-Y-VENTAJAS.md`.
- **Preliminar**: carpeta `cxorbia/` — narrativa comercial tipo landing, para enviar antes de la reunión.
- **Tiempo de demo**: 10-15 min. Recorrer Admin → Shopper → Cliente Portal.
- **Tip**: personaliza el nombre del proyecto activo al nombre del prospecto para mayor impacto.
