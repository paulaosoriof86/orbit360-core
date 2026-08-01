# Autorización read-only — Planillas y Comisiones

Fecha y hora: 2026-08-01 14:21 -06:00  
Repositorio: `paulaosoriof86/orbit360-core`  
Rama obligatoria: `ays/backend-tenant-lab-v99-20260703`  
PR: `#5`, debe permanecer draft/open  
Estado: `READONLY_AUTHORIZATION_CONSUMED`

## Alcance expresamente autorizado

Paula Osorio autorizó recibir y verificar las fuentes vigentes, procesarlas en paquete privado read-only, ejecutar los adaptadores desconectados, generar dry-runs sanitizados y clasificar crear, omitir, requiere validación y HOLD, sin escrituras operativas.

La autorización permitió además cruzar read-only las fuentes con pólizas y recibos de LAB, siempre que el gate canónico se ejecutara antes de secrets y Firestore.

## Resultado consumido

```text
fuentes recibidas: 19
filas observadas: 67
candidatas CRM: 65
identidades de póliza resueltas: 49
HOLD de identidad de póliza: 16
relaciones con recibo resueltas: 5
HOLD de recibo: 44
escrituras: 0
finanzas activadas: no
```

Evidencia principal:

```text
policy identity run: 30719208561
receipt link run: 30719464732
```

La autorización read-only quedó consumida y el lifecycle cerró en:

```text
PLANILLAS_POLICY_IDENTITY_RECEIPT_LINK_READONLY_CLOSED
```

## No autorizado

Esta autorización no permite:

- escribir registros de comisión;
- crear `finmovs`;
- modificar cobros, recibos, pólizas, cartera o clientes;
- crear CxC o CxP;
- liquidar asesores;
- inferir tasas de comisión;
- reutilizar planillas de otro periodo;
- usar la fecha de pago de la comisión para escoger póliza o recibo;
- conectar los resolvers a UI, `Orbit.store` o writer productivo;
- ejecutar navegador, deploy, Functions, Rules, Storage o producción;
- modificar `main`, hacer merge o cerrar el PR.

## Condición para una futura escritura

Solo las cinco relaciones read-only de póliza y recibo pueden ingresar a un futuro dry-run de comisión. Ese bloque deberá comprobar:

```text
contrato de destino
+ idempotencia
+ ausencia de duplicados
+ asesor y comisión de vendedor
+ snapshot
+ diff
+ atomicidad
+ rollback
```

Cualquier escritura requiere autorización separada. Los 16 HOLD de póliza y los 44 HOLD de recibo permanecen excluidos.
