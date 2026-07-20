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
2. tratar el lote como fuente separada `accesos_aseguradoras`, no como reimportación del directorio;
3. producir dry-run sanitizado por país, aseguradora y portal;
4. generar referencias opacas solo después de confirmación del proveedor;
5. actualizar únicamente referencia, estado y trazabilidad;
6. validar Dirección desktop, Operativo tablet y denegación Asesor móvil;
7. ejecutar una sola vez el gate M1 únicamente si cambia el runtime evaluado.

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
- C: migración separada desde los directorios GT/CO, con trazabilidad y sin exposición.

## Clasificación para continuidad

- `REPLICABLE_CLAUDE_ACUMULADO`: estados, permisos y experiencia de uso.
- `BACKEND_PROTEGIDO_NO_CLAUDE`: binding y resolución de referencias.
- `SECRETO_DATO_REAL`: valores y filas de la fuente.
