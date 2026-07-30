# CIERRE OPERATIVO M6 — STOP_RETRY Y CAUSA RAÍZ

Fecha: 2026-07-30  
Gate único: `block6-go-live-product-v20260730`  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open

## 1. Estado

M5 permanece cerrado y aprobado visualmente. M6 **no está cerrado** y el go-live productivo **no está activo**.

La regla de dos fallos en la misma etapa quedó aplicada: `STOP_RETRY`. No se autoriza un tercer deploy hasta corregir y validar estáticamente el mecanismo de readiness posterior a Hosting y obtener una nueva autorización productiva explícita.

## 2. Primer intento productivo — 6.1.0

- request inmutable: commit `a0ad6cab35f214f6442a99394ec0ac88ed7c67da`;
- run: `30516109429`;
- job: `90786173738`;
- preflight canónico: PASS;
- snapshots before/after: estables;
- escrituras de datos: 0;
- smoke: no ejecutado;
- rollback: no cerró correctamente en ese intento.

### Causa raíz 1

Clasificación: `ENVIRONMENT_FAILURE`.

Diagnóstico read-only:

- run: `30516599013`;
- job: `90787748210`;
- artifact inicial: `8749110972`;
- digest: `sha256:66e49382e0e1cfba566dc5bffc84c06c9c14e5aeeef68db21aacf679716f1eb3`;
- proyecto reconciliado: correcto;
- bucket de Storage declarado por configuración Web: sí;
- bucket real legible/existente: no;
- respuesta del bucket: 404;
- release de Storage Rules: inexistente;
- estado remoto parcial después del primer intento: no.

Causa: `STORAGE_TARGET_NOT_READY_FOR_RULES_DEPLOY`.

Corrección aplicada: Storage se retiró del bloque M6 y quedó `DEFERRED_FAIL_CLOSED`. No se creó bucket ni infraestructura nueva para satisfacer el gate. M6 correctivo quedó reducido a Firestore Rules read-only + Hosting; el rollback quedó reducido a Firestore deny-all + Hosting neutro.

## 3. Intento correctivo — 6.1.2

- request inmutable: commit `5a904d0cc170857de1a259274c315f932e023fd8`;
- run: `30517031703`;
- job: `90789084727`;
- artifact: `8749287077`;
- digest: `sha256:bedfa8b0c77353b860102df9de5a353a018187c6861592432fa4e6b0b0cb79ac`;
- preflight: `GO_GATE_CONTRACT` 16/16;
- configuración Web: derivada read-only;
- identidad de smoke: resuelta;
- snapshot before: PASS;
- shell productivo: construido sin assets LAB/demo;
- Firebase CLI deploy: **success**;
- release Hosting creada: `projects/646761409743/sites/ays-orbit-360-lab/versions/0f1455aaa2b8600f`;
- verificación HTTP inmediata: **404**;
- smoke: skipped por fallo de la etapa de verificación;
- snapshot after: PASS;
- conteos: estables;
- digests: estables;
- escrituras Firestore: 0;
- escrituras operativas: 0;
- rollback automático: **success**;
- release Hosting de rollback: `projects/646761409743/sites/ays-orbit-360-lab/versions/0bd3a1f67146320d`.

### Causa raíz 2

Clasificación: `PIPELINE_MECHANISM_FAILURE`.

El comando de deploy ya no falló. La etapa falló porque verificó la URL productiva con un único `curl --fail` inmediatamente después de crear la release. La URL respondió 404 dentro de la ventana de propagación y el workflow interpretó esa respuesta transitoria como fracaso terminal.

No existe evidencia de un defecto funcional del shell, del store, de Auth o de los datos en este punto porque el smoke no llegó a ejecutarse.

## 4. Estado remoto final verificado read-only

Se reejecutó exclusivamente el diagnóstico read-only después del rollback.

- diagnóstico: PASS;
- artifact de verificación final: `8749338488`;
- digest: `sha256:d4d78f8ba27c4a05b411c1f9c480f78deed8e4f53a3d50ea3969e732d3bc6b3a`;
- Hosting: HTTP 200;
- shell servido: rollback neutro;
- shell productivo: no;
- shell LAB: no;
- Firestore Rules: `deny_all`;
- Storage: inexistente / no activo;
- escrituras de datos: 0.

Por tanto el estado actual es **fail-closed y seguro**, pero no productivo.

## 5. Integridad de datos

Baseline before/after idéntico:

```text
clientes canónicos: 414
aseguradoras canónicas: 26
asesores fuente: 7
memberships: 1
config: 1
```

Digests before/after:

```text
clientes: 028071ff323518de3dedcf1bd856919d114ecc5daa24df7c029f8aebfab18d3d
aseguradoras: 6055f638e5622e09a909de353cefc3853401288521605781118054dd521b904b
asesoresFuente: c00a04ad9879a35056319805e057faa69651881328cf0ca6bcc07592a6a6d68d
memberships: 9055ac5a3adc1d01b6f6ed7cefd6e032f5992d020b86dbef69230661cfd0a016
config: 64fc3957c30e7697521a737b5c3222844af4b1fa31587c0bd65f28ff38c921e2
```

## 6. Regla permanente derivada

Un deploy no se considera fallido porque el primer GET posterior devuelva 404 o contenido previo durante una ventana de propagación. El owner de readiness debe:

1. comprobar que Firebase CLI creó la release esperada;
2. esperar de forma acotada la propagación de Hosting;
3. reintentar únicamente lecturas GET/HEAD, sin redeploy;
4. aceptar solo el hash/marcador del shell esperado;
5. agotar un timeout vinculante antes de declarar fallo;
6. ejecutar rollback solo después de ese timeout o de una respuesta terminal demostrada.

Esto es una corrección del mecanismo de pipeline, no del producto.

## 7. STOP_RETRY

La etapa `deploy + verificación inmediata` falló en dos ejecuciones M6. Se prohíbe:

- tercer deploy ciego;
- crear otro bucket para satisfacer el gate;
- reabrir M5;
- tocar Pólizas para resolver M6;
- reimportar clientes/aseguradoras;
- crear otro gate paralelo.

## 8. Siguiente acción exacta

Corregir **solo** el owner de readiness posterior a Hosting para usar espera/reintento read-only acotado y validar estáticamente esa corrección. Después, y solo después, solicitar una nueva autorización única para recuperar el go-live M6 desde el estado fail-closed actual.

Storage queda fuera del go-live inicial hasta que un bloque posterior requiera documentos/adjuntos y exista una decisión explícita de infraestructura.

## 9. Clasificación para reutilización

- readiness con propagación acotada: `REPLICABLE_CLAUDE_ACUMULADO` + `ACADEMIA_ACTUALIZAR`;
- validar existencia de recursos opcionales antes de incluirlos en deploy multi-target: `REPLICABLE_CLAUDE_ACUMULADO` + `ACADEMIA_ACTUALIZAR`;
- implementación GitHub/Firebase, IAM, service accounts y Rules: `BACKEND_PROTEGIDO_NO_CLAUDE`;
- proyecto/bucket/tenant concretos A&S: `TENANT_AYS_ONLY`;
- secretos/credenciales: `SECRETO_DATO_REAL`.
