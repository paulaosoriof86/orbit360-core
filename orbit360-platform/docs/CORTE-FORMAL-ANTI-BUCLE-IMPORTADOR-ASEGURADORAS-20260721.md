# CORTE FORMAL ANTI-BUCLE — IMPORTADOR Y DIRECTORIO DE ASEGURADORAS

Fecha: 2026-07-21  
Proyecto: Orbit 360 — Alianzas y Soluciones  
Repositorio: `paulaosoriof86/orbit360-core`  
Rama obligatoria: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open  
Producción, `main` y merge: no autorizados

## AVISO DE PRECEDENCIA POR REINCIDENCIA

Este documento conserva el diagnóstico original del incidente, pero el estado operativo actual quedó elevado a:

```txt
STOP_THE_LINE_METHODOLOGY_REVIEW
```

La fuente vinculante posterior es:

```txt
orbit360-platform/docs/CORTE-METODOLOGICO-REINCIDENCIA-ANTI-BUCLE-20260721.md
```

También prevalece:

```txt
tools/orbit360-incident-freeze-v20260721.json
```

Mientras ese freeze permanezca activo:

- no se ejecuta diagnóstico runtime, ni siquiera read-only;
- no se leen Firestore ni Secret Manager;
- no se crean o parchean scripts de diagnóstico/recuperación;
- no se ejecutan dry-runs, gates o workflows;
- no se reimporta Guatemala ni Colombia;
- no se modifica producto, datos, importador, Functions, reglas o UI;
- no se avanza a Pólizas, Cobros o Bloque 2.

## Estado único vigente

```txt
Bloque 0: CERRADO
M1 funcional: PRESERVADO
26 aseguradoras en checkpoint sano: VALIDADAS
Credenciales de portal en bóveda: 26/26 CONFIRMADAS
Cuentas bancarias completas en bóveda: 91/91 CONFIRMADAS
Valores completos en store: 0
Estado operativo posterior regresado: 23 referencias válidas y 68 faltantes
Identidad de recuperación confirmada: 34
Identidad de recuperación no demostrada: 34
Colombia: INTACTA Y BLOQUEADA
Reimportación: NO REQUERIDA Y PROHIBIDA
Recuperación: NO AUTORIZADA
Runtime: CONGELADO
```

## Aclaración sobre la validación anterior

Las aseguradoras sí quedaron validadas en el checkpoint sano:

```txt
HEAD: 02a5436bc804b3a861f82375b124d05015389b4b
Run: 29797444980
Clientes/Aseguradoras/Asesores: 414/26/7
Referencias protegidas válidas: 91
Valores completos en store: 0
```

La reducción posterior a 23 referencias válidas ocurrió después de una reimportación GT. No invalida el checkpoint sano; representa un estado posterior regresado que debe mantenerse separado de la validación funcional de M1.

## Causa raíz metodológica posterior

La regla documental prohibía un tercer reintento, pero los workflows seguían teniendo triggers automáticos por `push` sobre sus propios scripts. El preflight de gates tampoco consultaba el freeze del incidente.

Por ello se produjo la cadena:

```txt
parche → commit → push → nuevo run automático
```

La corrección actual no consiste en otro diagnóstico. Consiste en congelar técnicamente los workflows y cerrar la revisión metodológica antes de definir cualquier siguiente acción técnica.

## Única acción permitida

```txt
REVISIÓN Y CIERRE DEL CORTE METODOLÓGICO CON PAULA
```

No existe una siguiente acción técnica autorizada hasta levantar formalmente el freeze.
