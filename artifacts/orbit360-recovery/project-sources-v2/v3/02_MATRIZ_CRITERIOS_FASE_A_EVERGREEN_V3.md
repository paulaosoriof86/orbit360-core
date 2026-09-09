# Matriz Evergreen de Criterios Fase A V3

Esta matriz define **qué debe probarse**. No contiene estado operativo actual.

| Capability | Criterios mínimos de aceptación Preview/Live |
|---|---|
| Login | entrypoint/login exacto; membresía/tenant; rol asignado fail-closed; sign-in/session/reload; 0 errores; responsive móvil |
| Roles/scopes | policy/owner exactos; scoped read-model; rol realmente asignado; sin leakage; cambio de rol permitido; regresión de módulos dependientes |
| Shell/router/nav | único index productivo; rutas Fase A alcanzables; navegación por rol; reload; 0 404; sin LAB/seeds/auth-LAB productivos |
| Startup/PWA/performance | hidratación esencial; primer render; no esperar SW; no módulos no esenciales bloqueando; sin timeouts 30/120 s como flujo normal |
| Inicio | última UI/KPIs aprobados; datos bajo corte rector; scopes; acciones; relaciones Cliente/Póliza/Cobros; responsive y 0 errores |
| Cliente 360 | lista/ficha/UI; scopes; paginación y DOM coherentes con read-model scoped; filtros; reload; cliente→póliza→vehículo; KPIs con semántica aprobada |
| Vehículos | detalle de última versión aprobada; datos reales; scopes; ficha/navegación; relación cliente/póliza; persistencia; responsive |
| Relaciones transversales | IDs/joins canónicos; navegación cruzada; scopes en ambos extremos; sin joins por nombre; persistencia cuando aplique |
| Aseguradoras | directorio/ficha; aseguradoras reales; Dirección/SuperAdmin/AdminTenant/Admin/Operativo completos; Asesor restringido; copiar/editar aprobado; 0 errores |
| Directorio operativo Aseguradoras | usuario + reveal/copy seguro + portales/cuentas; `credentialRef`; provider/callable aprobado; backend autoritativo; sin secretos persistentes |
| Ops | board/UI; gestiones; scopes; write callable/transport aprobado; persistencia/reload; sincronización con Leads |
| Leads | board/UI; ciclo/transiciones; scopes; write contract; persistencia/reload; sincronización con Ops |
| Pólizas | tabla/ficha; pólizas reales; scopes; acciones/reload; cliente/vehículo; cálculo financiero; golden invariants; no filas sintéticas no autorizadas |
| Recibos/Cartera | lineage financiero independiente; `recibosEsperados` y `carteraPrimas` distintos; joins por IDs; estados aprobados; no remap a Cobros |
| Cobros | lineage independiente; eventos/evidencia real; scopes; conciliación/write contract; relaciones cartera/póliza/cliente; no cobro ficticio |

## Criterios transversales obligatorios

Toda capability debe ligar su evidencia a:

- última aceptación y lineage lock;
- source/blob SHA;
- owner/dependencias;
- buildId/artifact/digests aplicables;
- ruta/carga/assets ejecutados;
- datos y corte rector;
- roles/permisos backend;
- acción/persistencia/reload;
- relaciones;
- 0 errores HTTP/page/console relevantes;
- responsive;
- mismo release identity.

## Estados finales válidos

- `LATEST_APPROVED_VERSION_PREVIEW_PASS`
- `LATEST_APPROVED_VERSION_LIVE_PASS`

`PROBE_PASS_NOT_CAPABILITY_CLOSED` y estados parciales son evidencia, no aceptación final.

## Contratos especiales

### Aseguradoras
Privilegiados: Dirección, SuperAdmin, AdminTenant/Admin y Operativo. Asesor restringido. UI hiding no es seguridad.

### Recibos/Cartera/Cobros
Colecciones y semánticas separadas. Prohibido remap o cobro ficticio.

### Pólizas
Golden record `AUTO39012`: `primaNeta Q 1,800` y `primaTotal Q 2,678.53` mientras siga válido. Verificar prima neta, asistencias, gastos, impuestos, prima total, pago/fraccionamiento y excepciones aprobadas.

### Relaciones
Cliente <-> Póliza <-> Vehículo y demás relaciones usan IDs canónicos.

### Performance
Login/primer render no esperan service worker ni dependencias no esenciales.

## Invalidación causal

Una capability previamente certificada solo se reabre cuando:

- cambia su owner/dependencia/contrato;
- cambia product source que la afecta;
- existe regresión reproducible;
- una `LINEAGE_EXCEPTION` la afecta.

Las demás evidencias se preservan.
