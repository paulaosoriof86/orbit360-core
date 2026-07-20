# Estado vigente M1 — 2026-07-20

Repositorio: `paulaosoriof86/orbit360-core`
Rama: `ays/backend-tenant-lab-v99-20260703`
PR: #5 draft/open
Producción: no autorizada

## Estado confirmado

- Bloque 0 cerrado con `GO_STATIC_ARCHITECTURE`.
- Gate funcional Cliente 360 + Aseguradoras aprobado previamente.
- Revisión visual realizada.
- 414 clientes, 26 aseguradoras y 77 portales preservados.
- IAM resuelto.
- Cuatro Functions del proveedor seguro activas.
- Acceso anónimo bloqueado.
- Hosting LAB disponible.

## Intentos de carga desde navegador

### Primer intento

Clasificación: `DATA_CONTRACT_FAILURE / PROVIDER_NOT_INVOKED`.

El flujo descartaba todos los accesos por alertas generales del directorio y permitía mostrar éxito con cero. No hubo escritura en bóveda ni referencias opacas.

### Segundo intento

La interfaz bloqueó honestamente el falso éxito y mostró `confirmacion_remota_incompleta`.

Auditoría posterior:

- eventos remotos: 0;
- ítems almacenados: 0;
- referencias opacas: 0;
- datos expuestos: 0.

Clasificación: `DATA_CONTRACT_FAILURE / TARGET_MAPPING_EMPTY_BEFORE_PROVIDER`.

Causa raíz: el dry-run conocía la aseguradora existente, pero esa relación no llegaba al lote sensible. El proveedor filtraba los registros sin `insurerId` y `portalId` antes de invocar la Function.

## Corrección vigente

Se añadió el puente separado:

`core/insurer-secure-target-bridge-v20260720.js`

Propiedades:

- añade únicamente IDs internos de aseguradora y portal;
- no lee, registra ni persiste valores protegidos;
- vincula por nombre normalizado, host público único o trazabilidad/posición existente;
- no crea aseguradoras ni portales;
- no fuerza coincidencias ambiguas;
- se carga después del proveedor seguro y antes del Router.

Publicación confirmada:

- run: `29766099957`;
- resultado: `success`;
- preflight: aprobado;
- sintaxis y marcadores: aprobados;
- Hosting LAB: publicado;
- puente y bootstrap: recuperados y verificados desde el canal.

## Siguiente acción exacta

1. Recargar el canal LAB con `Ctrl + Shift + R`.
2. Repetir una sola vez la carga exclusiva de accesos de Guatemala.
3. Repetir una sola vez la carga exclusiva de accesos de Colombia.
4. Aceptar solo resultados con cantidad positiva.
5. Ejecutar verificación read-only de conteos, referencias, bóveda, ausencia de secretos y roles.
6. Ejecutar una sola vez el gate final M1.
7. Cerrar M1 e iniciar Bloque 2: bootstrap productivo read-only.

## Restricciones

No reimportar el directorio general. No avanzar a Pólizas, Cobros, merge, `main`, producción o DNS antes del cierre final de M1.
