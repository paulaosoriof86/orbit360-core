# Corrección de continuidad · Recursos protegidos de Aseguradoras

Fecha: 2026-07-20
Rama: `ays/backend-tenant-lab-v99-20260703`
PR: #5 draft/open
Bloque: 1 · Cliente 360 + Aseguradoras

## Estado corregido

El proyecto LAB, Auth, canal Hosting preview y configuración de acceso técnico ya existían y estaban operativos. No corresponde reconstruirlos ni volver a solicitarlos.

La URL vigente es el preview LAB. El PR continúa sin merge, `main` ni go-live productivo.

## Desvío retirado

Se retiró selectivamente una ruta paralela de infraestructura que no pertenecía al bloque activo. La comparación contra el baseline previo confirmó cero diferencias netas en los archivos afectados. No se publicó infraestructura nueva ni se alteraron los datos LAB.

## Evidencia de la fuente

Los directorios GT y CO contienen recursos operativos protegidos. El dry-run canónico decidió excluir sus valores de la carga inicial y convertirlos posteriormente en referencias seguras.

## Evidencia LAB sanitizada

Inventario de solo lectura, run `29724137323`:

- Aseguradoras: 26.
- Portales: 77.
- Recursos directos completos: 0.
- Recursos directos parciales: 0.
- Referencias seguras reales: 0.
- Referencias pendientes: 0.
- Portales utilizables por el owner existente: 0.

La evidencia no recuperó ni publicó valores, nombres, enlaces o identificadores.

## Dry-run de la fuente separada

Se procesaron los directorios GT y CO como fuente independiente `accesos_aseguradoras`, sin conservar ni publicar enlaces, usuarios, claves o valores bancarios.

Resultado:

- registros fuente: 77;
- Guatemala: 40;
- Colombia: 37;
- accesos completos: 51;
- portales con solo enlace: 24;
- registro parcial: 1;
- encabezado sin acceso real: 1;
- ámbito Aseguradora: 72;
- entidad aliada multicompañía: 2;
- configuración general del tenant: 3;
- coincidencias directas: 66;
- registros bajo alias duplicados: 4;
- alias que requieren validación: 2.

Decisiones propuestas:

- 41 listos para crear referencia opaca con proveedor confirmado;
- 4 listos con control explícito de alias;
- 24 permanecen como portales sin credencial;
- 7 requieren validación humana;
- 1 debe omitirse como encabezado.

El total fuente coincide con los 77 portales observados en LAB, pero no significa que deban crearse 77 credenciales. Tres registros son generales del tenant, dos pertenecen a una entidad aliada y uno no es un portal real.

## Verificación del binding y antecedente recuperado

El runtime conserva los contratos para revelado temporal, copia, rol activo y auditoría. Sin embargo, la rama vigente no contiene un adaptador registrado que conecte esos contratos con un proveedor real.

Se recuperó el antecedente exacto del intento anterior:

- commit de diseño/despliegue: `c5804d778bd5bae37097538abc85ce07ccf1f56c`;
- proveedor frontend: `aseguradoras-credentials-provider-lab-v20260720.js`;
- backend: cuatro callable Functions autenticadas;
- almacenamiento propuesto: Secret Manager;
- referencias opacas: `cred_<hash>`;
- permisos por rol activo, membership, tenant y auditoría sin valores;
- aplicación de referencias únicamente después de confirmación remota.

El intento no creó el proveedor. Los runs `29721448348` y `29721694781` se detuvieron en la fase `enable_required_apis`. En ambos resultados quedaron en `false`:

- bóveda;
- cuenta runtime;
- Functions;
- autenticación callable;
- Hosting del proveedor;
- fuente del proveedor verificada.

Por tanto, no existe una implementación parcialmente desplegada que deba descubrirse o reutilizarse. Existe un diseño recuperable, pero el despliegue nunca superó el primer gate de infraestructura.

## Diagnóstico vinculante del principal de despliegue

Run de solo lectura: `29727223471`.
Artefacto: `8454747268`.
Digest: `sha256:8a0d53c29db2b4cf1d35ece4761094eb8ada58600ddb1d85f20c09855e757b05`.

Resultado sanitizado:

- cuenta primaria configurada: presente;
- JSON válido de cuenta de servicio: sí;
- proyecto correcto: sí;
- autenticación: sí;
- permisos consultables: sí;
- cuenta alternativa: ausente;
- cuenta default: ausente;
- puede actualizar Hosting: sí;
- puede habilitar APIs: no;
- puede crear cuenta runtime: no;
- puede administrar IAM de cuenta runtime: no;
- puede modificar IAM del proyecto: no;
- puede crear Secret Manager: no;
- puede administrar IAM de la bóveda: no;
- puede agregar versiones seguras: no;
- puede crear o actualizar Functions: no;
- capaz de desplegar el proveedor completo: no.

## Clasificación de causas

### Causa de datos

`DATA_CONTRACT_FAILURE`

