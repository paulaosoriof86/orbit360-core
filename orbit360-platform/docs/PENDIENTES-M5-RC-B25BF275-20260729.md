# Pendiente único M5 — RC b25bf275

Fecha: 2026-07-29 UTC / 2026-07-28 Guatemala

## Estado cerrado

- M1–M4: cerrados.
- M5 5.0.1–5.0.4: cerrados.
- Runtime smoke 5.0.5: stop-line cerrado, autorización consumida, cero escrituras.
- Remediación estática 5.0.6: cerrada.
- Hosting LAB 5.0.7: cerrado.
- RC: `b25bf2750548651a719526bc4dadf7662def2255876c4c2e5e32bdf90f93a091`.
- Activos críticos: 42/42.
- Activos públicos LAB: 25/25.
- Mismatches: 0.
- Hosting deploy executions: 1.
- Redeploy: no.

## Pendiente autorizado actualmente

Ninguno.

```txt
hostingDeployAuthorized: false
allowedHostingDeployExecutions: 0
publicParityRecoveryAuthorized: false
runtimeSmokeAuthorized: false
allowedRuntimeSmokeExecutions: 0
visualReviewAuthorized: false
```

## Próxima autorización requerida

Una sola ejecución runtime smoke LAB de la RC exacta `b25bf275…`.

Alcance permitido únicamente después de autorización explícita independiente:

- navegador automatizado LAB;
- autenticación y acuerdo legal una vez;
- lectura Firestore read-only cuando el gate la requiera;
- Dirección desktop, Operativo tablet y Asesor móvil;
- Cliente 360 lista/ficha/calidad;
- Aseguradoras directorio/ficha/conocimiento;
- multirol/scopes, menú móvil, relaciones vacías honestas y cero copy técnico;
- verificación de 414 clientes, 26 aseguradoras y 7 asesores;
- cero escrituras.

Alcance prohibido:

- otro deploy Hosting;
- Firestore writes y mutaciones operativas;
- Functions y Rules;
- producción;
- `main` y merge;
- revisión visual humana antes de smoke `ok:true`;
- Pólizas y cualquier otra fuente real.

## Gate de salida esperado

```txt
RC = b25bf2750548651a719526bc4dadf7662def2255876c4c2e5e32bdf90f93a091
public parity = 25/25 preservada
runtime smoke = ok:true
Firestore writes = 0
operational writes = 0
hosting deploy = false
Functions/Rules/production/main/merge = false
```

Solo después podrá habilitarse la revisión visual única. Pólizas continúa bloqueado hasta que su bloque solicite y reciba la fuente real vigente específica.
