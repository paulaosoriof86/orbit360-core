# Bloque 1 — snapshots Firestore pre-auth y espera contractual de owners

Fecha: 2026-07-18  
Proyecto: Orbit 360 — Alianzas y Soluciones  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open  
Gate único: `block1-client360-insurers-lab-v20260717`  
Contrato objetivo: `1.0.17`  
Producción/main/merge: no autorizados

## 1. Evidencia de entrada

Run: `29647948943`  
Commit: `8fd0a55793f44deda9c6e68efe32e1601044cbda`  
Contrato: `1.0.16`

Confirmaciones:

- preflight: `GO_GATE_CONTRACT`;
- conteos LAB: 414 clientes, 26 aseguradoras y 7 asesores;
- transporte PWA corregido: `tenant-insurer-config-p10.js` respondió HTTP 200;
- script del core de aseguradoras parseado por el navegador;
- Router avanzó al contrato siguiente;
- errores de sintaxis: 0;
- watchdog global: no excedido;
- primer error preservado;
- consola Firestore: múltiples accesos denegados antes del login y entrada en modo offline/reintento;
- etapa fallida: `canonical_tenant_insurer_core_ready`;
- resultado: `ok:false`.

La corrección PWA funcionó. El bloqueo restante provenía del orden de autenticación y snapshots.

## 2. Clasificación

Clasificaciones:

- `SECURITY_FAILURE` fail-closed: las reglas rechazaron correctamente accesos no autenticados;
- `PIPELINE_MECHANISM_FAILURE`: el adaptador inició listeners antes de disponer de la identidad canónica y congestionó el bootstrap.

No hubo fuga de datos ni relajación de reglas.

## 3. Causa raíz del adaptador protegido

El adaptador Firestore LAB declaraba el backend y, al final del archivo, ejecutaba:

```txt
setTimeout(attachSnapshots, 0)
setTimeout(attachSnapshots, 1200)
setTimeout(attachSnapshots, 3500)
```

Cada llamada intentaba conectar las 27 colecciones y preferencias antes del login. El guard `backend-lab-auth-guard.js` ya documentaba el contrato correcto: rearmar snapshots únicamente después de autenticar al usuario canónico.

La divergencia generaba:

1. listeners pre-auth;
2. rechazos de reglas por permisos;
3. reconexión/offline de Firestore;
4. congestión del hilo y del canal del navegador;
5. falsos síntomas en contratos runtime posteriores.

## 4. Corrección del adaptador

`data/store-firestore-lab.local.js` conserva íntegramente su API:

```txt
all/get/where/find/insert/update/remove/on/_emit
pref/setPref/init/reseed/raw
_attachSnapshots/_detachSnapshots
```

Cambios mínimos:

1. agrega `canonicalAuthUser()`;
2. exige email y UID canónicos antes de conectar snapshots;
3. devuelve `waiting-auth` sin abrir listeners cuando no existe sesión válida;
4. elimina los tres auto-intentos pre-auth;
5. expone `__authGatedSnapshots:true` y `authGatedSnapshots:true` para validación contractual;
6. conserva el guard como único responsable de rearmar snapshots después de Auth.

No se tocaron reglas, credenciales, colecciones, datos ni funciones CRUD.

## 5. Causa raíz del validador posterior

El Router usa un cutoff de 15 segundos por contrato. El validador anterior exigía algunos owners mediante `page.waitForFunction` con 12 segundos internos, por lo que podía cerrar antes de que el owner declarara su estado terminal.

## 6. Corrección del validador

El contrato `1.0.17` incorpora `waitForRuntimeContractOwner()`:

- observa el owner funcional;
- consulta `Orbit.router.runtimeContractState`;
- acepta únicamente el owner real;
- reconoce estados terminales `error`, `timeout` y `no-source`;
- espera hasta 20 segundos, por encima del cutoff de 15 segundos del Router;
- guarda `runtimeOwnerDiagnostics` sanitizado;
- emite códigos específicos por owner;
- evita que el validador venza antes que el contrato que evalúa.

Owners cubiertos:

- tenant insurer core;
- tenant runtime index;
- configuración activa del tenant.

## 7. Presupuestos preservados

Sin cambios:

```txt
watchdog global: 900.000 ms
canonical_client_projection_ready: 450.000 ms
captura final: 5.000 ms
Router cutoff por contrato: 15.000 ms
```

No se aumentó el tiempo para ocultar defectos; se alineó el orden y la semántica de los checks.

## 8. Carriles

### Carril A — frontend/UX

Sin cambios visuales, sin reemplazar renderers y sin tocar Cliente 360/Aseguradoras.

### Carril B — backend/seguridad/pipeline

Avance visible:

- snapshots exclusivamente post-auth;
- reglas continúan fail-closed;
- cero intentos automáticos pre-auth;
- owners runtime observados por estado real;
- códigos de fallo específicos;
- herramientas temporales retiradas después de aplicar y validar los parches.

### Carril C — datos A&S

Preservados:

- 414 clientes;
- 26 aseguradoras;
- 7 asesores;
- cero reimportación;
- cero inferencia de pólizas, vehículos, cartera o cobros.

## 9. Claude

Clasificación:

- `BACKEND_PROTEGIDO_NO_CLAUDE` para el adaptador Firestore LAB concreto;
- `REPLICABLE_CLAUDE_INMEDIATO` para el patrón reusable de bootstrap y validadores.

Patrones reutilizables:

- nunca abrir listeners tenant antes de Auth;
- reglas fail-closed no sustituyen un orden correcto del cliente;
- el guard Auth debe ser owner único de conectar/desconectar snapshots;
- un validador no debe vencer antes del componente que valida;
- observar owner, estado del loader y transporte como señales separadas;
- herramientas de parche temporal deben retirarse después de un commit validado.

## 10. Academia

Caso aplicado:

> Las reglas deniegan accesos antes del login y Firestore entra en reintento. El gate luego parece fallar en un script de configuración. ¿Es un defecto del script?

Respuesta correcta:

1. reconocer el fail-closed de seguridad;
2. revisar quién inicia los listeners;
3. verificar si Auth ocurrió antes de snapshots;
4. detener conexiones pre-auth;
5. mantener reglas cerradas;
6. validar nuevamente el owner con un timeout coherente con el contrato del Router.

## 11. Siguiente acción exacta

```txt
1. Registrar contrato 1.0.17.
2. Ejecutar preflight vinculante.
3. Ejecutar el mismo gate una sola vez.
4. Aceptar únicamente resultado sanitizado ok:true.
```

Si vuelve a fallar:

```txt
NO REINTENTAR
LEER failureStage + error + runtimeOwnerDiagnostics + routerRuntimeContracts
CLASIFICAR LA CAUSA EXACTA
NO TOCAR DATOS, REGLAS O RENDERERS SIN EVIDENCIA
```

Solo después de `ok:true` corresponde la revisión visual única y el cierre de M1.
