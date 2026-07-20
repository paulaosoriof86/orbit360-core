# Bloque 1 · Credenciales de Aseguradoras · proveedor seguro bloqueado por IAM

Fecha: 2026-07-20  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open  
Gate: `block1-client360-insurers-lab-v20260717`

## Necesidad

Los directorios canónicos de aseguradoras contienen credenciales operativas completas y parciales. Dirección y Operativo necesitan consultar usuario y contraseña mediante **Ver temporalmente** y **Copiar acceso seguro**. El estado `Vinculación segura pendiente` no es aceptable cuando la fuente sí contiene una credencial completa.

## Clasificación

- `DATA_CONTRACT_FAILURE`: el importador detectó credenciales, pero conservó únicamente `backend_required` porque no había proveedor seguro.
- `FUNCTIONAL_DEFECT`: los controles cotidianos quedaron deshabilitados aunque la fuente contenía valores.
- `SECURITY_FAILURE_AVOIDED`: los secretos no fueron persistidos en Firestore, Orbit.store, GitHub ni evidencia.
- `ENVIRONMENT_FAILURE`: la cuenta de despliegue LAB no puede listar/habilitar APIs ni consultar IAM.

## Causa raíz funcional

El importador especializado:

1. extraía usuario/contraseña a una sesión temporal;
2. escribía en la ficha solamente una referencia genérica;
3. llamaba al proveedor sin esperar confirmación remota;
4. destruía la sesión sensible al finalizar.

Al no existir `Orbit.secureImport.importInsurerDirectory`, nunca se generó una referencia opaca verificable y los botones permanecieron bloqueados.

## Implementación preparada

### Backend protegido

- `functions/package.json`
- `functions/index.js`
- `firebase.json`

Endpoints callable preparados:

- `orbit360ImportInsurerCredentials`
- `orbit360CredentialStatus`
- `orbit360RevealInsurerCredential`
- `orbit360CopyInsurerCredential`

Reglas:

- tenant e identidad LAB exactos;
- membership activa;
- rol activo incluido en roles asignados;
- Dirección/Admin importan;
- Dirección/Admin/Operativo consultan;
- Asesor permanece bloqueado salvo permiso extra explícito;
- secretos en Secret Manager, nunca Firestore;
- referencias opacas `cred_*` en la ficha;
- auditoría sin valores;
- revelado temporal y copia auditada.

### Frontend reusable

- `orbit360-platform/core/aseguradoras-credentials-provider-lab-v20260720.js`
- `orbit360-platform/core/router-tenant-config-bootstrap.js`

El proveedor:

- se carga antes del Router;
- registra `Orbit.secureResources` y `OrbitSensitiveProvider`;
- resuelve trazabilidad por aseguradora/hoja/portal;
- espera confirmación remota;
- solo entonces cambia `backend_required` por referencia opaca;
- limpia usuario/contraseña de memoria;
- no muestra éxito sin confirmación.

## Evidencia del contrato

Preflight aislado vinculante:

- run `29719920500`;
- artefacto `8451960611`;
- contrato `1.0.27`;
- estado `GO_GATE_CONTRACT`;
- `914/914` checks;
- cero fallos;
- sin PII ni secretos.

## Evidencia del bloqueo IAM

Deploy controlado:

- run `29721448348` · commit `c5804d778bd5bae37097538abc85ce07ccf1f56c`;
- run `29721694781` · commit `352a6137ab9172c431efe775ea4ba143eb13d709`;
- misma fase: `enable_required_apis`;
- mismo código: `exit 1`;
- preflight, sintaxis, dependencias, cuenta LAB y gcloud aprobaron;
- bóveda, cuenta runtime, Functions y Hosting no fueron creados.

Diagnóstico IAM de solo lectura:

- run `29721934508`;
- artefacto `8452686512`;
- no pudo listar servicios habilitados;
- no pudo consultar la política IAM;
- no posee capacidad observable de habilitar servicios;
- causa raíz: `missing_serviceusage_services_enable`;
- no realizó ninguna escritura.

## Intervención mínima externa necesaria

La cuenta de servicio utilizada por GitHub Actions necesita, de forma temporal y en el proyecto `ays-orbit-360-lab`, los permisos mínimos para:

1. habilitar/consultar APIs: `roles/serviceusage.serviceUsageAdmin`;
2. desplegar Functions: `roles/cloudfunctions.admin`;
3. adjuntar identidad runtime: `roles/iam.serviceAccountUser`;
4. crear la cuenta runtime dedicada: `roles/iam.serviceAccountAdmin`;
5. conceder a esa cuenta acceso a Firestore para membership/auditoría: `roles/resourcemanager.projectIamAdmin`;
6. crear y administrar la bóveda y su IAM: `roles/secretmanager.admin`.

No se solicita `roles/owner`.

Después del despliegue, los roles de administración temporal deben retirarse; la cuenta runtime conservará únicamente acceso a Firestore y a la bóveda específica.

## Estado actual

`CODIGO_PREPARADO · PREFLIGHT_OK · NO_DEPLOY · NO_SECRET_MANAGER · NO_FUNCTIONS · NO_HOSTING_NUEVO · CREDENCIALES_NO_MIGRADAS · M1_ABIERTO`

## Siguiente acción exacta

1. conceder una vez los roles mínimos a la cuenta de despliegue LAB;
2. ejecutar una única vez el workflow de proveedor seguro;
3. aceptar exclusivamente artefacto sanitizado `ok:true`;
4. retirar el workflow temporal y los roles administrativos;
5. cargar los dos directorios mediante el importador canónico;
6. confirmar referencias opacas y botones activos;
7. ejecutar el gate M1 una sola vez;
8. revisar visualmente Ver temporalmente/Copiar para Dirección y Operativo y denegación para Asesor.

## Claude y Academia

- `REPLICABLE_CLAUDE_ACUMULADO`: contrato de proveedor, referencias opacas, confirmación remota antes del estado disponible, roles y auditoría sin valores.
- `ACADEMIA_ACTUALIZAR`: enseñar que directorio operativo no significa secreto en texto plano.
- `BACKEND_PROTEGIDO_NO_CLAUDE`: Functions, Secret Manager, IAM, endpoint y despliegue.
- `SECRETO_DATO_REAL`: usuarios, contraseñas, filas, hojas y valores de acceso.
