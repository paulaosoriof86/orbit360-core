# Guía mínima — Ejecución y revisión del runner local de Conciliaciones

**Fecha:** 2026-07-05  
**Proyecto:** Orbit 360 A&S  
**Rama:** `ays/backend-tenant-lab-v99-20260703`  
**PR:** #5 draft, sin merge y sin deploy  
**Estado:** guía operativa agregada; ejecución local pendiente.

---

## 1. Propósito

Reducir pasos manuales para Paula y dejar criterios claros antes de pasar del tooling sintético/estático al smoke visual/operativo.

Esta guía no autoriza adapter Firestore LAB real, persistencia, aplicación de pagos, carga de datos reales, deploy ni merge.

---

## 2. Comando recomendado en Windows PowerShell

Ejecutar desde la raíz del repo:

```powershell
.\tools\orbit360-run-validaciones-locales-conciliaciones-ays.ps1
```

El wrapper:

- valida que se esté en la raíz del repo;
- valida que exista Node;
- ejecuta `tools/orbit360-run-validaciones-locales-conciliaciones-ays.mjs`;
- muestra el resultado en consola;
- ubica el TXT/JSON más reciente del runner;
- genera un resumen PowerShell;
- intenta copiar el resumen al portapapeles.

---

## 3. Comando alternativo directo Node

```powershell
node tools/orbit360-run-validaciones-locales-conciliaciones-ays.mjs
```

Usar esta opción solo si no se quiere usar el wrapper PowerShell.

---

## 4. Reportes esperados

Después de ejecutar, revisar:

```txt
_orbit360_reports/RUN-VALIDACIONES-LOCALES-CONCILIACIONES-AYS-*.txt
_orbit360_reports/RUN-VALIDACIONES-LOCALES-CONCILIACIONES-AYS-*.json
_orbit360_reports/POWERSHELL-RUN-VALIDACIONES-LOCALES-CONCILIACIONES-AYS-*.txt
```

El TXT sirve para lectura rápida. El JSON sirve para revisión técnica.

---

## 5. Criterios para continuar a smoke visual/operativo

Solo se puede continuar a smoke visual/operativo si el reporte muestra:

```txt
RESULTADO: OK
Fallidos: 0
Archivos protegidos con cambios: 0
can_write_now=false
can_apply_payments=false
```

Además, las restricciones deben seguir indicando:

```txt
no real data
no Orbit.store writes
no Firestore writes
no payment application
no cobros mutation
no deploy
no merge
```

---

## 6. Criterios de bloqueo

Bloquear avance si aparece cualquiera de estos casos:

```txt
RESULTADO: FAIL
VALIDACIONES_LOCALES_BLOQUEADAS
Fallidos > 0
Archivos protegidos con cambios > 0
can_write_now=true
can_apply_payments=true
Errores > 0
Reporte JSON ausente o ilegible
Cambio en store.js, store-firestore-lab.local.js, backend-lab-loader, backend-lab-init, backend-lab-security-guard o firestore.rules
Cualquier mención a aplicar pagos, pagar cobros, generar cartera o generar producción como acción ejecutada
```

Si hay `VALIDACIONES_LOCALES_LISTAS_CON_ADVERTENCIAS`, no pasar a adapter LAB. Primero revisar advertencias y decidir si son de entorno local o de contrato.

---

## 7. Qué compartir de vuelta a ChatGPT/Codex

Compartir el texto copiado al portapapeles por el wrapper o pegar el contenido del archivo:

```txt
_orbit360_reports/POWERSHELL-RUN-VALIDACIONES-LOCALES-CONCILIACIONES-AYS-*.txt
```

Si el portapapeles falla, compartir la ruta del TXT y las líneas principales:

```txt
Decision
Pasos
Fallidos
Advertencias
Archivos protegidos con cambios
Reportes generados
RESULTADO
```

---

## 8. Qué no hacer después de un OK

Aunque el runner dé OK, no hacer todavía:

- no deploy;
- no merge;
- no carga de datos reales;
- no adapter Firestore LAB real;
- no aplicación controlada de pagos;
- no marcar cobros como pagados;
- no generar cartera ni producción.

El siguiente paso permitido es únicamente smoke visual/operativo y revisión manual de reportes.

---

## 9. Siguiente paso si el runner sale OK

Abrir la plataforma en entorno local/LAB y validar visualmente:

- Conciliaciones aparece para Dirección/Admin/Finanzas;
- renderiza estado vacío honesto;
- no muestra pagos aplicados si no hay aplicación real;
- acciones de revisión no mutan `cobros`, `comisiones`, `finmovs`, cartera ni producción;
- mensajes visibles mantienen estado honesto: propuesta, revisión, validación pendiente o validada, no pagada.

---

## 10. Siguiente paso si el runner falla

No seguir a smoke visual ni adapter LAB. Revisar el TXT/JSON del runner, corregir el tooling o contrato afectado, y volver a ejecutar el mismo comando.

---

## 11. Estado de esta guía

Guía agregada para continuidad operativa. No ejecutada en entorno local todavía.