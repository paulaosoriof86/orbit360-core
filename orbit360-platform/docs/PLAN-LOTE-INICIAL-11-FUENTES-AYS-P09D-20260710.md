# Plan lote inicial — 11 fuentes A&S P0.9d/P0.10

Fecha: 2026-07-10  
Tenant: Alianzas y Soluciones  
Estado: `IDENTIDADES_RESUELTAS / ASIGNACION_IDS_AUTOMATICA / FILE_REFS_GENERADAS_POR_BACKEND / SOLO_DRY_RUN`

## 1. Objetivo

Procesar desde Aseguradoras las once fuentes reales ya auditadas, conservando separación por aseguradora, producto, vehículo/riesgo, versión y tipo de documento.

Este documento define el lote. No contiene rutas locales, hashes completos, tasas, PII, secretos ni IDs de infraestructura.

## 2. Identidades definitivas del lote

Las once fuentes se agrupan en seis aseguradoras:

1. Seguros BAM.
2. Bantrab.
3. Seguros Columna.
4. Aseguradora Guatemalteca (AseGuate).
5. Aseguradora Rural (Banrural).
6. Seguros Universales.

Decisiones cerradas:

- `Banrural` es el nombre de uso común de `Aseguradora Rural`; ambos apuntan a la misma entidad.
- Los archivos de Autos y Gastos Médicos Banrural se asocian a Aseguradora Rural.
- `Cotizador VA 2026 V1.4.xlsx` corresponde a Seguros Columna.
- Los IDs se resuelven internamente; no deben ser digitados por la usuaria.
- Cuando existe un ID en el directorio del tenant, este prevalece.
- Si aún no existe, Orbit usa un ID interno estable y deja pendiente únicamente su vinculación al directorio, sin duplicar la aseguradora.

## 3. Fuentes Excel

| # | Fuente | Aseguradora definitiva | Producto/familia | Tipo | Estado inicial |
|---:|---|---|---|---|---|
| 1 | `COTIZADOR BAM 2025 vehiculos seg. completo pr..xlsx` | Seguros BAM | Vehículos | Cotizador Excel con salida | Requiere validación |
| 2 | `Cotizador BAMSALUD 2025.xlsx` | Seguros BAM | Gastos Médicos | Cotizador Excel con salida | Requiere validación |
| 3 | `COTIZADOR V13. CORREDORES.xlsx` | Bantrab | Autos | Cotizador Excel con salidas por plan | Requiere validación |
| 4 | `COTIZADOR MOTO - INTERMEDIARIO 2024.xlsx` | Bantrab | Motocicletas | Cotizador Excel independiente | Requiere validación |
| 5 | `Cotizador VA 2026 V1.4.xlsx` | Seguros Columna | Vehículos | Cotizador Excel dinámico | Identidad confirmada; reglas por validar |
| 6 | `Tasas AseGuate.xlsx` | Aseguradora Guatemalteca | Vehículos | Tarifario Excel | Componentes financieros confirmados; reglas por validar |
| 7 | `Mi Carro Seguro Cotizador Banrural.xlsx` | Aseguradora Rural (Banrural) | Autos | Cotizador Excel con salida | Requiere validación |
| 8 | `Cotizador Gastos Médicos Individual 2025.xlsx` | Aseguradora Rural (Banrural) | Gastos Médicos individual/familiar | Cotizador Excel con planes | Requiere validación |

## 4. Fuentes PDF

| # | Fuente | Aseguradora definitiva | Producto/variante | Tipo | Estado inicial |
|---:|---|---|---|---|---|
| 9 | Cotización oficial AseGuate automóvil | Aseguradora Guatemalteca | Automóvil | Cotización PDF oficial | Presentación por validar |
| 10 | Cotización oficial AseGuate microbús hasta nueve pasajeros | Aseguradora Guatemalteca | Microbús | Cotización PDF oficial | Presentación por validar |
| 11 | Cotización Riesgo Plus | Seguros Universales | Vehículo/Riesgo Plus | Cotización PDF oficial | Presentación por validar |

## 5. Agrupación definitiva

```text
Seguros BAM
├─ Vehículos Excel
└─ Salud Excel

Bantrab
├─ Autos Excel
└─ Motos Excel

Seguros Columna
└─ Vehículos Excel

Aseguradora Guatemalteca (AseGuate)
├─ Tarifario Excel
├─ PDF automóvil
└─ PDF microbús

Aseguradora Rural (Banrural)
├─ Autos Excel
└─ Gastos Médicos Excel

Seguros Universales
└─ PDF Riesgo Plus
```

