# Orbit 360 · Plataforma

**Sistema 360 inteligente e integral para intermediarios de seguros.** No es un CRM común: cubre el ciclo completo (clientes, pólizas, cobros, renovaciones, comisiones), con IA y automatizaciones, en módulos que se alimentan entre sí.

> Marca de **producto** Orbit 360 (white-label ready). Esta es la **versión limpia comercializable**, construida desde cero — sin arrastrar deuda técnica del piloto. Datos de demostración **ficticios**.

## Arranque
Es una SPA estática sin build. Servir la carpeta y abrir `index.html`:

```bash
cd orbit360-platform
python3 -m http.server 8080   # o cualquier servidor estático
# http://localhost:8080
```

No requiere dependencias ni bundler. (Las fuentes se cargan desde Google Fonts; offline usa fallback del sistema.)

## Arquitectura

```
orbit360-platform/
├── index.html              Shell: topbar + sidebar + host de contenido
├── styles/
│   ├── tokens.css          Design tokens (marca, color, tipo, espaciado, sombra)
│   └── base.css            Shell + componentes compartidos
├── data/
│   ├── store.js            Capa de datos — API única (hoy localStorage, mañana backend)
│   └── seed.js             Datos ficticios (universo relacional coherente)
├── core/
│   ├── ui.js               Helpers de presentación (moneda, fechas, avatar, badges)
│   ├── config.js           Navegación (Orbit.NAV) + metadatos de módulos
│   ├── queries.js          Agregaciones de negocio sobre el store
│   └── router.js           Sidebar + router por hash (#/ruta)
└── modules/
    ├── inicio.js           Orbit Inicio (Mi Día)
    └── cliente360.js       CRM · Cliente 360  ← núcleo de oro
```

### Capa de datos (clave del diseño)
`Orbit.store` es la **interfaz única**. Los módulos nunca tocan `localStorage` directo. Cuando exista backend (Firestore/REST), se reimplementa `store` con la misma API y nada más cambia.

```js
Orbit.store.all('clientes')              // colección
Orbit.store.get('clientes', 'cli001')    // por id
Orbit.store.where('cobros', c => c.estado === 'Vencido')
Orbit.store.insert('actividades', row)   // persiste + notifica
Orbit.store.update('polizas', id, patch)
Orbit.store.on(fn)                        // suscripción a cambios
```

`data/seed.js` genera de forma determinista: 20 clientes (personas + empresas, GT/CO), sus pólizas, cobros (cuotas), comisiones, actividades y cancelaciones — todo relacionado por `id`. Subir `__v` fuerza re-siembra.

### Estado de los módulos (honesto)
Cada ítem del sidebar lleva su badge real:

| Badge | Significado |
|---|---|
| **NÚCLEO** | Construido y funcional |
| **BETA** | En estabilización |
| **PRÓX.** | En roadmap (pantalla con alcance documentado) |

La plataforma cubre hoy el ciclo completo: Cliente 360, Pólizas, Cobros, Renovaciones, Cancelaciones, Comisiones, Historial, Ops/Leads, Cotizador + Comparativo (con tarifas por aseguradora validables y trazables), Aseguradoras (directorio + tarifas + documentos), Correo, Automatizaciones/Integraciones, Orbit IA, Configuración (marca, usuarios, países, integraciones, con secciones técnicas segmentadas por rol), Academia, Marketing, Reportes/Insights, Finanzas, Calidad e Importador. Ver `docs/PLAN-INFRAESTRUCTURA.md` para el detalle de rondas de auditoría y pendientes P1 documentados (no bloqueantes).

## Versión
Ver `docs/MANIFIESTO-ENTREGA-v1215.md` para el detalle exacto de la candidata vigente y `CHANGELOG.md` para el historial por versión.

## Documentación por módulo
`docs/` — un archivo por módulo conforme se construye. Ver `docs/cliente360.md`.
