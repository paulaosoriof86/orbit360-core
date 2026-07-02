# PENDIENTES CLAUDE POST V99 / V1.73 - Orbit 360

Fecha actualización: 2026-07-01 19:32 local
Estado: documento vivo tras recuperación V99, empalme visual Claude v1.73 y Backend LAB protegido validado.

## Regla de separación

- Claude: prototipo, UX, módulos, configuración, pantallas, autoadministración, corrección visual, flujos clickeables, textos, encoding y experiencia comercial.
- ChatGPT/Codex: backend, Firestore, Auth, Orbit.store, scripts LAB, validación técnica, PR, smoke contractual y documentación técnica.

## Metodología ágil adoptada desde v1.73

1. No más bloques largos pegados directo en PowerShell salvo emergencia.
2. ChatGPT/Codex hará directo en GitHub todo lo que sea documentación, auditoría, PR, preparación de scripts y seguimiento.
3. Si algo requiere equipo local, Firebase CLI o navegador local, se entregará un `.ps1` descargable o un comando corto de una línea.
4. Cada gate debe tener estado claro: PREPARADO / EJECUTADO / FALLIDO / COMPLETADO.
5. No repetir gates ya completados.
6. Si Claude entrega ZIP nuevo, se trata como mini-release: auditar, aplicar solo si es seguro, preservar backend, documentar y smoke.
7. Los scripts deben detenerse al primer error y no documentar éxito si fallan.

## Gates completados v1.73

- Instalación base visual v1.73: COMPLETADO.
- Saneamiento funcional v1.73B: COMPLETADO.
- Fix API LAB v1.73: COMPLETADO.
- Smoke runtime Fase 7D: COMPLETADO.
- Contrato `Orbit.store` expandido: COMPLETADO.
- Backend LAB detectado `firestore-lab`: COMPLETADO.
- Tenant `alianzas-soluciones`: COMPLETADO.
- Sin errores JS globales en smoke: COMPLETADO.

## Resultado técnico validado para no repetir

Fase 7D validó:

- `window.Orbit`: true.
- `Orbit.store`: true.
- API expandida completa: true.
- `pref/setPref` roundtrip: true.
- `backendMode`: `firestore-lab`.
- `backendTenant`: `alianzas-soluciones`.
- Sin errores JS globales.
- Resultado: `OK_CON_ADVERTENCIAS_SI_LAS_HAY`.

## Pendientes P0 para Claude / prototipo visual

1. Corregir mojibake/encoding visible en UI: textos como `IngresÃ¡`, `sesiÃ³n`, `paÃ­ses`, símbolos y emojis dañados. Esto es visual/base, no backend.
2. Ocultar badges técnicos/estado como `BETA`, `NUCLEO`, `PROX` en modo cliente/comercial. Pueden existir solo en modo interno/demo.
3. Revisar textos de login, chrome visual, menú lateral y topbar tras empalme v1.73.
4. Mantener la marca Orbit 360 en chrome y logo cliente solo en slot white-label.
5. No mostrar notas técnicas en UI cliente.

## Pendientes P1 para Claude / módulos y UX

1. Configuración debe ser 100% autoadministrable: marca, países, monedas, impuestos, aseguradoras, catálogos, usuarios, roles, permisos, integraciones, APIs, planes, tarifas, comisiones, metas, presupuesto, plantillas, automatizaciones, correo y white-label.
2. Inicio no debe quedar amarrado a junio 2026. Metas del mes debe leer fecha viva y datos vivos.
3. Avance por asesor debe abrir analítica/metas filtrada por asesor.
4. Tablón y prioridades deben ser clickeables y con detalle.
5. Plantillas debe permitir crear, editar, eliminar, duplicar, usar sin alert nativo, seleccionar cliente/canal e historial.
6. Reportes debe permitir crear, editar, borrar, duplicar, programar, exportar y abrir detalle.
7. Finanzas requiere selector por país/moneda sin mezclar monedas, histórico, CxC, CxP, conciliación, movimientos, comisiones, presupuestos, metas y liquidaciones.
8. Finanzas debe migrar a lectura desde `finmovs`; no debe depender de arreglos locales duros.
9. Aseguradoras requiere fichas editables con contactos, accesos, Drive, cuentas, productos, clausulados, plantillas, tarifarios, facturación y vínculos al cotizador/comparativo.
10. Marketing requiere calendario real editable, importación desde Excel, piezas por canal, estado, responsable, aprobación, programación e integraciones.
11. Sustituir `alert/confirm/prompt` por modales Orbit.
12. Revisar fechas vivas aún detectadas previamente en `core/ciclo.js`, `modules/portal.js`, `modules/siniestros.js`, `modules/cliente360.js`.

## Pendientes técnicos para ChatGPT/Codex

1. Fase 8: Firestore LAB real por colecciones v1.73, sin tocar módulos.
2. Mantener API exacta de `Orbit.store`: `all`, `get`, `where`, `find`, `insert`, `update`, `remove`, `on`, `_emit`, `pref`, `setPref`, `init`, `reseed`, `raw`.
3. Cargar datos por tenant `alianzas-soluciones` y colecciones v1.73.
4. Evitar fallback silencioso a seed/demo como fuente de verdad cuando `orbitBackend=firestore-lab`.
5. Mantener `index-dev-firestore` solo como legacy NO-USAR.
6. Documentar cada cambio en bitácoras antes de cerrar gate.

## Regla de documentación permanente

Toda mejora o bug debe documentarse con fecha, módulo, síntoma/necesidad, esperado, causa raíz si aplica, archivo/función, fix/mejora, impacto comercializable y estado.

## Estado

ABIERTO - aplicar a prototipo base Orbit 360 y mantener sincronizado con Backend LAB.