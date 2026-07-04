# Contrato colección aseguradoras LAB A&S

Fecha: 2026-07-04
Rama: ays/backend-tenant-lab-v99-20260703
Estado: contrato documental. Sin carga Firestore. Sin deploy. Sin merge.

## Objetivo

Definir cómo se debe modelar la colección aseguradoras para carga LAB futura, sin exponer datos privados y sin mezclar países.

## Colección destino

aseguradoras

Cada registro debe tener tenant, país, moneda, estado de validación y trazabilidad de origen.

## Campos base recomendados

- id
- tenantId
- nombre
- nombreNormalizado
- pais
- moneda
- estadoRegistro
- vinculada
- ramos
- contactos
- plataformas
- cuentas
- documentos
- docsRequeridos
- origen
- validacion
- createdAt
- updatedAt

## País y moneda

GT usa GTQ. CO usa COP. Si país o moneda no están explícitos, el registro queda en REQUIERE_VALIDACION. No asumir Guatemala por defecto.

## Estados permitidos

- LISTO
- REQUIERE_VALIDACION
- BLOQUEADO
- OMITIDO
- DUPLICADO_PROBABLE
- REQUIERE_CONFIG_PRIVADA

## Datos públicos y privados

Permitido en UI cliente solo si está autorizado: nombre, país, moneda, ramos, contactos generales, documentos requeridos y observaciones no sensibles.

No permitido en UI cliente ni seed real: contraseñas, tokens, usuarios privados, accesos internos, enlaces privados sensibles, cuentas completas o credenciales de portales.

Si la fuente trae accesos privados y todavía no existe bóveda o almacenamiento seguro aprobado, debe marcarse REQUIERE_CONFIG_PRIVADA.

## Reglas anti-contaminación

Desde aseguradoras no se permite crear clientes, pólizas, cobros, cartera, finmovs, producción ni comisiones.

La planilla de comisiones o tarifas debe venir de fuente separada. El directorio de aseguradoras no debe inventar porcentajes productivos.

## Seed demo vs datos reales

El seed puede tener datos ficticios de aseguradoras para demostración. Eso no autoriza cargar datos reales del directorio sin validación.

## Criterios antes de write LAB

1. Manifest estructural sin payload embebido.
2. Validación contra contrato canónico.
3. Dry-run estructural listo.
4. Preview normalizado listo o revisado.
5. Sin write habilitado hasta autorización expresa de Paula.
6. Sin datos sensibles visibles.
7. Sin mezcla GT/CO.

## Estado

Contrato documental listo para implementación posterior por Codex sin tocar producción.