## 6. IDs internos y directorio

El adapter P0.10 resuelve cada fuente mediante:

```text
nombre legal
+ alias
+ nombre de uso común
+ pista del nombre del archivo
+ país
+ directorio del tenant
```

Ejemplos:

```text
Banrural → Aseguradora Rural
Aseguradora Rural → Aseguradora Rural
Mi Carro Seguro Cotizador Banrural.xlsx → Aseguradora Rural
Cotizador Gastos Médicos Individual 2025.xlsx → Aseguradora Rural
Cotizador VA 2026 V1.4.xlsx → Seguros Columna
```

La usuaria no debe crear ni suministrar IDs. Orbit usa:

1. ID del directorio, cuando ya existe.
2. ID interno estable, mientras se vincula el directorio.

## 7. Qué significa `fileRef` o referencia autorizada

Una referencia autorizada es un identificador backend del archivo, por ejemplo:

```text
drive://tenant/documento
upload://tenant/documento
backend-ref://tenant/documento
```

No es una ruta que la usuaria deba escribir ni preparar.

La plataforma la genera automáticamente cuando:

- se selecciona un archivo de Drive;
- se carga un archivo desde la plataforma;
- el backend monta temporalmente una fuente autorizada.

El frontend conserva la referencia lógica. La ruta local, token o URL temporal permanecen exclusivamente en backend.

Por tanto, las referencias productivas son una tarea de integración técnica, no un dato pendiente de Paula.

## 8. Validaciones previas obligatorias

Cada ítem debe completar automáticamente o mediante revisión:

```text
tenantId
aseguradoraId resuelto
fileRef generada por backend
documentId
sourceHash
versionFuente
país
moneda
ramo/producto
tipoVehiculo/tipoRiesgo/plan cuando aplica
task permitida
purpose
```

## 9. AseGuate — actualización financiera

Quedó confirmado:

```text
Gastos de emisión = 5% de prima neta
IVA = 12% del subtotal gravable previo al impuesto
```

Los dos ejemplos oficiales reconcilian con esta composición cuando se incluyen la prima y asistencia correspondientes a la variante.

Esto cierra el bloqueo de gasto de emisión e IVA, pero no habilita todavía Cotizador automático. Permanecen:

- mapeo exacto de bloque tarifario a plan/vehículo;
- alcance del financiamiento;
- validación de regla y presentación;
- persistencia del binding real;
- segundo gate.

## 10. Orden de dry-run

1. AseGuate tarifario.
2. AseGuate PDF automóvil.
3. AseGuate PDF microbús.
4. Seguros BAM Vehículos.
5. Bantrab Autos.
6. Bantrab Motos.
7. Seguros Columna Vehículos.
8. Aseguradora Rural Autos.
9. Seguros BAM Salud.
10. Aseguradora Rural Gastos Médicos.
11. Seguros Universales PDF.

El orden prioriza una familia Excel+PDF ya conocida y después los cotizadores vehiculares y de Salud más complejos.

## 11. Salida esperada por fuente

```text
referencia resuelta
aseguradora resuelta
manifiesto generado
mapping/propuesta creada
fuente visible en Aseguradoras
warnings/conflictos
read model actualizado
auditoría
estado requiere_validacion
```

No se espera:

```text
regla habilitada
Cotizador activo
Comparativo activo
integración conectada sin backend
```

## 12. Criterio de lote exitoso

El lote se considera preparado cuando:

- las 11 fuentes resuelven a las seis aseguradoras definidas;
- las referencias son emitidas por backend;
- no existen duplicados de documento/versión;
- todos los manifiestos son metadata-only;
- PII y secretos están ausentes;
- cada fuente aparece en su ficha;
- el read model coincide con las colecciones profundas;
- toda fuente queda pendiente de revisión;
- cero bindings quedan habilitados.

## 13. Estado actual

```text
identidades del lote: resueltas
alias Banrural/Rural: resuelto
Columna: resuelto
IDs: automáticos
fileRef: pendiente de integración backend, no de la usuaria
composición financiera AseGuate: confirmada
lote ejecutado en Firestore LAB: no
Cotizador/Comparativo: deshabilitados
```