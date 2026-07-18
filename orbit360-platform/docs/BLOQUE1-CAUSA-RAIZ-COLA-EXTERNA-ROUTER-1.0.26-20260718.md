# Bloque 1 · Cola externa del Router · 1.0.26

Fecha: 2026-07-18

Clasificación: `FUNCTIONAL_DEFECT` limitado al mecanismo de ejecución de contratos del Router.

## Evidencia

El archivo core servido coincide exactamente con el repositorio y crea su owner tanto sin Service Worker como bajo un Service Worker controlado. En la plataforma completa, el elemento de script externo inicia la solicitud, pero no alcanza parseo, ejecución ni señal de carga dentro del límite.

## Causa raíz

El contenido, el Service Worker y el contrato son válidos. El atasco queda aislado al mecanismo de elemento externo dentro de la cola completa del Router.

## Corrección

El Router conserva ownership único y orden `next()`, pero sustituye el elemento externo por `import()` same-origin. La promesa resuelve únicamente después de que el navegador descargó, parseó y ejecutó el contrato. Un marcador DOM inerte conserva la trazabilidad del gate.

## Carriles

- Carril A: Cliente 360, Aseguradoras y UX preservados.
- Carril B: Router, runner, registro, documentación y Academia; Store, Auth y reglas intactos.
- Carril C: 414 clientes, 26 aseguradoras y 7 asesores; sin reimportación.

## Claude y Academia

- Claude: `BACKEND_PROTEGIDO_NO_CLAUDE`.
- Patrón reusable: validar por separado cuerpo servido, Service Worker, ejecución aislada y plataforma completa antes de modificar consumidores.
- Academia: distinguir solicitud, respuesta, parseo, ejecución y owner listo.

## Salida

Preflight vinculante primero y una sola ejecución oficial. M1 cierra exclusivamente con evidencia sanitizada `ok:true`.
