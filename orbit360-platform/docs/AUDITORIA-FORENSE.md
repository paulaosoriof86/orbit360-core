# 🔬 AUDITORÍA FORENSE v2 — Orbit 360 (en vivo)

> Fecha: build v1.34+ · Método: montaje en vivo de cada módulo en el navegador, captura de errores JS (`window.onerror`) y verificación de render real (no conclusiones). Datos del store reales (seed __v=32).

## Resultado global

**30/30 módulos renderizan sin un solo error JS.** Todos leen datos vivos de `Orbit.store` (no hay render con datos incrustados en el módulo).

| Módulo | Render | Errores JS | Notas |
|---|---|---|---|
| inicio | ✅ 14.3k | 0 | KPIs clicables, cronograma, novedades |
| cronograma | ✅ 5.8k | 0 | agenda día/semana/mes |
| ops | ✅ 12.2k | 0 | board compuesto, listas editables |
| leads | ✅ 15.7k | 0 | pipeline asesor, espejo de Ops |
| aseguradoras | ✅ 9.7k | 0 | directorio GT/CO, fichas |
| cotizador | ✅ 6.9k | 0 | marca→línea→modelo, cliente/asesor |
| comparativo | ✅ 3.4k | 0 | multi-aseguradora, extracción PDF |
| cliente360 | ✅ 25.5k | 0 | ficha completa, tabs, siniestros |
| polizas | ✅ 67k | 0 | desglose prima + recibos |
| cobros | ✅ 151k | 0 | cartera, aplicar pago, filtro placa |
| renovaciones | ✅ 18.2k | 0 | propuestas, analítica |
| cancelaciones | ✅ 12k | 0 | detalle + recuperación → Ops/ficha |
| siniestros | ✅ 8k | 0 | bitácora de reclamos |
| historial | ✅ 182.9k | 0 | interacciones por cliente |
| comisiones | ✅ 5.6k | 0 | cálculo aseguradora/vendedor |
| finanzas | ✅ 22.2k | 0 | CxC/CxP autoadmin, liquidaciones, dashboard |
| marketing | ✅ 15.5k | 0 | calendario + IA estratégica |
| academia | ✅ 11.7k | 0 | visor pantalla completa, 10 cursos profundos |
| insights | ✅ 8.7k | 0 | comparativos, análisis crítico IA |
| portal | ✅ 3.5k | 0 | self-service, clicable |
| ia (asistente) | ✅ 2.6k | 0 | chat contextual |
| notificaciones | ✅ 3.8k | 0 | WA/correo |
| automatizaciones | ✅ 21.6k | 0 | reglas + IA multi-proveedor sin sesgo |
| equipo | ✅ 4.7k | 0 | multi-rol, módulos por usuario |
| configuracion | ✅ 98.9k | 0 | marca, países, catálogos, 42 integraciones |
| reportes | ✅ 18k | 0 | — |
| calidad | ✅ 13.1k | 0 | edición inline |
| plantillas | ✅ 5.8k | 0 | — |
| importar | ✅ 5.9k | 0 | hub de importadores inteligentes |
| correo | ✅ 4.5k | 0 | bandeja + vínculos múltiples |

## Datos vivos vs hardcoded

- **Render:** ningún módulo incrusta datos de demo en el render; todo proviene de `Orbit.store.*`.
- **Importadores (`core/importa.js`):** verificados end-to-end con archivos reales en sesiones previas — crean/actualizan colecciones reales (clientes, pólizas→recibos, estados de cuenta→conciliación, planillas, bitácora de siniestros, directorio de aseguradoras, movimientos, base inicial). Sin muestras fijas.
- **Extracción de PDF (`core/ia.js`):** lee texto real con pdf.js; mapeo robusto GT/CO; marca campos faltantes. Validado con los PDF reales de A&S.
- **Capa de datos:** los módulos solo hablan con `Orbit.store` — backend conectable sin tocar módulos.

## Autoadministrable (resumen, detalle en AUDITORIA-AUTOADMINISTRABLE.md)

Marca, paleta, países/monedas, catálogos (`Orbit.cat` con "Otro" en todos los desplegables), aseguradoras, roles y módulos por usuario, integraciones (con credenciales), automatizaciones, cursos/lecciones/quizzes, manuales, plantillas y planes — todo editable desde la plataforma.

## Cláusulas legales (v2.0)

`core/legal.js` reescrito: 6 tipos (confidencialidad, tratamiento de datos, socios/NDA con no-competencia 2 años + cláusula penal + prohibición de ingeniería inversa, contrato de licencia, portal mutua, descargo IA), por país, persistentes, imprimibles con bloque de firmas, aceptación registrada (usuario/fecha/IP). Verificado en vivo.

## Conclusión

El prototipo está **estable y consistente** para iniciar migración: sin errores de render, datos vivos, importadores funcionales y configuración integral. Pendiente real de producción: conectar backend por fases (ver `MIGRACION-MAESTRO.md` §7) e IA real por proveedor.
