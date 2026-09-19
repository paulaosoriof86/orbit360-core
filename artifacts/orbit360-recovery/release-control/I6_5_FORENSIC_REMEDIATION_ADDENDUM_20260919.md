# ADDENDUM PREVALENTE — REMEDIACIÓN FORENSE, VISUALIZACIÓN POR BLOQUES Y ANTIRREGRESIÓN

**Fecha:** 2026-09-19  
**Producto:** Gravicentra Insurance  
**Repo:** `paulaosoriof86/orbit360-core`  
**Rama:** `recovery/fase-a-clean-20260831`  
**Estado:** FROZEN / PREVALENTE PARA EL CIERRE I6.5–I6.6  

Este addendum complementa y prevalece, cuando exista contradicción operativa, sobre cualquier interpretación anterior de I6.5 que pueda inducir a separar incorrectamente póliza, renovación, recibo, cartera y cobro, o a postergar regresiones transversales ya identificadas.

## 1. Regla de candidata

La candidata continúa siendo **única, acumulativa e incremental**. No se reconstruye el producto desde una versión anterior, no se sustituye por un paquete paralelo y no se abre otra metodología. Las correcciones se hacen directamente sobre la candidata acumulada vigente cuando la regla de negocio ya está aprobada.

Cada bloque produce **un Preview visualizable inmediatamente**. Paula revisa ese mismo artefacto antes de continuar. Los hallazgos del bloque se corrigen dentro del mismo bloque. No se acumulan durante varios gates para descubrirlos al final.

## 2. Semántica canónica aclarada

### Póliza nueva o importada
Crear o importar una póliza debe:
1. crear/actualizar la póliza;
2. generar los **recibos esperados** que correspondan a su frecuencia/forma de pago;
3. generar/actualizar la **cartera de primas** asociada.

Eso **no equivale todavía a un pago confirmado**. Por lo tanto, no se crea un cobro confirmado únicamente porque existe el recibo.

### Renovación
Renovar una póliza debe generar la nueva vigencia/renovación y sus nuevos recibos esperados + cartera, según la forma de pago aprobada. Después, cuando exista pago aplicado o evidencia real de pago, se materializa/reconcilia el cobro correspondiente.

Por tanto, la regla correcta no es “renovación no genera recibos”; es:

> **renovación sí genera sus nuevos recibos y cartera; no genera un cobro confirmado sin pago/evidencia.**

### Importación y conciliación
El importador de pólizas debe generar los recibos y cartera asociados a la póliza importada.

La conciliación de pagos puede recibir evidencia real desde:
- factura de póliza/aseguradora;
- estado de cuenta bancario;
- planilla/estado de comisiones;
- soporte de pago;
- confirmación manual explícita.

La **inferencia está permitida para vincular evidencia real** con cliente, póliza, recibo y pago. La inferencia no puede inventar la existencia de un pago por el solo hecho de que exista una obligación o haya vencido.

Queda una única decisión funcional pendiente para B3: cuando una evidencia real tenga un match único y de alta confianza, definir si la plataforma debe **confirmar automáticamente** la conciliación/pago o dejar una **propuesta para validación humana con un clic**.

## 3. Aplicación de pagos

Debe existir una sola acción canónica de pago, disponible al menos desde:

- **Cliente 360 → Recibos y pagos**;
- **Cobros y cartera → listado/detalle**.

La acción debe permitir:
- fecha de pago;
- método/forma;
- factura o soporte opcional;
- conciliación posterior si no se adjunta soporte en ese momento.

Ambas superficies deben invocar el mismo comando server-owned. Un retry o doble clic no puede duplicar el pago.

## 4. Roles, Leads, Ops y gestiones

- Comercial y Asesor ven/gestionan sus propias oportunidades, leads y gestiones dentro de su alcance.
- Operativo, Admin y Dirección trabajan Ops según su alcance configurado.
- Una gestión puede solicitarse desde Cliente 360, Portal del Cliente, Leads u Ops.
- Todas esas entradas deben converger en **un único registro canónico de gestión**, proyectado donde corresponda.
- Ops y Leads son proyecciones del mismo ciclo, no bases paralelas.
- No se permiten IDs de personas hardcodeados como defaults funcionales.

## 5. Autoadministración y jerarquía visual

El cierre actual incluye, no posterga:

- creación y edición desde listados y fichas 360;
- usuarios/roles/países/scopes/permisos;
- clientes;
- pólizas;
- vehículos;
- aseguradoras;
- recibos y medios de pago donde corresponda;
- branding del tenant;
- acciones de cobro/conciliación aprobadas.

La jerarquía visual debe homologarse con el patrón aprobado:
1. identidad/header;
2. KPIs;
3. acciones primarias;
4. tabs/secciones;
5. edición explícita;
6. Guardar/Cancelar;
7. estado de persistencia y resultado.

