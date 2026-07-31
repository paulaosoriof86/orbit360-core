# CIERRE RULES + CAUSA RAÍZ PROYECCIÓN — RECIBOS/CARTERA 9.1.0

Fecha operativa: 2026-07-30 / Guatemala  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open  
Contrato: `9.1.0`

## Estado del bloque

Recibos/Cartera conserva `WRITE_PASS` con baseline real:

```text
clientes: 430
aseguradoras: 30
asesores: 7
polizas: 1373
vehiculos: 1032
recibosEsperados: 1293
carteraPrimas: 673
cobros: 0
finmovs: 0
```

La compatibilidad read-only de Firestore Rules quedó aplicada y validada. La revisión visual todavía no puede cerrarse porque, después de resolver Rules, apareció y se diagnosticó un defecto funcional independiente en el lifecycle de la proyección LAB. Ese defecto ya está corregido en código y probado estática/sintéticamente, pero el nuevo archivo frontend aún no se ha vuelto a publicar en Hosting LAB.

## 1. Autorización Rules consumida

Autorización exacta:

`AUTORIZO RULES READONLY COMPAT LAB RECIBOS CARTERA V910 20260730`

Primer run: `30629152231`.

Resultado pre-risk:

- gate: PASS;
- candidata exacta: PASS;
- credencial técnica: PASS;
- fallo antes de Rules deploy en guard de sincronización;
- Rules deploy: SKIPPED;
- navegador: SKIPPED;
- Hosting: 0;
- datos: 0.

Clasificación: `PIPELINE_MECHANISM_FAILURE`.

Causa: `WORKTREE_WIDE_DIFF_GUARD_INCLUDED_RUNTIME_EVIDENCE`.

La autorización no había sido consumida por un deploy y se reanudó con el mismo request.

## 2. Rules read-only compatibility — PASS

Run de reanudación: `30629363251`.

PASS:

- gate canónico;
- candidata SHA-256 exacta `a78ad9e7ec3dc7277dda81d10ef223784d762f3b5d52e4040d9436679db7f4eb`;
- sincronización fuente;
- deploy único `firestore:rules`;
- lectura legacy autorizada;
- lectura productiva normalizada preservada;
- colección legacy sensible denegada;
- `credentialRefs` denegado;
- identidad productiva read-only;
- smoke M6 productivo tres vistas;
- write guard productivo;
- network write candidates: 0;
- Firestore data writes: 0;
- Hosting deploy: 0;
- Functions/Storage: 0;
- rollback: no requerido.

Commit fuente de Rules: `980a317fdae9d24ea1cde8efbdc3cfae6d4f8038`.

La compatibilidad permanece clasificada como `TEMPORAL_RETIRO + BACKEND_PROTEGIDO_NO_CLAUDE` y debe retirarse cuando el LAB legado deje de consumir la ruta `tenantId/...`.

## 3. VALIDATOR_STALE — entrypoint visual

La primera visual posterior a Rules seguía fallando en `hydrate` porque el validador abría la URL limpia de Hosting, mientras el owner LAB solo se activa con el entrypoint contractual:

```text
?orbitBackend=firestore-lab&tenant=alianzas-soluciones
```

Clasificación: `VALIDATOR_STALE`.

Fix del validador: commit `3a6fa4fa6adf74a1df81cfa7aa0023a8985daa46`.

Un replay read-only (`30629834920`) se detuvo antes del navegador por otra aserción obsoleta del workflow que exigía un campo no emitido por el preflight. El gate real había dado 32/32 PASS. Se corrigió la aserción sin tocar producto.

## 4. Repetición de hydrate y STOP_RETRY

Run visual read-only: `30629935539`.

- gate: PASS;
- entrypoint LAB: correcto;
- legal: resuelto;
- Hosting/Rules deploy: 0;
- visual: FAIL en `hydrate` después de 90 s.

Se aplicó `STOP_RETRY` y no se lanzó un tercer validador.

## 5. Diagnóstico read-only de causa raíz

Run: `30630222364`  
Artifact: `8793036965`  
Digest: `sha256:79f83fc5f934c510197b8a600a5792d1a8f6353a0d1e828e2c52a66a40f3d05d`.

