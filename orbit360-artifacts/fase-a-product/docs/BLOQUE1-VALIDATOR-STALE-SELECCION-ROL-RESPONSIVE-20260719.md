# Bloque 1 · VALIDATOR_STALE · selección de rol en responsive

Fecha: 2026-07-19
Gate: `block1-client360-insurers-lab-v20260717`
Run fuente: `29669017875`
Commit probado: `22e51537b6bd75044c930bc5b251d1649148b1e3`
Clasificación: `VALIDATOR_STALE`

## Evidencia aprobada antes del primer fallo

- Preflight: `GO_GATE_CONTRACT`.
- Runtime LAB exacto y canal verificado.
- 414 clientes, 26 aseguradoras y 7 asesores.
- Autenticación y aceptación legal una sola vez.
- Dirección desktop: Cliente 360 aprobado.
- Proyección canónica: helper `20260717.1`, puente temporal `20260717.1-temporal`, campos completos y estado `pendiente_polizas`.
- Dirección desktop: Aseguradoras aprobada con 26 tarjetas, GT primero, ficha en lectura y conocimiento visible.
- Cero fallos de parseo y cero excepciones de página.

## Primer fallo

El gate redujo el viewport a tableta y luego ejecutó `locator('#rol-sel').selectOption(...)`. El selector seguía presente en el DOM, pero estaba oculto o recortado por el responsive de la barra superior. Playwright exige visibilidad para `selectOption`, por lo que agotó 15 segundos antes de iniciar la validación de Operativo.

El fallo ocurrió mientras el reporte todavía conservaba la etapa anterior `desktop_direction_aseguradoras`; no representa una falla de esa vista.

## Causa raíz

El validador confundía dos responsabilidades:

1. validar la experiencia real de cada rol en su viewport correspondiente;
2. usar un control visual del encabezado como mecanismo interno para preparar el rol.

El mecanismo interno dependía de la visibilidad del mismo control que el diseño responsive puede ocultar legítimamente.

## Corrección 1.0.27

- Producto, Store, Auth, Router, reglas, datos y renderers permanecen congelados.
- `selectRole` localiza la opción por texto en el DOM, asigna el valor y dispara el evento `change` con propagación.
- La selección se confirma por valor activo, no por visibilidad del control.
- Después se validan Operativo tableta y Asesor móvil en sus tamaños reales.
- Se conservan todas las aserciones funcionales de Cliente 360, Aseguradoras, scopes, menú móvil, lectura y ausencia de copy técnico.

## Regla de ejecución

Ejecutar el gate oficial 1.0.27 exactamente una vez después de `GO_GATE_CONTRACT`. Aceptar únicamente evidencia sanitizada `ok:true`. Ante cualquier primer fallo nuevo, detenerse y clasificar antes de modificar otro componente.

## Claude y Academia

- `REPLICABLE_CLAUDE_ACUMULADO`: los validadores responsive no deben depender de la visibilidad de controles de preparación interna.
- `ACADEMIA_ACTUALIZAR`: diferenciar control visible para el usuario de mecanismo semántico de preparación del gate; explicar `VALIDATOR_STALE` frente a defecto funcional.
