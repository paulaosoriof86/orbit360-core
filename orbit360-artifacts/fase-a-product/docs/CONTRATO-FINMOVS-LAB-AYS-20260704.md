# Contrato finmovs LAB A&S

Fecha: 2026-07-04
Rama: ays/backend-tenant-lab-v99-20260703
Estado: documento backend. Sin Firestore. Sin deploy. Sin merge.

## Objetivo

Documentar reglas para financiero histórico en LAB.

## Destino

finmovs

## Campos base

- id
- tenantId
- pais
- moneda
- periodo
- fecha
- tipoMovimiento
- categoria
- concepto
- monto
- estadoRegistro
- origen
- validacion
- createdAt
- updatedAt

## Reglas

GT usa GTQ. CO usa COP. Si el libro es mixto, cada hoja debe declarar país y moneda. Si una hoja no tiene país o moneda confiable, queda REQUIERE_VALIDACION.

No sumar monedas distintas en crudo.

## Separación operativa

finmovs es histórico financiero y analítica. No es cartera, no es cobros y no es producción.

Desde financiero histórico no se crean clientes, pólizas, cobros, cartera, aseguradoras, producción ni comisiones.

## Estados

- LISTO
- REQUIERE_VALIDACION
- BLOQUEADO
- OMITIDO
- DUPLICADO_PROBABLE

## Antes de LAB

1. Manifest sin payload embebido.
2. País y moneda por hoja.
3. Validación contra contrato canónico.
4. Dry-run estructural.
5. Preview normalizado.
6. Autorización expresa de Paula.

## Estado

Documento listo. No autoriza carga LAB.
