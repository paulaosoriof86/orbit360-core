# AUDITORÍA OPERATIVA — COTIZADOR → COMPARATIVO v1.203

Fecha: 2026-07-11  
Proyecto: Orbit 360 A&S  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open; sin merge, deploy ni producción.  
Carriles: B — contratos/seguridad; C — operación A&S; A — UX/Academia.

## 1. Fuentes y baseline revisados

- módulo vivo `modules/cotizador.js`;
- módulo vivo `modules/comparativo.js`;
- módulo fuente maestra `modules/aseguradoras.js` y contrato `_fuentes`;
- flujo `core/issuance-workflow-v1201.js`;
- auditoría forense `comparativo_final_v110.html`;
- documento `AUDITORIA-FORENSE-PROFUNDA-COTIZADOR-COMPARATIVO-V110-CONTRATO-AYS-20260709.md`;
- baseline CRM/Aseguradoras v1.198–v1.202.

## 2. Hallazgos P0 reales

### P0-01 — cálculo genérico sin fuente válida

El Cotizador base todavía incluía:

```txt
TASAS_DEF
RECARGO_FRACC
fallback a cotTasas o tabla genérica
```

Esto permitía generar un resultado automático sin documento, versión, país/producto exactos ni configuración validada.

Decisión:

```txt
sin fuente + configuración validado_habilitado
→ no hay cálculo automático
→ se muestra estado honesto
→ se permite propuesta manual/documental pendiente de validación
```

### P0-02 — traslado parcial por estado global

El flujo previo trasladaba propuestas mediante:

```txt
Orbit._cots
```

con campos parciales. Comparativo dependía del orden de render y podía quedar vacío o incompleto.

Decisión:

```txt
Cotización persistida
→ ID canónico
→ quoteTransfers con IDs
→ Comparativo reconstruye desde Orbit.store
```

### P0-03 — historial no operativo

Cotizador usaba una preferencia y Comparativo un arreglo en memoria. No existía seguimiento comercial durable por entidad.

Decisión:

```txt
cotizaciones[]
comparativos[]
quoteTransfers[]
```

mediante la API de `Orbit.store`, sin acceso directo a almacenamiento.

### P0-04 — aceptación desconectada de Ops

La recomendación no cerraba el ciclo operacional.

Decisión:

```txt
propuesta validada
→ aceptación explícita del cliente
→ solicitud de emisión en Ops
→ NO crea póliza
→ póliza solo al recibir número/documento real
```

## 3. Contrato canónico implementado

Archivo:

```txt
core/quote-comparison-contracts-v1203.js
```

### 3.1 Cotización normalizada

Incluye:

- origen `automatica_tarifa | pdf_aseguradora | manual_asistida`;
- aseguradora y snapshot de nombre;
- país, moneda, ramo, producto y plan;
- dimensiones de riesgo;
- cliente/prospecto y asesor;
- datos del riesgo;
- prima neta;
- gastos de emisión, financiamiento y otros;
- impuestos;
- prima total y mensual;
- cuotas/formas de pago;
- coberturas, deducibles, condiciones, exclusiones y beneficios;
- documento/configuración/versiones fuente;
- confianza de extracción y correcciones;
- validación y estado comercial;
- trazabilidad.

### 3.2 Comparativo normalizado

Incluye:

- país/moneda/producto/ramo;
- cliente/prospecto/asesor;
- IDs de cotizaciones;
- esquema comparativo;
- criterio y recomendación;
- explicación y versión de reglas;
- selección manual;
- estado comercial;
- fechas y trazabilidad.

## 4. Gate de cálculo automático

Una aseguradora es elegible únicamente si:

```txt
vinculada
+ país compatible
+ dimensiones mínimas completas
+ grupo de fuentes compatible
+ alguna fuente validado_habilitado
+ tarifa/reglas
+ presentación o caso de prueba
+ configuración tarifaria validado_habilitado
+ documento fuente
+ versión
+ vigencia activa
```

La coincidencia exige país, moneda, ramo y producto; las dimensiones opcionales informadas también deben coincidir.

No se heredaron las tasas genéricas del módulo base.

## 5. Motor tarifario inicial

Soporta configuraciones validadas de tipo:

```txt
prima_fija
porcentaje_valor
tabla_rangos
lookup
```

Calcula y conserva por separado:

```txt
primaNeta
gastosEmision
gastosFinan
otros
ivaPct
ivaMonto
primaTotal
primaMensual
cuotas
tasa/rango aplicado
configuración y fuente
```

No se cargaron tarifas reales porque aún no se recibió una fuente tarifaria separada y validada. Por tanto, el comportamiento correcto actual es bloquear el cálculo automático.

## 6. Propuesta manual o PDF

### Manual asistida

- se puede registrar prima total;
- nace como borrador;
- no puede seleccionarse para Comparativo;
- exige documento/referencia, versión, desglose, motivo y confirmación humana;
- guarda anterior/nuevo en `camposCorregidos`.

### PDF/imagen

- puede analizarse con la capacidad existente;
- intenta reconocer la aseguradora contra el directorio;
- genera propuesta pendiente;
- el documento original debe vincularse antes de validar;
- no transforma la extracción en tarifa;
- no destruye ni modifica el documento original.

