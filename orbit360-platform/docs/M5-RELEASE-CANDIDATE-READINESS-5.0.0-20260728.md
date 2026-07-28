# M5 — release candidate readiness

Fecha: 2026-07-28  
Gate único M5: `block5-release-candidate-visualization-v20260728`  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open

## Estado vigente

`M5_UNFROZEN_CANONICAL_BASELINE_READY_READINESS_REPAIR_REQUIRED`.

M4 ya cerró como `M4_CLOSED_SUCCESS_CANONICAL_TARGET_VERIFIED` después de 4.3.0 dry-run, 4.3.1 escritura durable y 4.3.2 revalidación read-only.

El readiness 5.0.0 anterior permanece invalidado por `VALIDATOR_STALE` porque comprobaba conteos de fuente pero no cardinalidad del destino canónico. Su evidencia de integridad frontend se conserva únicamente como referencia técnica y debe recalcularse.

## Evidencia técnica anterior preservada

```text
Run: 30400072369
RC hash anterior: a891dbd159bd667125291460b9f2202fe5177f78df460791d685255940df1c13
Activos críticos: 40/40
Paridad visual LAB: 22/22
Hosting deploy ejecutado: no
```

No habilita runtime smoke ni revisión visual.

## Readiness corregido 5.0.1

Debe comprobar simultáneamente:

```text
M1 closed = true
M2 closed = true
M3 closed = true
M4 status = M4_CLOSED_SUCCESS_CANONICAL_TARGET_VERIFIED
M4 final revalidation = PASS
source clients = 414
source insurers = 26
canonical target config = 1
canonical target memberships = 1
canonical target clients = 414
canonical target insurers = 26
advisors = 7
missing client currency = 0
target-only clients = 0
target-only insurers = 0
```

Luego recalcula hash de la candidata y vuelve a comparar los activos visuales del mismo frontend publicado en LAB.

Capacidades 5.0.1:

```text
secrets: false
Firestore: false
writes: false
browser: false
Hosting deploy: false
Functions/Rules: false
production/main/merge: false
Pólizas: false
```

Resultados permitidos:

```text
M5_RC_READY_FOR_RUNTIME_SMOKE
M5_RC_READY_LAB_DELIVERY_REQUIRED
```

Solo el primer resultado habilita la preparación del smoke runtime. El segundo exige entrega Hosting LAB controlada; nunca se despliega por inferencia.

## Gate runtime posterior

Después del readiness corregido debe resolver primero el selector legacy de roles para que solo exponga roles permitidos por la membership efectiva y `Orbit.session` rechace roles no autorizados. No se crean usuarios ni se modifica membership para resolverlo.

Luego el mismo gate runtime deberá validar:

- Dirección — escritorio;
- Operativo — tableta;
- Asesor — móvil;
- login, membership, tenant, rol activo y scope;
- 414 clientes y 26 aseguradoras desde el store canónico;
- Cliente 360 lista/ficha/calidad;
- Aseguradoras directorio/ficha/conocimiento;
- GT/CO y sin monedas mezcladas;
- relaciones faltantes honestas;
- sin copy técnico, seed/demo ni secretos;
- sin dobles listeners/renderers;
- sin error bloqueante.

Solo con smoke `PASS` se habilita la revisión visual única de Paula.

## Fuentes reales

Pólizas continúa `FUENTE_REAL_REQUERIDA`. Cuando llegue su bloque se solicitará a Paula el listado actual y vigente específico. `Listado producción 2025-2026` no es una fuente válida. La misma regla aplica a las fuentes posteriores.

## Claude y Academia

Claude: patrones reutilizables de source-vs-target readiness, UX y gates pueden acumularse sin datos reales; backend protegido no se envía.  
Academia: diferencia entre fuente saneada, destino migrado, validador obsoleto y readiness visual.
