# ACTUALIZACIÓN DELTA PARA CLAUDE — COTIZADOR/COMPARATIVO v1.203

Fecha: 2026-07-11  
Estado: cambios locales posteriores a candidata Claude v1.197.  
Uso: obligatorio en el siguiente paquete acumulado Claude.

## Baseline incremental obligatorio

```txt
candidata Claude v1.197
+ CRM v1.198–v1.201
+ Aseguradoras v1.202
+ Cotizador/Comparativo v1.203
+ Academia acumulada
+ backend protegido
```

No reiniciar desde cero ni devolver el Cotizador/Comparativo anterior sin estos contratos.

## Correcciones backend que deben reflejarse en UX

### 1. Default-deny

La interfaz no puede calcular con tasas genéricas o de ejemplo.

```txt
sin fuente vigente y tarifa validado_habilitado
→ automático bloqueado
→ explicar qué falta
→ ofrecer propuesta documental/manual pendiente de revisión
```

### 2. Cotización normalizada

Toda propuesta debe mostrar de forma clara:

- origen;
- aseguradora;
- país/moneda/producto/plan;
- cliente/prospecto/asesor;
- prima neta;
- gastos;
- impuestos;
- prima total;
- cuotas;
- fuente, versión y vigencia;
- validación;
- estado comercial.

### 3. Manual/PDF

Una extracción no es automáticamente confiable.

UX necesaria:

```txt
archivo original
+ extracción propuesta
+ diff/corrección humana
+ motivo
+ actor/fecha
+ confirmación
+ estado validado
```

No afirmar que el documento está resguardado cuando Drive no está conectado.

### 4. Traslado Cotizador → Comparativo

No usar estado global parcial. La UX debe trabajar con cotizaciones persistidas y validadas.

```txt
Cotizador selecciona IDs
→ Comparativo recupera entidades
→ valida consistencia
→ renderiza tabla
```

Errores deben ser visibles; no dejar pantalla vacía.

### 5. Comparativo profundo

Conservar de v110:

- schemas por país/producto;
- múltiples propuestas;
- automático + PDF + manual;
- edición individual;
- coberturas/deducibles/condiciones;
- recomendación replanteable;
- impresión;
- WhatsApp/plantillas;
- historial comercial.

El contrato v1.203 ya ofrece entidades, estados y flujo; Claude debe elevar la experiencia visual sin reimplementar almacenamiento ni lógica protegida.

### 6. Recomendación consultiva

Mostrar:

- criterio aplicado;
- aseguradora sugerida;
- factores;
- explicación;
- versión de reglas;
- advertencia consultiva;
- opción de replantear;
- selección manual con justificación.

### 7. Comunicación honesta

Usar:

```txt
Preparar para cliente
WhatsApp Web abierto
Correo preparado
Pendiente de confirmación
```

No usar “enviado” sin callback del proveedor.

### 8. Propuesta aceptada

La UI debe mostrar claramente:

```txt
Cliente acepta
→ crea Solicitud de emisión en Ops
→ pendiente documentos/inspección/emisión
→ NO crea póliza todavía
```

## Archivos que Claude no debe sobrescribir

```txt
core/quote-comparison-contracts-v1203.js
modules/cotizador-v1203-source-gate.js
modules/comparativo-v1203-operational-bridge.js
data/academia-v1203-cotizador-comparativo.js
core/issuance-workflow-v1201.js
modules/aseguradoras.js
```

Claude debe adaptar su prototipo a esos contratos y estados, no reemplazarlos.

## UI cliente

Eliminar notas que revelen:

- backend;
- LAB;
- Firestore/Firebase;
- store/localStorage;
- mock/demo/smoke;
- nombres técnicos de referencias;
- credenciales/secretos.

Mostrar estados operativos comprensibles.

## Responsive

Validar al menos:

```txt
390 px
768 px
1366 px
```

Especialmente:

- formulario de riesgo;
- filas de aseguradoras;
- tarjetas de cotización;
- tabla comparativa horizontal;
- recomendación;
- botones de aceptación;
- modales de revisión documental.

## Academia

Conservar rutas por Dirección, Operativo y Asesor sobre:

- fuentes validadas;
- default-deny;
- propuesta documental;
- prima separada;
- traslado por IDs;
- recomendación explicable;
- selección manual;
- comunicación preparada;
- solicitud de emisión.

## Pendientes visuales que deben seguir acumulándose

- riqueza completa de formularios GT/CO de v110;
- carga/reemplazo PDF por aseguradora;
- tabla avanzada por producto;
- impresión grupal e individual;
- historial ganado/perdido/vencido;
- estados vacíos;
- notas técnicas restantes;
- responsive;
- visor documental embebido transversal.

## Rechazo automático

Rechazar candidata que:

- vuelva a tasas genéricas;
- calcule sin fuente/versionado;
- use `Orbit._cots` como entidad final;
- guarde historial solo en memoria;
- compare propuestas pendientes como si fueran válidas;
- afirme envío confirmado sin proveedor;
- cree póliza al aceptar propuesta;
- elimine la relación Aseguradoras → Cotizador → Comparativo → Ops;
- omita Academia;
- reintroduzca notas técnicas en UI.