Pendiente B: resguardo documental real/Drive y diff durable.

## 7. Cotizador operativo

Archivo:

```txt
modules/cotizador-v1203-source-gate.js
```

Cambios:

- intercepta el botón de cálculo del módulo base;
- deshabilita el modo automático cuando no hay fuente válida;
- muestra estado por aseguradora;
- persiste resultados canónicos;
- separa validadas y pendientes;
- incorpora revisión humana;
- imprime cotización individual;
- prepara comunicación sin afirmar entrega;
- muestra historial operativo;
- transfiere únicamente dos o más propuestas validadas.

## 8. Comparativo operativo

Archivo:

```txt
modules/comparativo-v1203-operational-bridge.js
```

El flujo derivado desde Cotizador:

- carga el `quoteTransfer`;
- recupera cotizaciones por ID;
- rechaza inconsistencias;
- muestra prima neta, gastos, impuestos, total y forma de pago;
- agrega coberturas/deducibles disponibles;
- calcula recomendación explicable;
- permite criterios equilibrio, precio, cobertura, deducible y RC;
- permite selección manual con justificación;
- imprime;
- prepara comunicación;
- registra aceptación;
- crea solicitud de emisión en Ops.

El modo independiente existente se conserva. Todavía requiere evolución adicional para persistencia completa, diff de extracción y experiencia v110 profunda.

## 9. Recomendación consultiva

Solo usa cotizaciones que pasan validación completa.

Criterios:

```txt
equilibrio
precio
cobertura
deducible
responsabilidad civil
manual con justificación
```

La explicación indica que es una sugerencia y no sustituye revisión profesional ni condiciones emitidas.

## 10. Comunicación

Estados honestos:

```txt
borrador
generado
preparado
enviado_confirmado
ganado
perdido
vencido
```

Abrir WhatsApp o preparar correo cambia a `preparado`; no se afirma entrega sin callback/proveedor.

## 11. Propuesta aceptada y emisión

Se exige:

- cotización validada;
- cliente existente;
- frase exacta `CLIENTE ACEPTA`;
- evidencia/motivo;
- permiso del rol.

Resultado:

```txt
gestión workflowType = issuance_request
tipo = Solicitud de emisión
etapa = PROPUESTA_ACEPTADA
```

No se crea póliza ni cartera hasta recibir emisión real.

## 12. Academia

Archivo:

```txt
data/academia-v1203-cotizador-comparativo.js
```

Rutas Dirección, Operativo y Asesor sobre:

- fuentes y default-deny;
- propuestas documentales;
- prima separada;
- traslado por IDs;
- recomendación explicable;
- selección manual;
- comunicación honesta;
- propuesta aceptada y solicitud de emisión.

## 13. Pruebas versionadas

```txt
tools/orbit360-test-cotizador-comparativo-v1203.mjs
tools/orbit360-validar-cotizador-comparativo-v1203.mjs
```

Cobertura funcional esperada:

- habilitación con tarifa/fuente válida;
- bloqueo sin configuración;
- prima mínima/rango;
- separación de prima;
- manual bloqueada hasta fuente y confirmación;
- comparación por IDs;
- recomendación solo con propuestas validadas.

El smoke local real queda pendiente de ejecutar mediante el bloque PowerShell corregido.

## 14. Pendientes por carril

### Carril A

- traducir la experiencia canónica a diseño visual profundo v110;
- responsive real;
- eliminar notas técnicas restantes;
- mejorar carga/reemplazo individual de PDFs;
- schemas completos por país/producto;
- impresión avanzada por cantidad de propuestas;
- evidencia visual y paquete acumulado Claude.

### Carril B

- batch/rollback transaccional;
- proveedor Drive/documentos;
- extracción durable;
- configuración tarifaria server-side;
- reglas tenant/rol/scope server-side;
- callbacks de comunicación;
- PDF renderer durable;
- versionado de schemas/reglas;
- pruebas automáticas en CI.

### Carril C

- recibir fuentes reales separadas de tarifas/planes/cotizaciones;
- inventariar por aseguradora/país/producto/moneda;
- dry-run;
- validar configuraciones;
- habilitar combinaciones individualmente;
- ejecutar casos reales sanitizados;
- confirmar formularios y reglas A&S faltantes.

## 15. Estado

```txt
CONTRATO_COTIZACION: IMPLEMENTADO
CONTRATO_COMPARATIVO: IMPLEMENTADO
DEFAULT_DENY: IMPLEMENTADO
CALCULO_GENERICO_NUEVO: NO
PRIMA_SEPARADA: IMPLEMENTADA
HISTORIAL_ORBIT_STORE: IMPLEMENTADO
TRASLADO_POR_IDS: IMPLEMENTADO
RECOMENDACION_EXPLICABLE: IMPLEMENTADA
ACEPTACION_A_OPS: IMPLEMENTADA
CREACION_PREMATURA_POLIZA: NO
MODO_INDEPENDIENTE_V110_PROFUNDO: PARCIAL
TARIFAS_REALES_CARGADAS: NO
SMOKE_LOCAL: PENDIENTE
VALIDACION_VISUAL: PENDIENTE
DEPLOY: NO
MERGE: NO
```
