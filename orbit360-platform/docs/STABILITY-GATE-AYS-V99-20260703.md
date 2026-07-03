# Stability Gate A&S v99

**Fecha:** 2026-07-03  
**Rama obligatoria:** `ays/backend-tenant-lab-v99-20260703`  
**Script:** `tools/orbit360-stability-gate-ays-v99.ps1`  
**Estado:** creado e integrado al run maestro.

## 1. Objetivo

Evitar que la plataforma quede frágil o inestable antes de avanzar con smoke LAB, migración real o empalme con nuevos prototipos.

## 2. Qué valida

El gate valida:

- rama obligatoria;
- estado Git local;
- existencia de archivos críticos;
- reglas Firestore con ruta LAB actual y ruta futura;
- index con scripts de data/backend;
- orden esperado de scripts cuando loader/init están presentes;
- contrato básico del store LAB;
- módulos sin `localStorage` directo;
- separación recaudo/caja;
- revisión básica de seed demo;
- sintaxis JS crítica con `node --check`.

## 3. Resultados posibles

```txt
RESULTADO: APROBADO
RESULTADO: APROBADO_CON_ADVERTENCIAS
RESULTADO: BLOQUEADO
```

Exit codes:

```txt
0 = aprobado
1 = aprobado con advertencias
2 = bloqueado
```

## 4. Bloqueos principales

El gate bloquea si encuentra:

- rama incorrecta;
- archivo crítico faltante;
- reglas Firestore sin ruta LAB;
- regla abierta de lectura/escritura total;
- index sin `data/store.js`, store LAB o seed;
- orden incorrecto de scripts cuando loader/init existen;
- store LAB usando `localStorage` como fuente;
- módulos usando `localStorage` directamente;
- recaudo con riesgo de crear movimiento financiero automático;
- error de sintaxis JS crítica.

## 5. Advertencias principales

El gate advierte si encuentra:

- cambios locales sin commit;
- index todavía sin loader/init permanente;
- ruta futura no documentada en reglas;
- API no detectada claramente;
- Node no disponible;
- términos que requieren revisión en seed.

## 6. Integración con run maestro

El run maestro ejecuta ahora:

```txt
tools/orbit360-stability-gate-ays-v99.ps1
```

antes del smoke LAB.

Si el gate devuelve bloqueo, el run maestro se detiene y no ejecuta smoke.

## 7. Restricciones

El gate no hace:

- deploy;
- Hosting;
- producción;
- secretos;
- datos reales;
- commit;
- push.

## 8. Estado

**Estado:** LISTO.  
**Siguiente paso:** ejecutar run maestro local cuando la config LAB local esté preparada.
