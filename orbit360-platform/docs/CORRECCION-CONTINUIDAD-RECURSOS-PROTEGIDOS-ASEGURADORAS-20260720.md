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

## Verificación del binding

El runtime conserva los contratos para revelado temporal, copia, rol activo y auditoría. Sin embargo, no existe en el repositorio un adaptador registrado que conecte esos contratos con un proveedor real.

La implementación P0.2 dejó expresamente el proveedor seguro real como pendiente de conexión. El inventario adicional de solo lectura, run `29725454867`, no pudo enumerar Secret Manager, Functions o Cloud Run porque la cuenta de GitHub Actions no posee permiso de listado general. Ese resultado no demuestra ausencia de recursos externos y no autoriza solicitar nuevamente permisos o recrear infraestructura.

Conclusión operativa:

- la UI y la política existen;
- las 26 fichas no tienen valores ni referencias;
- el repositorio no contiene el binding;
- cualquier recurso externo existente debe enlazarse por su referencia concreta, no descubrirse mediante permisos globales.

## Clasificación correcta

`DATA_CONTRACT_FAILURE`

La carga inicial conservó el directorio operativo, pero omitió el lote separado de recursos protegidos. No es una falta de Firebase, Hosting, Auth ni del canal LAB. Tampoco justifica reimportar las 26 Aseguradoras o volver a pedir los directorios.

## Owner existente preservado

Se mantienen los contratos y vistas ya implementados para:

- revelado temporal;
- copia controlada;
- permisos Dirección/Admin/Operativo;
- denegación para Asesor;
- auditoría sin valores;
- referencias opacas.

No se crea otro owner ni otra vista paralela.

## Siguiente acción exacta

1. resolver la referencia concreta del proveedor seguro ya creado, sin volver a pedir permisos generales;
2. aplicar el dry-run sanitizado ya producido;
3. generar 41 referencias opacas directas y 4 bajo control de alias solo después de confirmación del proveedor;
4. mantener 24 portales sin credencial;
5. enviar 7 registros a validación y omitir 1 encabezado;
6. actualizar únicamente referencia, estado y trazabilidad;
7. validar Dirección desktop, Operativo tablet y denegación Asesor móvil;
8. ejecutar una sola vez el gate M1 únicamente si cambia el runtime evaluado.

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

- A: owner visual existente; pendiente validación con referencias reales.
- B: enlazar el proveedor existente por referencia concreta; no crear infraestructura paralela.
- C: dry-run de la fuente separada cerrado; pendiente aplicación controlada de referencias.

## Clasificación para continuidad

- `REPLICABLE_CLAUDE_ACUMULADO`: estados, permisos y experiencia de uso.
- `BACKEND_PROTEGIDO_NO_CLAUDE`: binding y resolución de referencias.
- `SECRETO_DATO_REAL`: valores y filas de la fuente.