La carga inicial conservó el directorio operativo, pero omitió el lote separado de recursos protegidos. Esto se corrigió metodológicamente mediante el dry-run independiente `accesos_aseguradoras`. No justifica reimportar las 26 Aseguradoras.

### Bloqueo actual

`SECURITY_FAILURE`

La única cuenta configurada en GitHub autentica y publica Hosting, pero carece de los permisos necesarios para crear o desplegar el proveedor seguro. No es un defecto de la UI, del importador, de Firebase Auth, de los directorios ni del gate M1.

Después de dos intentos sobre la misma etapa, se detienen los reintentos. No se crea otro workflow, otro proyecto, otro proveedor o una ruta insegura de almacenamiento.

## Owner existente preservado

Se mantienen los contratos y vistas ya implementados para:

- revelado temporal;
- copia controlada;
- permisos Dirección/Admin/Operativo;
- denegación para Asesor;
- auditoría sin valores;
- referencias opacas.

No se crea otro owner ni otra vista paralela.

## Intervención administrativa única requerida

En el proyecto Google Cloud `ays-orbit-360-lab`, el principal de servicio utilizado por GitHub Actions mediante `FIREBASE_SERVICE_ACCOUNT_ORBIT360_LAB` debe recibir temporalmente las capacidades necesarias para ejecutar el despliegue controlado.

Roles requeridos por el flujo diseñado:

1. `Service Usage Admin` — habilitar las APIs requeridas;
2. `Service Account Admin` — crear y administrar la cuenta runtime dedicada;
3. `Service Account User` — ejecutar Functions con la cuenta runtime;
4. `Project IAM Admin` — asignar a la cuenta runtime su acceso mínimo a Firestore;
5. `Secret Manager Admin` — crear la bóveda y administrar sus permisos/versiones;
6. `Cloud Functions Admin` — crear y actualizar las cuatro Functions;
7. `Firebase Hosting Admin` — conservar la publicación y verificación del canal LAB.

La cuenta ya posee la capacidad de Hosting, pero no las otras seis. No se necesita crear o compartir otra clave. La modificación es de roles del principal existente, no de secretos de GitHub.

Después del despliegue y la evidencia `ok:true`, los permisos administrativos temporales deben reducirse al mínimo operativo permanente.

## Siguiente acción exacta

1. otorgar una sola vez los roles faltantes al principal existente;
2. ejecutar nuevamente el diagnóstico de capacidades una sola vez;
3. aceptar solo `EXISTING_ACCOUNT_CAN_DEPLOY_PROVIDER`;
4. restaurar selectivamente el proveedor recuperado, sin hardcodes productivos ni reemplazo de backend;
5. ejecutar preflight vinculante;
6. crear bóveda, cuenta runtime y cuatro Functions únicamente en LAB;
7. verificar autenticación obligatoria y ausencia de acceso anónimo;
8. publicar el mismo canal LAB;
9. aplicar el dry-run sanitizado:
   - 41 referencias opacas directas;
   - 4 referencias con control de alias;
   - 24 portales sin credencial;
   - 7 registros a validación;
   - 1 encabezado omitido;
10. actualizar únicamente referencia, estado y trazabilidad;
11. validar Dirección desktop, Operativo tablet y denegación Asesor móvil;
12. ejecutar una sola vez el gate M1 porque cambiará el runtime evaluado.

## Producción y dominio

La salida productiva recomendada es mantener Firebase Hosting como origen técnico y conectar un subdominio propio de A&S al sitio productivo. Esto evita subir manualmente un `index.html` aislado y conserva de forma atómica HTML, scripts, estilos, Service Worker, Auth, reglas y rollback.

La conexión del dominio pertenece a Bloque 6 y requiere autorización explícita. No se modifica DNS durante M1.

## Ruta posterior a M1

- Bloque 2: bootstrap productivo read-only.
- Bloque 3: activación productiva del tenant A&S.
- Bloque 4: escritor durable y primera migración limitada a configuración, memberships, 414 clientes y 26 aseguradoras.
- Bloque 5: release candidate y primera visualización productiva A&S.
- Bloque 6: go-live en dominio propio.
- Después del go-live: Pólizas → Vehículos → Recibos/cartera → Cobros → Conciliación → Comisiones → financiero histórico → documentos → Cotizador/Comparativo → demás módulos.

## Carriles

- A: owner visual existente y probado; pendiente validación con referencias reales.
- B: diseño del proveedor recuperado; bloqueado exclusivamente por IAM del principal de despliegue.
- C: dry-run de la fuente separada cerrado; pendiente aplicación controlada después del proveedor.

## Clasificación para continuidad

- `REPLICABLE_CLAUDE_ACUMULADO`: estados, permisos y experiencia de uso.
- `BACKEND_PROTEGIDO_NO_CLAUDE`: Functions, Secret Manager, binding y resolución de referencias.
- `SECRETO_DATO_REAL`: valores y filas de la fuente.
- `TEMPORAL_RETIRO`: workflows diagnósticos de capacidad e identidad, ya retirados.
