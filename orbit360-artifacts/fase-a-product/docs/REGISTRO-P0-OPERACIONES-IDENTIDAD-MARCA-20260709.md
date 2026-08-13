# Registro P0 - Identidad de marca / manual / logo

Fecha: 2026-07-09
Carril: C con soporte B
Estado: implementado aditivo, sin escritura real

## Fuente real de referencia

- Manual de Identidad Basica - Version 1 - Vigente.docx
- Logo V. 2026.jpeg

No se sube payload real al repositorio. No se incrustan logos reales en codigo. No se hardcodea el tenant como variante de producto.

## Objetivo

Preparar una fuente segura de configuracion white-label para que manuales, logos y lineamientos de marca alimenten Orbit 360 por configuracion, no por bifurcacion de codigo.

## Archivos agregados

```txt
orbit360-platform/core/importa-identidad-marca-p0.js
tools/orbit360-test-importa-identidad-marca-p0.mjs
```

## Archivos modificados

```txt
orbit360-platform/core/importa-dryrun-p0.js
orbit360-platform/modules/importar.js
.github/workflows/orbit360-p0-smoke.yml
```

## Destinos permitidos

```txt
configuracionCatalogo
documentos
gestiones
```

## Destinos bloqueados

```txt
clientes
polizas
cobros
recibosEsperados
carteraPrimas
finmovs
cxcComisiones
cxpAsesores
usuarios
roles
permisos
credenciales
```

## Operaciones propuestas

El builder puede proponer configuracion para:

- nombre visible del tenant/cliente;
- slot de logo white-label;
- color primario;
- color secundario;
- tipografias;
- version/uso del manual;
- material fuente para Academia;
- gestion de revision cuando la fuente incluya campos sensibles.

## Reglas de seguridad

- El logo no se convierte en archivo embebido en codigo.
- La configuracion queda como propuesta de configuracionCatalogo.
- Cualquier campo sensible de la fuente se bloquea y se transforma en gestion segura con referencia backend_required.
- El dry-run exige tenantId para que la configuracion sea aprobable.
- La escritura real sigue bloqueada hasta dry-run aprobado y confirmacion reforzada.

## Academia

La fuente queda contemplada como material para Academia mediante la clave academia.identidad.material_fuente.

Debe traducirse luego a rutas por rol/vista activa, con lecciones sobre:

- uso de marca Orbit 360 vs marca cliente;
- logo cliente como slot white-label;
- limites de personalizacion por configuracion;
- no bifurcar codigo por cliente;
- no exponer accesos en UI.

## Estado

```txt
P0_IDENTIDAD_MARCA_IMPLEMENTADO_ADITIVO_PENDIENTE_SMOKE_VISIBLE
```

No hay merge, deploy ni escritura real.