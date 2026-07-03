# Backlog vivo para Claude — Orbit 360

**Fecha:** 2026-07-03  
**Destino:** Claude / frontend / prototipo  
**Regla:** todo cambio local o decisión tomada por ChatGPT/Codex que afecte UX, módulos o prototipo debe quedar aquí para que Claude lo incorpore después.

## P0 — Corregir antes de siguiente entrega Claude

### P0-01 — Consolidar `CHANGELOG.md` con bitácoras reales

- **Problema:** `CHANGELOG.md` abre en v1.55, mientras `docs/BITACORA-CAMBIOS.md` llega a v1.85.
- **Esperado:** un changelog acumulado y coherente con la versión real del ZIP.
- **Impacto:** evita que ChatGPT/Codex o Claude concluyan falsamente que el prototipo está incompleto.
- **Estado:** ABIERTO.

### P0-02 — Corregir contradicción recaudo vs `finmovs`

- **Problema:** `docs/AUDITORIA-SINCRONIAS.md` conserva una afirmación antigua de que aplicar pago crea `finmov`.
- **Esperado:** pago aplicado = recaudo comercial, no movimiento financiero real.
- **Impacto:** evita duplicidad de ingresos y confusión en Finanzas.
- **Estado:** ABIERTO.

### P0-03 — Finanzas debe usar motor único de comisiones

- **Problema:** Finanzas no puede calcular liquidaciones con campos/lógica distintos a `core/comisiones-eng.js`.
- **Esperado:** Comisiones, Equipo, Cliente360 y Finanzas usan una sola lógica de comisión.
- **Impacto:** evita pagos de asesores inconsistentes.
- **Estado:** ABIERTO.

### P0-04 — Eliminar `localStorage` directo en módulos

- **Problema:** módulos como Configuración/Plantillas tienen usos puntuales de almacenamiento directo.
- **Esperado:** módulos usan `Orbit.store`, `Orbit.tenant` o helper core; nunca almacenamiento directo.
- **Impacto:** protege la migración backend.
- **Estado:** ABIERTO.

### P0-05 — Desacoplar IA de `window.claude`

- **Problema:** cualquier extracción IA no debe depender de un proveedor específico.
- **Esperado:** usar `Orbit.ia` o endpoint backend configurable por tenant.
- **Impacto:** producto comercializable multi-proveedor.
- **Estado:** ABIERTO.

### P0-06 — Completar PWA inteligente

- **Problema:** existe base PWA, pero falta experiencia inteligente por estado/dispositivo/tenant.
- **Esperado:** instalar app con estado, cooldown, tracking, iOS guidance cuando aplique, configuración desde tenant/plan.
- **Impacto:** mejora SaaS comercializable.
- **Estado:** ABIERTO.

## P1 — Mejoras funcionales prototipo

### P1-01 — Importador A&S completo

Debe incluir:

- aseguradora;
- tipo de documento;
- período del documento;
- período de recaudo;
- moneda y tasa;
- IVA;
- relación cliente/póliza/recibo/asesor;
- preview;
- aprobar fila;
- aprobar todo;
- excluir;
- remapear;
- iterar/corregir.

### P1-02 — Modal de Cobros

- Revisar copy: no usar “Fecha de envío a gestión” cuando se está aplicando pago.
- Debe decir fecha de pago/aplicación o fecha real de recaudo.

### P1-03 — Banco/conciliación en Finanzas

- Eliminar KPIs placeholder.
- Mostrar datos reales derivados de backend/store.
- Diferenciar movimientos reales de caja/banco vs recaudo comercial.

### P1-04 — Documentos obsoletos

- Actualizar docs que mencionan v0.86, v1.21, v1.34, v1.41, v1.55 si ya no son fuente de verdad.
- Crear índice documental vivo.

## P2 — UX/comercializable

- Garantizar que notas técnicas no aparezcan en UI cliente.
- Confirmar contraste en fondos oscuros.
- Mantener Orbit 360 en chrome y logo cliente en slot.
- PWA configurable por cliente.
- Integraciones visibles pero honestas: demo UI vs backend real.

## Cambios locales que Claude debe absorber

1. Reglas de metodología de empalme ágil.
2. Documento de avance real y tiempos estimados.
3. Errata sobre recaudo vs `finmovs`.
4. Separación de carriles Claude / ChatGPT-Codex / A&S / Core.
5. Compuerta de empalme para no reiniciar backend.

## Estado

**Estado general:** ABIERTO.  
**Próximo paquete Claude:** incluir este backlog completo junto con auditoría revisada, bitácoras y plan actualizado.
