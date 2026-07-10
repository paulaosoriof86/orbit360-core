# Plan lote inicial — 11 fuentes A&S P0.9d

Fecha: 2026-07-10  
Tenant: Alianzas y Soluciones  
Estado: `LOTE_DEFINIDO / FILE_REFS_PRODUCTIVAS_PENDIENTES / SOLO_DRY_RUN`

## 1. Objetivo

Procesar desde Aseguradoras las once fuentes reales ya auditadas, conservando separación por aseguradora, producto, vehículo/riesgo, versión y tipo de documento.

Este documento define el lote. No contiene rutas locales, hashes completos, tasas, PII ni IDs internos definitivos.

## 2. Fuentes Excel

| # | Fuente | Aseguradora propuesta | Producto/familia | Tipo | Estado inicial |
|---:|---|---|---|---|---|
| 1 | `COTIZADOR BAM 2025 vehiculos seg. completo pr..xlsx` | BAM | Vehículos | Cotizador Excel con salida | Requiere validación |
| 2 | `Cotizador BAMSALUD 2025.xlsx` | BAM | Gastos Médicos | Cotizador Excel con salida | Requiere validación |
| 3 | `COTIZADOR V13. CORREDORES.xlsx` | Bantrab | Autos | Cotizador Excel con salidas por plan | Requiere validación |
| 4 | `COTIZADOR MOTO - INTERMEDIARIO 2024.xlsx` | Bantrab | Motocicletas | Cotizador Excel independiente | Requiere validación |
| 5 | `Cotizador VA 2026 V1.4.xlsx` | Columna, sujeto a directorio | Vehículos | Cotizador Excel dinámico | Requiere validación nombre |
| 6 | `Tasas AseGuate.xlsx` | Aseguradora Guatemalteca | Vehículos | Tarifario Excel sin presentación completa | Requiere validación |
| 7 | `Mi Carro Seguro Cotizador Banrural.xlsx` | Banrural | Autos | Cotizador Excel con salida | Requiere validación |
| 8 | `Cotizador Gastos Médicos Individual 2025.xlsx` | Banrural/Aseguradora Rural, sujeto a directorio | Gastos Médicos individual/familiar | Cotizador Excel con planes | Requiere validación relación |

## 3. Fuentes PDF

| # | Fuente | Aseguradora propuesta | Producto/variante | Tipo | Estado inicial |
|---:|---|---|---|---|---|
| 9 | Cotización oficial AseGuate automóvil | Aseguradora Guatemalteca | Automóvil | Cotización PDF oficial | Requiere validación |
| 10 | Cotización oficial AseGuate microbús hasta nueve pasajeros | Aseguradora Guatemalteca | Microbús | Cotización PDF oficial | Requiere validación |
| 11 | Cotización Riesgo Plus | Seguros Universales | Vehículo/Riesgo Plus | Cotización PDF oficial | Requiere validación |

## 4. Agrupación prevista

```text
BAM
├─ Vehículos Excel
└─ Salud Excel

Bantrab
├─ Autos Excel
└─ Motos Excel

Columna
└─ Vehículos Excel

Aseguradora Guatemalteca
├─ Tarifario Excel
├─ PDF automóvil
└─ PDF microbús

Banrural / Aseguradora Rural
├─ Autos Excel
└─ Gastos Médicos Excel

Seguros Universales
└─ PDF Riesgo Plus
```

Esta agrupación es una propuesta de lote. Los IDs definitivos se resuelven contra el directorio A&S antes de ejecutar.

## 5. Validaciones previas obligatorias

Cada ítem debe completar:

```text
tenantId
aseguradoraId del directorio
fileRef autorizada
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

## 6. Casos que requieren validación específica

### Columna

Confirmar que el nombre del directorio corresponde a la fuente `Cotizador VA 2026 V1.4.xlsx` y no a una entidad distinta o alias incompleto.

### Banrural / Aseguradora Rural

Confirmar si los productos de Autos y Gastos Médicos pertenecen a una misma entidad del directorio, a aliases de una misma aseguradora o a registros separados.

### AseGuate

Los PDFs de automóvil y microbús se vinculan a la familia de presentación, pero no habilitan el cálculo automático. El tarifario permanece incompleto para reconciliar gastos, IVA, asistencia y financiamiento.

### Seguros Universales

El PDF puede alimentar presentación externa y Comparativo después de validación, pero no Cotizador automático sin tarifa validada.

## 7. Orden de dry-run

1. AseGuate tarifario — control de referencia/runner ya probado en store aislado.
2. AseGuate PDF automóvil.
3. AseGuate PDF microbús.
4. BAM Vehículos.
5. Bantrab Autos.
6. Bantrab Motos.
7. Columna Vehículos.
8. Banrural Autos.
9. BAM Salud.
10. Banrural Salud.
11. Seguros Universales PDF.

El orden prioriza una familia Excel+PDF ya conocida y después los cotizadores vehiculares y de Salud más complejos.

## 8. Salida esperada por fuente

```text
referencia resuelta
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

## 9. Criterio de lote exitoso

El lote se considera preparado cuando:

- 11 referencias están autorizadas;
- 11 aseguradoras/documentos están correctamente asociados;
- no existen duplicados de documento/versión;
- todos los manifiestos son metadata-only;
- PII y secretos están ausentes;
- cada fuente aparece en su ficha;
- el read model coincide con las colecciones profundas;
- toda fuente queda pendiente de revisión;
- cero bindings quedan habilitados.
