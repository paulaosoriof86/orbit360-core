# Orbit 360 A&S — Implementación estática M2: bootstrap productivo read-only

Fecha: 2026-07-23  
Rama obligatoria: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open  
Gate: `block2-product-readonly-bootstrap-v20260723`

## Clasificación

- `FUNCTIONAL_DEFECT`: faltaba un owner explícito que conectara los contratos productivos existentes.
- `DATA_CONTRACT_FAILURE`: el tenant productivo no puede depender de URL ni de una fuente distinta de la membership autenticada.
- `VALIDATOR_STALE`: el registro y preflight seguían anclados al Bloque 1 cerrado.
- `PIPELINE_MECHANISM_FAILURE`: el flujo canónico no distinguía todavía M1 histórico de M2 estático.

## Alcance de este patch

Este bloque es exclusivamente estático. No usa configuración productiva, secretos, Auth real, Firestore real, Rules, navegador, Hosting, Functions ni deploy.

### Owners nuevos

1. `core/product-role-taxonomy-p0.js`
   - roles canónicos;
   - aliases únicamente para lectura;
   - no permite persistir aliases ambiguos.

2. `core/membership-multirol-effective-p0.js`
   - canoniza roles antes del contrato base;
   - conserva rol activo/default, extras, restringidos y scopes;
   - no escribe memberships.

3. `core/tenant-access-policy-product-p0.js`
   - aplica la taxonomía canónica antes de lectura, módulos, scope y query planner;
   - mantiene `writeAuthorized:false`.

4. `core/backend-product-readonly-bootstrap-p0.js`
   - owner fail-closed;
   - no se autoejecuta;
   - deriva tenant únicamente desde membership;
   - exige environment provider, Firebase adapter, Auth provider y membership provider explícitos;
   - crea el store productivo read-only solo después del readiness;
   - instala la proyección de usuario y adjunta snapshots permitidos únicamente en una futura ejecución expresamente autorizada.

5. `product-readonly.html`
   - entrypoint inequívoco de producto;
   - no carga loader/store/seed del entorno de pruebas;
   - no acepta tenant por query string;
   - muestra un estado honesto mientras la conexión no esté autorizada.

## Invariantes

```text
tenant_from_membership_only = true
query_string_tenant_in_product = false
product_store_explicitly_installed = true
store_no_fallback = true
writes_blocked = true
cross_tenant_denied = true
credential_refs_frontend_read = false
auto_start = false
secrets_in_repository = false
runtime_authorized = false
```

## Compatibilidad

El `index.html` y la visualización del entorno de pruebas no se modifican. El nuevo entrypoint productivo es separado y no mezcla stores. Los contratos M1 permanecen históricos y congelados.

## Permisos y roles

Los roles persistidos deben ser:

```text
Dirección
SuperAdmin
AdminTenant
Operativo
Finanzas
Marketing
Asesor
Comercial
Asistente
```

Variantes como `Superadmin`, `Admin`, `Administrador` o `Operaciones` se aceptan únicamente como aliases de lectura y se normalizan a su valor canónico antes de evaluar permisos.

## Gate estático

El gate M2 debe probar:

- owner de bootstrap presente y sin autoarranque;
- cero lectura de tenant desde URL;
- cero fallback alterno;
- store read-only explícito;
- bloqueo de escrituras;
- aliases canónicos en membership/access;
- entrypoint productivo sin componentes del entorno de pruebas;
- registro, lifecycle, overlay, workflow, freeze, Academia y documentación alineados;
- cero capacidades externas.

## Claude y Academia

Clasificación Claude: `REPLICABLE_CLAUDE_ACUMULADO`.

Se replica únicamente el patrón reusable:

- estado fail-closed;
- tenant desde membership;
- roles canónicos;
- mensajes honestos de acceso pendiente;
- separación estricta entre entrypoints.

No se envían secretos, configuración real, datos A&S, referencias protegidas ni backend productivo.

Academia se actualiza con la lección 1.233 sobre membership-first, roles canónicos, no fallback, bloqueo de escritura y diferencia entre defecto funcional y validador obsoleto.

## Deuda visual diferida

Los títulos móviles no completamente responsive continúan como deuda no bloqueante y deben cerrarse antes de la release candidate del Bloque 5. No se mezclan con M2.

## Criterio de cierre de esta etapa

Aceptar exclusivamente evidencia sanitizada con:

```text
GO_GATE_CONTRACT
M2_PRODUCT_READONLY_BOOTSTRAP_CONTRACT_PASS
cero secrets
cero Firebase productivo
cero Firestore read
cero writes
cero Rules
cero runtime/browser/deploy
```

El resultado estático no autoriza todavía conexión productiva. La siguiente autorización deberá ser específica para preparar el entorno read-only y ejecutar el smoke real.