Estado real capturado después de login:

```text
clientes: 430
aseguradoras: 30
asesores: 7
polizas: 1373
vehiculos: 1032
recibosEsperados: 0
carteraPrimas: 0
cobros: 0
finmovs: 0
```

El store base estaba `ready`, con sus listeners adjuntos y las colecciones autorizadas correctamente hidratadas. La proyección 9.1.0 estaba cargada, pero reportaba:

```text
attached: []
recibosEsperados: 0
carteraPrimas: 0
ready: false
errors: {}
```

Esto descartó Rules, Auth, Hosting, datos y latencia como causa del 0/0 suplementario.

## 6. FUNCTIONAL_DEFECT — causa raíz exacta

Código de causa raíz:

`PROJECTION_WRAPSTORE_NON_IDEMPOTENT_BLOCKS_ATTACH_AFTER_BOOT_WRAP`

El bridge ejecutaba el siguiente orden:

```text
boot()
→ wrapStore()
→ wrappedStore = true
→ Auth current user
→ attach()
→ wrapStore()
→ false porque ya estaba wrapped
→ attach() termina sin crear snapshots
```

La función `wrapStore()` trataba “ya envuelto” como fallo, aunque ese estado es precisamente el esperado cuando `attach()` ocurre después del bootstrap.

Corrección mínima:

```text
si wrappedStore ya es true → devolver true
si el store todavía no existe → devolver false
si existe y no está envuelto → envolver y devolver true
```

No se alteraron write APIs, rutas, datos, Rules, Auth ni módulos de negocio.

## 7. Evidencia pre/post de la corrección

Primer workflow de fix `30630503118`:

- reproducción sintética pre-fix: PASS como evidencia del defecto;
- cambio local aplicado;
- bloqueo posterior por un guard de worktree que volvió a incluir evidencia runtime;
- commit funcional: no creado;
- deploy: 0.

Clasificación: `PIPELINE_MECHANISM_FAILURE` ya conocida. Se corrigió el mecanismo para stagear únicamente el archivo funcional.

Run final del fix: `30630611243` · SUCCESS.  
Artifact: `8793162582`.  
Digest: `sha256:deca558e721d05d48ca74591605efa4214330659835a6a92faecabc93be1fc01`.  
Commit funcional: `da9eaf6c862729f8f513ee1318acca1d00b56cd5`.

Evidencia pre-fix sintética:

```text
projectionPresent: true
ready: false
bothAttached: false
store base preserved: true
```

Evidencia post-fix sintética:

```text
projectionPresent: true
ready: true
bothAttached: true
receiptCount: true
portfolioCount: true
storeReceipts: true
storePortfolio: true
baseStorePreserved: true
```

Contrato estático post-fix:

```text
25/25 PASS
STORE_WRAP_IDEMPOTENT: PASS
ATTACH_CAN_REUSE_WRAPPED_STORE: PASS
NO_FIRESTORE_WRITE_API: PASS
READONLY_DECLARED: PASS
```

Capacidades del run: Firestore writes 0 · operational writes 0 · deploy 0 · production 0.

## Estado seguro actual

```text
Datos Recibos/Cartera: WRITE_PASS
Rules compatibility: DEPLOY_PASS
Producto M6 read-only: REGRESSION_PASS
Hosting LAB existente: publicado, pero contiene la versión anterior del bridge
Bridge corregido en HEAD: STATIC + SYNTHETIC PASS
Visual final: PENDIENTE de publicar el bridge corregido
Cobros/conciliación: BLOQUEADO
```

## Siguiente frontera autorizable

Se requiere únicamente un nuevo deploy de **Hosting LAB** porque el frontend cambió después del deploy anterior.

El siguiente bloque debe:

1. validar gate y lineage;
2. publicar el HEAD actual solo en el canal preview LAB existente;
3. verificar paridad del bridge corregido;
4. ejecutar diagnóstico rápido de hidratación y exigir 1293 / 673;
5. ejecutar una única revisión visual read-only;
6. no tocar Rules, Functions, Storage, datos, main, merge ni Cobros.

Solo después de evidencia visual automatizada PASS procede la revisión visual humana y, tras su aprobación, Cobros/conciliación.
