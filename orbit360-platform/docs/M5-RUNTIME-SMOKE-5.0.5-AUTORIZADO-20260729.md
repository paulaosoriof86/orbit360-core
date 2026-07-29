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

## Impacto Academia

La Academia debe enseñar que un runtime smoke posterior a una corrección de seguridad no puede reutilizar selectores globales ni validadores de datos previos. Debe validar roles efectivos de membership, rechazo de roles no asignados, separación entre prueba automatizada y revisión visual humana, y evidencia read-only antes/después.

## Estado

Paquete preparado. La solicitud inmutable se crea únicamente después de cerrar y verificar conjuntamente lifecycle, autorización, freeze, router canónico, workflow, contrato y documentación.
