# Resumen avance interno post v1.97 · Orbit 360

**Fecha:** 2026-07-03  
**Rama activa:** `ays/backend-tenant-lab-v99-20260703`  
**Base prototipo:** Claude v1.97  
**Propósito:** dejar separado qué ya avanzó ChatGPT/Codex, qué queda para backend y qué debe pasar a Claude.

---

## 1. Estado general

El hilo correcto está retomado.

La vuelta de Auth/LAB queda documentada como bloqueo operativo temporal y no debe seguir consumiendo el plan principal. El avance actual volvió al frente prioritario: Marketing operativo, Integraciones, Make/eventos y datos vivos.

---

## 2. Base y metodología fijadas

Documentos activos:

- `docs/PLAN-ACTIVO-POST-V197-20260703.md`
- `docs/METODOLOGIA-TRABAJO-INCREMENTAL-ORBIT-20260703.md`
- `docs/MEJORAS-CHATGPT-PARA-CLAUDE-POST-V197-20260703.md`

Reglas confirmadas:

- no reiniciar proyecto,
- no cambiar de base,
- GitHub primero,
- PowerShell solo como runner final,
- sin ZIPs one-click bloqueables,
- sin `git clean`,
- sin Python asumido,
- sin deploy,
- sin producción,
- sin secretos,
- documentar todo,
- notificar a Claude toda mejora que aplique al prototipo comercializable.

---

## 3. Avances ya hechos por ChatGPT/Codex

### 3.1 Plan activo post v1.97

Archivo:

- `docs/PLAN-ACTIVO-POST-V197-20260703.md`

Commit:

- `e70d70278e49fe4daddc5eb4681f390639beda46` · `docs: fijar plan activo post v197`

Estado:

- **RESUELTO / ACTIVO**

---

### 3.2 Metodología incremental Orbit

Archivo:

- `docs/METODOLOGIA-TRABAJO-INCREMENTAL-ORBIT-20260703.md`

Commit:

- `3203159d8af33fe48048d3d0eb26aa99acb5b706` · `docs: documentar metodologia incremental Orbit`

Estado:

- **RESUELTO / ACTIVO**

---

### 3.3 Especificación Marketing operativo

Archivo:

- `docs/ESPEC-MARKETING-OPERATIVO-POST-V197-20260703.md`

Commit:

- `5dd4af9dd0d41e10a8a9c174fada29f7281b719c` · `docs(marketing): especificar siguiente avance operativo`

Estado:

- **RESUELTO EN DOCUMENTACIÓN / PENDIENTE UX CLAUDE**

---

### 3.4 Especificación Integraciones Marketing + Make

Archivo:

- `docs/ESPEC-INTEGRACIONES-MARKETING-MAKE-POST-V197-20260703.md`

Commit:

- `f476708b6e4cfeb20a8ad44a517161bce01ef44d` · `docs(integraciones): especificar eventos Make marketing`

Estado:

- **RESUELTO EN DOCUMENTACIÓN / PENDIENTE BACKEND MAKE REAL**

---

### 3.5 Helper `Orbit.integraciones`

Archivo:

- `core/integraciones.js`

Commits:

- `def19ea93d3ee63f45465b7aed2334c0db8af6a2` · `feat(integraciones): agregar helper seguro de eventos`
- `23fca9827cab93c8da516037392c73a7f27341e6` · `feat(integraciones): extender seed demo marketing`
- `6d7e6703735cb7c0766a595cdc35545f8a73ba32` · `feat(integraciones): agregar diagnostico de eventos`
- `795776c7766a355c60b9400ed48d756d0296cf26` · `feat(integraciones): cargar panel diagnostico bajo demanda`

Estado:

- **RESUELTO EN CORE / PENDIENTE VALIDACIÓN LOCAL**

Funciones disponibles:

- `emit`
- `status`
- `list`
- `resumen`
- `diagnostico`
- `openPanel`
- `mark`
- `extendSeed`

---

### 3.6 Panel diagnóstico de integraciones

Archivo:

- `core/integraciones-panel.js`

Commit:

- `b964e498d7e8b4dd7054ae6d29bdaa813f8ef97d` · `feat(integraciones): agregar panel diagnostico reutilizable`

Documentación:

- `docs/AVANCE-PANEL-DIAGNOSTICO-INTEGRACIONES-20260703.md`

Estado:

- **RESUELTO EN CORE / PENDIENTE INTEGRACIÓN UX CLAUDE**

---

### 3.7 Marketing conectado a eventos seguros

Archivo:

- `modules/marketing.js`

