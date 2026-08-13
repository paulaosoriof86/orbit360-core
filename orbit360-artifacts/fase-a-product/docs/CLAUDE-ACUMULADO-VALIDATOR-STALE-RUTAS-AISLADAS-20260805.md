# Acumulado Claude — Validador visual por rutas aisladas

Fecha: 2026-08-05  
Clasificación: `REPLICABLE_CLAUDE_ACUMULADO`

## Patrón reusable

Cuando una SPA extensa acumula estado entre rutas, el gate visual no debe navegar internamente sobre una misma página de larga vida. El patrón reusable es:

```text
1 ruta = 1 browser context
1 URL directa por ruta
1 token efímero por ruta
1 video por ruta
1 frame estático por ruta
cierre del contexto antes de continuar
```

## Separación de decisiones

```text
producto + integridad PASS, captura PASS
→ retener preview y habilitar revisión humana

producto + integridad PASS, captura FAIL
→ retener preview, clasificar captura y permitir revisión directa

producto o integridad FAIL
→ rollback seguro de recursos introducidos por la ejecución
```

## Control anti-obsolescencia

Motor, lifecycle, extensión de registro, workflow y request deben declarar la misma revisión:

```text
isolated-context-direct-url-v6
```

El preflight no debe buscar tokens retirados de pruebas anteriores. Un mismatch de generación se clasifica `VALIDATOR_STALE`, congela producto y se corrige antes de secretos.

## Exclusiones

No se envían a Claude:

- tenant o datos A&S;
- nombres de usuarios;
- UID, correos o memberships;
- credenciales;
- configuración Firebase;
- backend protegido;
- payloads reales.

Solo se acumula arquitectura reusable de validación y retención segura.
