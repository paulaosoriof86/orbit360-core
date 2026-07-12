# Registro de auditoría candidata Claude v1.213 y paquete único

Fecha: 2026-07-12  
Carril: A — candidata/prototipo/UX/Academia  
Estado: `CORRECCION_REQUERIDA / NO EMPALMAR TODAVIA`

## Candidata auditada

```text
Prototype Development Request - 2026-07-12T073729.692.zip
SHA256: ef33ae185faf9664802249b9e916206669e6da61497bb97065f86c56aad40253
Versión interna: v1.213
Archivos: 102
```

## Delta físico contra v1.212

```text
Añadidos: 0
Eliminados: 0
Modificados: 14
JS revisados: 57
Fallos de sintaxis: 0
```

La candidata sí contiene cambios reales. Se conservan como avances:

- eliminación del curso duplicado `cur10`;
- profundización del curso existente de Aseguradoras/Cotizador/Comparativo;
- eliminación de `TASAS_DEF`;
- bloqueo parcial del automático sin tabla marcada como validada;
- separación de estados de propuesta;
- exclusión parcial de no validadas en ranking/impresión/comunicación/aceptación;
- uso de “Comparativo preparado”;
- ficha de Aseguradora convertida en página completa.

## Faltantes P0 comprobados

- reglas comerciales todavía hardcodeadas en Cotizador: fraccionamiento, antigüedad y gasto de emisión;
- booleano de validación sin fuente, versión, vigencia y dimensiones;
- cotización manual del Cotizador promovida automáticamente a `validada`;
- handoff con `sessionStorage` en vez de entidad persistida por `Orbit.store`;
- DTO normalizado incompleto;
- PDF/manual e historial todavía en arrays/globales volátiles;
- validación sin fuente, monto positivo, permiso, confirmación y diff suficiente;
- inferencia fiscal fija `total / 1.12`;
- aceptación sin `workflowType: issuance_request` ni gate completo;
- afirmaciones de envío no confirmado en varios módulos;
- copy técnico visible sin separación clara de rol;
- manifiesto y README obsoletos.

## Pendientes P1 Claude

- Replantear profundo y selección manual justificada;
- paridad pantalla/PDF;
- visor documental transversal;
- rol activo/default y scopes de datos;
- Calidad por asesor;
- ficha-página de Póliza;
- evidencia responsive;
- Academia alineada al runtime final.

## Validador reproducible

El validador incluido en el paquete se ejecutó contra v1.213 y devolvió:

```text
PASS: 2
FAIL P0: 29
WARN P1: 9
```

## Paquete exclusivo para Claude

```text
ORBIT360_PAQUETE_UNICO_CLAUDE_POST_V1213_20260712.zip
SHA256: e872b9356785b0a056fc993a9dc45fe36af80e47ebc463a42ad3002d7ffee975
```

Contiene únicamente auditoría de prototipo, prompt único, matriz, validador y checklist. No contiene backend, runtime tenant, tasas, reglas, documentos, nombres ni datos específicos de A&S.

## Frontera

- Claude corrige únicamente lo reusable en su candidata v1.213.
- Los avances A&S y backend protegido no se trasladan como implementación.
- Una próxima candidata no se acepta por declaración; debe demostrar archivo, función, comportamiento, prueba y resultado.