Commit:

- `d03d5e1c0550703e6038eb2475288bcb944180fe` · `feat(marketing): emitir eventos de integracion seguros`

Eventos conectados:

- `marketing_sync_sheets`
- `marketing_generar_pieza`
- `marketing_programar_publicacion`
- `marketing_contenido_creado`

Estado:

- **RESUELTO EN BACKEND BRANCH / PENDIENTE UX CLAUDE**

---

### 3.8 Seed demo Marketing + Integraciones

Archivo modificado:

- `core/integraciones.js`

Documento:

- `docs/AVANCE-SEED-MARKETING-INTEGRACIONES-20260703.md`

Colecciones incorporadas en demo:

- `integraciones`
- `eventosIntegracion`
- `campanas`
- `piezas`
- `metricasMarketing`

Estado:

- **RESUELTO EN CORE / PENDIENTE VALIDACIÓN LOCAL**

---

### 3.9 Documento puente Claude actualizado

Archivo:

- `docs/MEJORAS-CHATGPT-PARA-CLAUDE-POST-V197-20260703.md`

Commit:

- `2d72e60eea121cb6726129dfe11d7999916897fc` · `docs: actualizar puente Claude con integraciones`

Estado:

- **RESUELTO / ACTIVO**

---

## 4. Pendiente ChatGPT/Codex inmediato

### BE-P1-001 · Validación local automatizada sin bloques largos

Crear runner versionado que valide:

- `core/integraciones.js` existe,
- `core/integraciones-panel.js` existe,
- `modules/marketing.js` contiene `marketing_generar_pieza`, `marketing_programar_publicacion`, `marketing_sync_sheets`,
- `core/integraciones.js` contiene `openPanel`, `diagnostico`, `extendSeed`,
- servidor local levanta con Node,
- demo abre sin tocar Firestore real,
- reporte se guarda y se copia al portapapeles.

No debe:

- usar `git clean`,
- usar Python,
- tocar `main`,
- hacer deploy,
- escribir producción,
- pedir pasos manuales largos.

---

### BE-P1-002 · Preparar adaptador Make seguro

Siguiente bloque backend real:

- diseñar `core/integraciones-make.js` o backend proxy equivalente,
- mantener secretos fuera del frontend,
- soportar tenant,
- registrar `eventosIntegracion`,
- permitir estados `pendiente`, `enviado`, `confirmado`, `error`,
- no activar envío real hasta autorización.

---

### BE-P1-003 · Revisar Configuración/Automatizaciones

Pendiente:

- definir dónde se configura cada proveedor,
- evitar guardar secretos reales en frontend,
- corregir futura UI para integraciones por tenant,
- preparar puente para Firestore/backend seguro.

---

## 5. Pendiente Claude prioritario

Claude debe incorporar en próxima versión:

1. Conservar `core/integraciones.js`.
2. Conservar `core/integraciones-panel.js`.
3. Conservar `modules/marketing.js` conectado a eventos.
4. Integrar panel visual dentro de Automatizaciones/Integraciones.
5. Agregar historial por contenido en Marketing.
6. Corregir mojibake en `modules/automatizaciones.js`.
7. Mejorar Marketing a ficha diaria operativa.
8. Mantener compatibilidad con `campanas`, `piezas`, `metricasMarketing`, `eventosIntegracion`, `integraciones`.
9. No reintroducir botones solo `toast`.
10. Actualizar `CHANGELOG.md`.

---

## 6. Riesgos abiertos

### R1 · Sin validación local aún

Los cambios están en GitHub, pero no se ha corrido smoke local visual posterior a estos commits.

Mitigación:

- crear runner de validación y usarlo solo cuando Paula autorice validación local.

### R2 · `modules/automatizaciones.js` con mojibake

El archivo tiene textos dañados por codificación. No se reemplazó para evitar regresión.

Mitigación:

- Claude debe corregir el módulo visualmente en próxima iteración.
- ChatGPT/Codex no debe reemplazarlo completo sin prueba visual.

### R3 · Auth/LAB pendiente

Auth/LAB queda como P0 operativo, pero no bloquea el frente Marketing demo.

Mitigación:

- retomar con runner específico, no bloques manuales.

---

## 7. Estado final de este corte

**AVANCE REAL EN GITHUB:** sí.  
**Pendiente de validación local:** sí.  
**Bloques manuales pedidos a Paula:** no.  
**Deploy/producción:** no.  
**Datos reales:** no.  
**Secretos:** no.  
**Próximo bloque recomendado:** crear runner seguro de validación local Marketing/Integraciones.
