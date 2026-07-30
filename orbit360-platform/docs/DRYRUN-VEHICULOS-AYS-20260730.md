# DRY-RUN VEHÍCULOS A&S — 2026-07-30

Tenant: `alianzas-soluciones`  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open  
Estado: `STATIC_DRYRUN_COMPLETE / REAL_WRITE_NOT_AUTHORIZED`

## 1. Fuentes exactas

Se reutilizan exclusivamente las fuentes de Vehículos ya recibidas, separadas del resto de dominios:

- `Autos.xlsx`: 1,041 filas de datos;
- `Autos a partir de julio 2026.xlsx`: 19 filas de datos;
- paquete canónico de Pólizas ya cerrado en `WRITE_PASS`: 1,373 pólizas.

No se reconstruyen vehículos desde finanzas, recibos, cobros ni movimientos. No se solicita nuevamente la historia completa.

Los hashes e IDs privados de Drive quedan congelados en `tools/orbit360-vehicles-source-freeze-v20260730.json`.

## 2. Resultado del perfilado

```text
filas crudas: 1060
identidades fuente tras deduplicar: 1036
grupos duplicados: 18
filas duplicadas adicionales absorbidas: 24
relaciones vehículo–póliza seguras a crear: 1032
calidad pendiente persistible: 60
excluidas: 4
```

Las 4 exclusiones corresponden a filas fuente `Eliminada`. Dos no tienen póliza canónica padre y dos solo podrían enlazarse mediante una coincidencia insegura por número con una vigencia distinta. Ese fallback queda prohibido.

## 3. Relación con Pólizas

El vínculo de Vehículos exige como mínimo número de póliza + vigencia de inicio exacta. Resultado:

```text
1030 -> número + vigencia, único
2 -> número + vigencia + nombre para desambiguación
0 -> fallback solo por número
```

La póliza canónica ya persistida es la autoridad para `clienteId`, `aseguradoraId`, vigencia y estado contractual.

El `Estatus póliza` de la fuente de Vehículos es solo provenance y nunca modifica el estado contractual. Esto es especialmente importante en duplicados donde la fuente alterna entre `Vencida` y `Vigente`: manda la póliza canónica cuya vigencia ya fue resuelta bajo el contrato de Pólizas.

## 4. Identidad de Vehículo

Para no destruir historia ni duplicar dentro de una misma vigencia, la unidad de escritura será una **relación vehículo–versión de póliza**, no un supuesto vehículo físico global.

Cada registro persistido incluye:

- `polizaId` y `clienteId` canónicos;
- `placa`, `marca`, `linea`, `anio`, `inciso`, concepto y provenance;
- ID determinístico por tenant + póliza canónica + inciso + placa normalizada; cuando no existe placa, fallback determinístico con atributos fuente sin inventar datos;
- `physicalVehicleKeyCandidate` basado en placa solo como candidato de correlación futura.

No se colapsan renovaciones distintas en un único registro porque una misma placa puede aparecer a través de años, pólizas y hasta asegurados diferentes. Sin VIN en la fuente, la placa sola no autoriza reasignar propiedad histórica.

La estructura conserva compatibilidad con el contrato visual actual, que consume `vehiculos` por `polizaId` y usa `placa`, `marca` y `linea` para búsqueda.

## 5. Calidad pendiente

60 relaciones pueden persistirse de forma fail-closed sin inventar atributos. Motivos, con superposición:

```text
linea/tipo faltante: 34
placa faltante o PENDIENTE: 19
modelo/año faltante: 12
marca faltante: 7
inciso faltante: 1
```

El VIN/chasis está ausente en toda la fuente y por ello no se convierte artificialmente en un bloqueo de 100%. Se conserva vacío y la identidad física global queda explícitamente no resuelta cuando no existe placa confiable.

## 6. Duplicados y contradicciones

Los 18 grupos duplicados no presentan conflicto en atributos propios del vehículo. Tres sí difieren en metadatos de póliza/prima entre copias fuente; se conservan como `sourcePolicyConflict`, pero no bloquean el vehículo porque la póliza canónica ya es la autoridad de esos datos.

No se copia prima, estado financiero ni condición de cobro desde Vehículos.

## 7. Alcance del bloque

El futuro write de Vehículos podrá crear únicamente 1,032 relaciones `vehiculos` y una auditoría sanitizada. Debe mantener en cero cualquier escritura en:

- recibos;
- cartera;
- cobros;
- finmovs.

No existe todavía autorización para ese write.

## 8. Reuso transversal

Este bloque reutiliza la infraestructura cerrada en Pólizas:

- source freeze con hash exacto;
- staging/lectura privada;
- IDs determinísticos;
- mismo contrato DRY_RUN/WRITE;
- relación padre fail-closed;
- calidad pendiente persistible;
- baseline/post-write exactos;
- rollback fail-closed;
- request inmutable solo en el límite irreversible.

## 9. Causa raíz del canal privado

El intento de transferir desde el sandbox el XLSX canónico generado hacia Drive fue rechazado porque el conector exige una referencia de archivo registrada y no acepta una ruta local. Clasificación: `PIPELINE_MECHANISM_FAILURE`.

No se repitió la misma acción ni se trasladó trabajo manual a Paula. El diseño se corrige reutilizando el canal privado automatizado de Pólizas: las fuentes exactas se leen por Drive con la cuenta técnica LAB dentro del workflow, se validan por hash y la normalización ocurre efímeramente sin publicar PII en GitHub.

## 10. Siguiente acción

Registrar el gate único `block8-vehicles-static-v20260730`, comprobar lectura privada read-only de las tres fuentes exactas y ejecutar prewrite de Vehículos contra el baseline real. Solo si termina `PREWRITE_READY` se habilitará una autorización macro única de escritura.
