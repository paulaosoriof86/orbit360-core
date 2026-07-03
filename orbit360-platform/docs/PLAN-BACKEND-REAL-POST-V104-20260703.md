# Plan backend real post v1.104 — Orbit 360 A&S

**Fecha:** 2026-07-03  
**Rama:** `ays/backend-tenant-lab-v99-20260703`  
**Estado:** plan operativo después de empalme aditivo y smoke.

## 1. Precondición obligatoria

No iniciar backend real/productivo hasta cumplir:

1. empalme aditivo del candidato Claude final en la rama obligatoria;
2. conservación de backend LAB v1.104;
3. validación estática;
4. smoke local real;
5. documentación de pendientes para Claude y backend.

## 2. Fase A — Empalme aditivo frontend

Objetivo: traer mejoras del prototipo final sin pisar backend LAB.

Proteger:

- `orbit360-platform/data/store.js`
- `orbit360-platform/data/store-firestore-lab.local.js`
- `orbit360-platform/core/backend-lab-loader.js`
- `orbit360-platform/core/backend-lab-init.js`
- `orbit360-platform/core/backend-lab-security-guard.js`
- `firestore.rules`
- `tools/orbit360-*.ps1`
- `tools/orbit360-validar-backend-lab-contrato.mjs`
- docs de rama activa, bitácoras y reportes backend.

Aceptar desde Claude solo de forma controlada:

- `modules/`
- `core/` no backend, revisado archivo por archivo;
- `styles/`
- docs funcionales/UX;
- mejoras de `index.html` solo con diff y sin mojibake.

## 3. Fase B — Smoke LAB real

Ejecutar:

```txt
node tools/orbit360-validar-backend-lab-contrato.mjs
```

Luego:

```txt
tools/orbit360-run-flujo-ays-lab-v99.ps1
```

Validar:

- rama correcta;
- loader/init/guard;
- Firebase LAB;
- tenant `alianzas-soluciones`;
- API `Orbit.store`;
- snapshots;
- CRUD ficticio controlado;
- bloqueo de secretos;
- bloqueo de auth incorrecta;
- reporte en `_orbit360_reports`.

## 4. Fase C — Firestore LAB como fuente viva

Objetivo: usar Firestore LAB para datos ficticios controlados, sin datos reales en código.

Actividades:

1. Confirmar reglas Firestore por ruta `tenantId/{tenantId}/{document=**}`.
2. Sembrar dataset ficticio mínimo desde script, no desde UI manual.
3. Confirmar `onSnapshot` por colecciones base.
4. Confirmar que `Orbit.store.all/get/where/insert/update/remove/_emit` no rompe módulos.
5. Confirmar que `localStorage` no sea fuente cuando está activo `orbitBackend=firestore-lab`.

## 5. Fase D — Auth LAB

Objetivo: validar usuario LAB y roles sin convertirlo aún en Auth final.

Actividades:

1. Login LAB con `orbit.lab@demo.com`.
2. Confirmar UID esperado.
3. Bloqueo de writes con usuario incorrecto.
4. Documentar mapa roles/módulos desde Equipo.
5. Preparar contrato para crear usuarios Auth desde Equipo vía backend/Make.

## 6. Fase E — Integraciones seguras

Objetivo: reemplazar cualquier captura/persistencia frontend de credenciales por backend seguro.

Actividades:

1. Mantener UI como configuración comercial, no depósito de secretos.
2. Guardar solo referencias/estado en Firestore.
3. Enviar secretos a backend/secret manager por tenant.
4. Exponer pruebas de conexión sin revelar valores.
5. Mantener eventos Orbit → Make con payload `{evento, datos, plantilla}`.

## 7. Fase F — Importadores backend

Objetivo: que documentos pesados, OCR e IA real se ejecuten fuera del navegador.

Orden de datos:

1. clientes/base inicial;
2. aseguradoras;
3. pólizas;
4. vehículos;
5. estados de cuenta;
6. planillas de comisiones;
7. histórico financiero + banco;
8. bitácora de siniestros multi-cliente.

Reglas:

- no hardcodear datos reales;
- cada importación deja trazabilidad;
- deduplicación antes de escritura;
- pólizas vigentes/por renovar generan recibos;
- canceladas/vencidas quedan histórico, no cartera.

## 8. Fase G — Producción controlada

Solo después de validar LAB:

1. separar ambientes dev/lab/prod;
2. reglas definitivas;
3. storage/drive por tenant;
4. funciones backend para secretos/IA/Make;
5. migración real por lote;
6. piloto con datos acotados;
7. checklist de rollback.

## 9. Documentación obligatoria continua

Cada avance debe registrar:

- fecha;
- módulo/área;
- síntoma/necesidad;
- esperado;
- causa raíz si aplica;
- archivo/función;
- fix o mejora aplicada;
- impacto en prototipo comercializable;
- estado.

Archivos vivos:

- `docs/BITACORA-CAMBIOS-AYS-BACKEND-20260703.md`
- `docs/BITACORA-ERRORES.md`
- `docs/PENDIENTES-Y-MEJORAS.md`
- `docs/MATRIZ-PENDIENTES-CLAUDE-CANDIDATO-20260703.md`
- `docs/REPORTE-CONTINUIDAD-BACKEND-V104-20260703.md`

## 10. Estado

Backend real queda listo para continuar por fases solo después del empalme aditivo y smoke local real. La rama ya tiene hardening v1.104, pero no se debe saltar la validación visual/operativa.
