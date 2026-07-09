# Matriz — fuentes reales recibidas y faltantes A&S

Fecha: 2026-07-09  
Proyecto: Orbit 360 A&S  
Rama activa: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open, sin merge, sin deploy, sin main.

## Propósito

Aterrizar el carril de migración real para que el proyecto no siga solo en arquitectura abstracta.

Esta matriz no sube datos reales al repo. Solo documenta inventario, destino, bloqueos y siguiente fuente a pedir.

## Fuentes reales recibidas

| Fuente | Estructura detectada | País/moneda esperada | Destino Orbit 360 | Qué sí aporta | Qué NO debe hacer |
|---|---|---|---|---|---|
| `Directorio Aseguradoras Guatemala 2026.xlsx` | 18 hojas: Índice, aseguradoras GT, diagnóstico, T&A, Tech. Dimensiones visibles: Índice B1:H50; aseguradoras con rangos aprox. B1:H/J. | GT / GTQ cuando aplique pagos/cuentas | `aseguradoras`, `contactos_aseguradora`, `configuracion_catalogo`, `cuentas_pago_aseguradora`, `pendientes_configuracion` | Directorio, contactos, áreas, teléfonos, emergencias, links, cuentas/accesos como referencia. | No crear pólizas, clientes, cartera o cobros. No guardar credenciales reales en frontend. |
| `Directorio - Aseguradoras Colombia 2024.xlsx` | 17 hojas: Índice, Synergias, Solidaria, AXA, Estado, HDI, Equidad, Chub/Chubb, SMI, Previsora, SBS, Zurich, Mapfre, Bolivar, Qualitas, Solidaria 1.0. | CO / COP cuando aplique pagos/cuentas | `aseguradoras`, `contactos_aseguradora`, `configuracion_catalogo` | Directorio CO, contactos, teléfonos, asistencias, referencias de aseguradoras/intermediarios. | No crear pólizas, clientes, cartera o cobros. No subir secretos. |
| `Movimientos Ing y Eg Alianzas Guate y Col 2026.xlsx` | 44 hojas mensuales GT/CO desde Nov 2024 a May 2026 aprox. Rangos típicos 300-360 filas. | GT→GTQ, CO→COP | `financiero_historico`, `finmovs` | Histórico financiero: ingresos/egresos, conceptos, pagador, clasificación, valor, impuestos, observaciones, saldos. | No crear clientes/pólizas/cartera/cobros pagados. No mezclar monedas. No inferir producción. |
| `AyS — Calendario Maestro Contenidos 2026 — Flujo híbrido.xlsx` | 1 hoja: Cronograma 90D. | No monetaria | `marketing_calendario`, `plantillas`, `campanas` | Calendario de contenidos, tareas, piezas, campañas. | No simular publicación real ni integraciones activas. |
| `Manual de Identidad Básica – Versión 1 – Vigente.docx` | Manual marca GT/CO. | No monetaria | `configuracion_marca`, `academia_marketing`, `manuales` | Paleta, tono, tipografías, voz, reglas Registro SIB CS-254. | No hardcodear A&S en core; debe ser configuración tenant. |
| `Logo V. 2026.jpeg` | Imagen marca cliente. | No monetaria | `tenant.logo`, slot white-label | Logo cliente para A&S. | No reemplazar marca Orbit 360 del chrome. |
| `comparativo_final_v110.html` | HTML avanzado Cotizador/Comparativo A&S. | GT/CO según configuración | `cotizador`, `comparativo`, `tarifas_configurables` | Fuente avanzada para integrar módulo aislado configurable. | No hardcodear tarifas reales en core. No mezclar moneda. No presentar emisión real. |

## Fuentes faltantes para operar con datos reales

| Orden | Fuente faltante | Para qué sirve | Colección destino | Regla crítica | Estado |
|---:|---|---|---|---|---|
| 1 | Clientes | Base maestra de personas/empresas | `clientes` | Deduplicar; no inferir desde finmovs | Pedir a Paula |
| 2 | Pólizas | Crear expediente, vigencias, estados, primas | `polizas`, `recibos` si procede | País/moneda/estado obligatorios | Pedir después de clientes |
| 3 | Vehículos | Relación auto/póliza/cliente | `vehiculos` | No inferir sin fuente | Pedir si no viene en pólizas |
| 4 | Recibos/cobros realizados | Cartera/cobros reales | `cobros_realizados`, `cobros` | Cobros != finmovs | Pedir después de pólizas |
| 5 | Planilla aseguradora | Estado de cuenta por aseguradora | `planilla_aseguradora`, conciliación propuesta | No marcar pagado directo | Pedir después de cobros |
| 6 | Planilla comisiones | Comisiones reales | `planilla_comisiones`, `comisiones` | Leer filas reales, no simular tarifas | Pedir después de pólizas/cobros |
| 7 | Estado cuenta bancario | Conciliación bancaria | `estado_cuenta_bancario`, conciliación | No escribir cobros sin conciliación | Pedir cuando exista cobros/cartera |
| 8 | Siniestros | Reclamos y bitácora | `siniestros` | No crear póliza/cliente si falta vínculo | Pedir posterior |
| 9 | Documentos soporte | Propuestas/diffs | `documentos`, `parchesPendientes` | No aplicar datos automáticamente | Pedir posterior |

## Siguiente fuente a pedir

La siguiente fuente real debe ser:

```txt
CLIENTES
```

Formato ideal:

```txt
Excel o CSV con una fila por cliente.
```

Columnas deseables:

```txt
nombre/razon_social
nit/dpi/documento
pais
tipo_cliente
telefono
correo
direccion
ciudad
asesor
estado
observaciones
```

Si no existe país explícito, se marcará `REQUIERE_VALIDACION`; no se escribirá operación real.

## Resultado esperado del siguiente bloque

```txt
1. Inventario del archivo clientes.
2. Columnas detectadas.
3. Calidad de datos.
4. Duplicados probables.
5. Mapeo a Orbit 360.
6. Dry-run: crear/actualizar/omitir.
7. Preguntas mínimas a Paula.
```

## Estado

Matriz inicial creada. Pendiente recibir archivo real de clientes para iniciar migración operativa.