Aseguradoras se toma como referencia de jerarquía estable, sin convertir esto en un rediseño.

Los formularios con cambios no guardados no pueden cerrarse silenciosamente por backdrop.

## 6. Readiness de salida

Este porcentaje es una métrica nueva de **readiness forense de salida**, no modifica el porcentaje histórico de gates ya sellados.

| Estado | Readiness |
|---|---:|
| Auditoría forense congelada | **70%** |
| B1 — Branding, usuarios, Auth y seguridad de interacción | **80%** |
| B2 — Autoadministración core + jerarquía visual | **90%** |
| B3 — Pagos, conciliación, Cobros, importación y rendimiento | **96%** |
| B4 — Transversal Ops/Leads/Portal/notificaciones + E2E + release | **100%** |

Cada bloque debe reportar el porcentaje anterior, el incremento de esa iteración y el porcentaje resultante.

## 7. Bloques obligatorios

### B1 — 70% → 80%
Corregir branding/tenant authority, favicon/logo, Equipo/usuarios, activación/verificación, cambio de contraseña modular, loop de scope y protección común de formularios.

**Visualización obligatoria:** login + header + Equipo/Permisos + creación/edición de usuario y login real del usuario activado.

### B2 — 80% → 90%
Corregir Cliente 360, create/edit desde lista y ficha; póliza canónica create/edit con vendedor/asesor; renovación; vehículo completo editable; Aseguradoras; recibos/proyección; jerarquía visual.

**Visualización obligatoria:** Cliente 360 + Pólizas + Vehículos + Aseguradoras + Recibos.

### B3 — 90% → 96%
Restaurar la shell aprobada de Cobros y cartera; optimizar búsqueda; KPIs por moneda; aplicación de pagos desde Cliente 360 y Cobros; conciliación explícita/inferida con evidencia real; importación de póliza + recibos/cartera; Cronograma usando obligaciones correctas.

**Visualización obligatoria:** Cobros y cartera completa, búsqueda real, aplicar pago, conciliar factura/estado/planilla y prueba de importación controlada.

### B4 — 96% → 100%
Cerrar sincronización transversal Ops/Leads, Portal, notificaciones/automatización y regresiones productivas de Renovaciones, Cancelaciones, Siniestros y Cronograma; ejecutar matriz E2E autenticada; Preview exacto; aceptación visual; mismo artefacto a LIVE; readback exacto o rollback.

**Visualización obligatoria:** recorrido transversal por roles y módulos productivos antes del deploy final.

## 8. Reglas antirregresión

1. No existe “PASS” porque el botón esté visible.
2. Un CRUD productivo exige: UI autenticada → commit del servidor → readback canónico → refresh → auditoría.
3. Ningún éxito crítico puede ser optimista/silencioso.
4. Antes de modificar un módulo se identifica su **runtime owner efectivo**; después se prueba que ningún owner anterior lo sobrescribe.
5. No se reimportan datos para arreglar UI, routing, permisos, jerarquía, cache o código.
6. No se vuelve a ejecutar el apply masivo I6.4/I6.5 salvo causalidad y autorización nueva.
7. No se crean repos, ramas, Firebase, importadores ni persistencias paralelas.
8. No se hardcodean Paula, Samuel, Carlos, Fernando ni ninguna identidad operativa.
9. No se hardcodean valores de tenant que deban vivir en configuración autoadministrable.
10. Hallazgo nuevo dentro de un bloque se resuelve en el mismo bloque, salvo regla de negocio genuinamente nueva.
11. Si una regla de negocio no está clara, se pregunta a Paula y se bloquea **solo esa regla**; el trabajo no afectado continúa.
12. Cada bloque se visualiza antes de iniciar el siguiente.
13. El artefacto final promovido a LIVE debe ser exactamente el mismo aprobado en Preview.
14. Todas estas reglas son autoridad versionada del repo y no dependen de la conversación.

## 9. No-code / SaaS

La salida inmediata debe dejar cerradas las capacidades de autoadministración ya aprobadas. La evolución a un SaaS/no-code más genérico continúa después de producción de forma incremental, reutilizando las mismas autoridades de configuración, permisos y persistencia. No se permite crear ahora una segunda arquitectura “no-code” paralela para cumplir ese objetivo.

## 10. Criterio de velocidad

La prioridad es tiempo de salida. Cuando una regresión está identificada y la regla aprobada es clara, se corrige directamente sobre la candidata actual. Buscar el commit histórico exacto solo es obligatorio cuando sea necesario para preservar una decisión funcional o evitar perder una implementación aprobada.

No se permite usar la investigación histórica como sustituto de una corrección directa clara.
