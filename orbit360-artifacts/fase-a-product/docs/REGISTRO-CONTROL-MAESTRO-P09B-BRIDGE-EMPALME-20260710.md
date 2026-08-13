# Registro control maestro — P0.9b bridge y empalme

Fecha: 2026-07-10  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: `#5 draft/open`  
Estado: `BRIDGE_E_INTEGRADOR_IMPLEMENTADOS / NO_APLICADOS / SIN_MERGE_DEPLOY`

## Carril A

Avance:

- flujo visual futuro ya puede distinguir `BACKEND_REQUIRED`, conectado y degradado;
- orden de carga de adapters/runtime definido;
- requisitos Claude/Academia P0.9 conservados.

Pendiente:

- UI de carga/revisión;
- read model visible;
- candidata Claude después de primer flujo real.

## Carril B

Avance:

- bridge backend reusable;
- registro solo con capacidades confirmadas;
- integrador idempotente con query strings;
- dry-run predeterminado;
- backup/rollback;
- capabilities derivadas del manifiesto;
- rollback lógico del writer;
- workflow y smokes.

Pendiente:

- implementación concreta del bridge backend;
- ejecutar `--apply`;
- validación Firestore LAB;
- CI visible.

## Carril C

Avance:

- las once fuentes A&S tienen asociación prevista por aseguradora/producto;
- runtime preparado para recibir referencias autorizadas.

Pendiente:

- Drive/upload autorizado;
- primera persistencia metadata-only;
- repetición por lotes;
- validación humana;
- bindings reales.

## Próxima acción

P0.9c:

```text
backend runner seguro
→ bridge real
→ dry-run index
→ empalme controlado
→ primera fuente A&S
→ read model y auditoría
```

No habilitar Cotizador o Comparativo todavía.
