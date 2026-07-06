# Guía — Auditor gate candidata Claude v1.146

**Fecha:** 2026-07-06  
**Proyecto:** Orbit 360 A&S  
**Script:** `tools/orbit360-auditar-candidata-claude-gate-v1146.mjs`  
**Estado:** auditor local plan-only; no modifica repo, no escribe datos de negocio, no deploy.

---

## 1. Objetivo

Auditar una candidata Claude extraída antes de decidir si se devuelve, se acepta parcialmente o se empalma de forma controlada.

El auditor valida:

```txt
sintaxis JS
index híbrido con backend LAB y portal hotfix
residuos de copy prohibido
Academia plus + seed
Importador
Cliente360/Cobros/Finanzas/Conciliaciones/Automatizaciones
presencia de archivos protegidos en la candidata
```

---

## 2. Uso local

Desde la raíz del repo:

```powershell
node tools/orbit360-auditar-candidata-claude-gate-v1146.mjs --candidate "C:\ruta\a\candidata-extraida"
```

El resultado queda en:

```txt
_orbit360_reports/AUDITORIA-CANDIDATA-CLAUDE-GATE-*.json
_orbit360_reports/AUDITORIA-CANDIDATA-CLAUDE-GATE-*.txt
```

---

## 3. Decisiones

```txt
PASA: puede pasar a auditoría de empalme.
PASA_CON_REVISION: hay advertencias; revisar manualmente.
DEVOLVER: pedir corrección a Claude.
```

---

## 4. Qué bloquea

Bloquea si:

```txt
index no conserva backend LAB / portal hotfix
quedan frases prohibidas en módulos activos
Academia no cubre junio/julio, manifest, fuentes separadas, banco, financiero histórico, documentos soporte, país/moneda
hay errores JS
faltan archivos clave
```

---

## 5. Qué advierte

Advierte si la candidata incluye archivos protegidos. Eso no significa que deban empalmarse; significa que requieren diff manual y normalmente deben descartarse.

---

## 6. Estado

Guía creada. Usar al recibir v1.146 o cualquier candidata posterior.