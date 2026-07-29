# M5 5.0.5 — Runtime smoke LAB autorizado

Fecha: 2026-07-29  
Gate: `block5-release-candidate-visualization-v20260728`  
RC inmutable: `d90ec601d17c8e750cbba6f19197d3f906b29a1377817f53fb73f0779e843045`  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open

## Clasificación previa

Se detectó que el validador histórico de Cliente 360 seguía esperando 61 clientes en `REQUIERE_VALIDACION`. Ese criterio quedó obsoleto después de M4 4.2.11, que corrigió exactamente esos 61 registros a `GT` / `GTQ`.

Clasificación: `VALIDATOR_STALE`.

No se modifica producto para satisfacer un criterio viejo. El runtime smoke 5.0.5 usa el baseline canónico vigente:

- 414 clientes;
- 26 aseguradoras;
- 7 asesores;
- país: GT 398, CO 16, REQUIERE_VALIDACION 0;
- tipo: Persona 391, Empresa 23;
- moneda faltante 0;
- destino canónico: configuración 1, memberships 1, clientes 414, aseguradoras 26.

## Alcance autorizado

Una sola ejecución runtime smoke LAB:

- secrets: sí, solo después del preflight;
- Firestore: lectura;
- navegador headless: sí;
- runtime: sí;
- escrituras Firestore/operativas: no;
- Hosting deploy: no;
- Functions/Rules: no;
- producción, main y merge: no;
- revisión visual humana: no, requiere cierre `ok:true`.

## Pruebas

1. Verificación inmutable de la RC y paridad Hosting 24/24.
2. Snapshot Firestore sanitizado antes del navegador.
3. Login LAB, bootstrap, acuerdo legal una vez y datos reales.
4. Frontera de acceso:
   - Dirección, Operativo y Asesor deben estar asignados;
   - Finanzas debe ser rechazado;
   - advisorId debe provenir de membership;
   - cero capacidad de escritura del owner de sesión.
5. Dirección desktop, Operativo tablet y Asesor móvil.
6. Cliente 360 y Aseguradoras operables sin copy técnico.
7. Guardas de escritura dentro del navegador.
8. Snapshot Firestore después y comparación exacta de conteos/digests.
9. Resultado aceptable únicamente con `ok:true`.

## Package check

El primer package check, run `30413170457`, se detuvo por `SNAPSHOT_NO_WRITES`. La búsqueda textual genérica confundía `crypto.createHash(...).update(...)` con una escritura Firestore.

Clasificación: `VALIDATOR_STALE` + `PIPELINE_MECHANISM_FAILURE`.

Se corrigió exclusivamente el validador. No se modificó producto, snapshot ni datos.

Cierre correcto:

```text
run: 30413254641
job: 90454019483
artifact: 8709200293
digest: sha256:946302a06a2b3dd3e948f9c2d7a3f67fba9b168236d29cff463e1a68df999caf
contract: 29/29
secrets: no
Firestore: no
runtime/browser: no
request: ausente durante el package check
```

## Impacto Academia

La Academia debe enseñar que un runtime smoke posterior a una corrección de seguridad no puede reutilizar selectores globales ni validadores de datos previos. Debe validar roles efectivos de membership, rechazo de roles no asignados, separación entre prueba automatizada y revisión visual humana, y evidencia read-only antes/después.

También debe distinguir una llamada criptográfica `.update()` de una operación Firestore `.update()`: un validador estático debe identificar el owner y el contexto de la llamada antes de clasificarla como escritura.

## Estado

Control-plane sincronizado:

- autorización explícita: activa una vez;
- package check: PASS;
- lifecycle: 5.0.5;
- router canónico: 5.0.5;
- freeze específico: `REQUEST_CREATED_AWAITING_ONE_RUNTIME_SMOKE_LAB`;
- freeze global: `M5_RUNTIME_SMOKE_AUTHORIZED_ONCE_REQUEST_CREATED`;
- Hosting: no autorizado y cero ejecuciones disponibles;
- revisión visual humana: no autorizada.

La siguiente acción es crear el archivo de solicitud inmutable como último commit, ligado al HEAD inmediatamente anterior, y aceptar exclusivamente evidencia sanitizada `ok:true`.
