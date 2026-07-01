# CXOrbia — Plataforma Operativa de Campo

> Versión **comercial / white-label** de CXOrbia: mystery shopping, experiencia al cliente y auditoría de campo en una sola plataforma.
> Esta base es el punto de partida arquitectónico para comercializar el producto, separada de la operación real de T&A Consultores (sin datos reales, marca neutral, multi-proyecto).

![estado](https://img.shields.io/badge/estado-MVP%20comercial-2196d3) ![datos](https://img.shields.io/badge/datos-ficticios-d97706) ![stack](https://img.shields.io/badge/stack-HTML%20%2F%20JS%20%2B%20Firebase%20opcional-16a05c)

---

## ¿Qué es esto?

Una **aplicación web modular** que reproduce el flujo operativo completo del negocio —configurar proyecto → publicar visitas → captar/asignar shoppers → instruir → certificar → agendar → ejecutar → liquidar → reportar— con **dos perfiles**:

- 🖥️ **Consola Admin / Coordinación** — operación, proyectos, finanzas y configuración.
- 📱 **Portal Shopper / Evaluador** — visitas, certificación, ejecución y pagos.

Es **multi-proyecto e IA-adaptable**: al cambiar de proyecto, todo el dashboard, los KPIs, las reglas y los cuestionarios se reconfiguran para ese cliente sin tocar código.

> ⚠️ **Demo comercial con datos ficticios.** No contiene datos ni marca reales de T&A. Pensada para presentar, pilotear y entregar a desarrollo.

---

## Cómo correrlo

No requiere build ni instalación. Es HTML/CSS/JS plano.

```bash
# opción 1 — abrir directo
abre app/index.html en el navegador

# opción 2 — servidor local (recomendado, evita restricciones de file://)
cd app
npx serve .            # Node: sirve en http://localhost:3000
# o:  npx http-server . -p 8080
# luego abre la URL que muestre la consola
```

Corre **100% con datos locales** (mock). Para conectar un backend real, completa las llaves en `core/config.js → CX.FIREBASE` (ver [SECURITY.md](docs/SECURITY.md)).

---

## Estructura

```
.
├── index.html              # Shell: login, rol, rail, topbar, router mount
├── app.js                  # Boot + login / selección de rol
├── styles/
│   ├── theme.css           # Tokens de diseño + componentes (white-label)
│   └── layout.css          # Layout del shell (login, rail, topbar)
├── core/
│   ├── config.js           # ★ Marca, módulos, navegación, roles, Firebase
│   ├── data.js             # Capa de datos mock (multi-proyecto, IA-adaptable)
│   ├── store.js            # Sesión + event bus + persistencia
│   ├── ui.js               # Helpers de UI (KPIs, tablas, toast, modal, IA)
│   └── router.js           # Navegación, menú por rol, montaje de módulos
├── modules/                # Un archivo por módulo (22 módulos)
│   ├── dashboard.js  proyectos.js  visitas.js  postulaciones.js …
└── docs/                   # Documentación de producto y arquitectura
    ├── ARCHITECTURE.md  DATA-MODEL.md  SECURITY.md  ROADMAP.md  MODULES.md
    ├── PLAN-DE-TRABAJO.md   # ★ backlog vivo (se actualiza cada sesión)
    └── LOGICA-NEGOCIO.md    # ★ reglas de negocio parametrizables por proyecto
```

---

## White-label en 1 minuto

Todo lo específico de marca vive en `core/config.js → CX.BRAND`:

```js
CX.BRAND = {
  name: 'CXOrbia',
  tagline: 'Field Operations Platform',
  colors: { brand:'#2196d3', brandDark:'#1565a8', navy:'#0d2740', … },
};
```

Cambia nombre y colores y **toda la plataforma se reskina** (los componentes usan variables CSS). Útil para vender instancias con la marca del cliente.

---

## Los 22 módulos

Operación, Portal Shopper, Finanzas y Configuración. Detalle de cada uno (problema, función, capa IA, valor) en **[docs/MODULES.md](docs/MODULES.md)**.

| Operación (Admin) | Portal Shopper | Finanzas (Admin) | Configuración |
|---|---|---|---|
| Mi Día · Dashboard · Proyectos · Visitas · Postulaciones · Shoppers · Hojas de Ruta · Documentos · Aprendizaje · Certificación · Tablón · Soporte IA · Reportes | Mi Día · Mi Perfil · Visitas · Mis Visitas · Documentos · Aprendizaje · Certificación · Novedades · Soporte IA · Mis Beneficios | Dashboard Financiero · Movimientos · Liquidaciones · Lotes | Cuestionarios · Usuarios & Permisos · Configuración |

---

## Estado y roadmap

Esta entrega es el **MVP comercial navegable**: arquitectura, los 22 módulos y el flujo, con datos de ejemplo. La ruta a producción (hardening, multi-tenant real, Auth, integraciones) está en **[docs/ROADMAP.md](docs/ROADMAP.md)**.

## Relación con la plataforma de T&A

Esta base es **independiente** del HTML operativo actual de T&A. Recomendación: T&A sigue operando en su instancia; cuando este core esté sólido, T&A se migra como **"proyecto / tenant #1"** sobre esta arquitectura modular. Ver [ARCHITECTURE.md](docs/ARCHITECTURE.md).

---

© 2026 — Material confidencial del equipo fundador. Versión comercial white-label.
