# Academia — actualización v17 · readiness y proyección de responsables

## Aprendizaje operativo

Un módulo puede tener sus datos canónicos requeridos listos y aun así quedar bloqueado por una referencia legacy opcional o por una proyección read-only costosa. La corrección correcta no es reimportar datos ni ampliar timeouts: primero se separa required/optional y luego se mide el costo real del render.

## Diferencia clave

- **Defecto funcional:** la proyección fallback de responsables se reconstruía repetidamente durante Cliente 360.
- **Fallo del mecanismo de validación:** la matriz solo veía que la ruta no terminaba y no distinguía si faltaba hidratación requerida o si el render estaba bloqueado.

## Patrón aprobado

1. `OrbitHydrationContractDiagnostics` define la autoridad required/optional.
2. Cada ruta debe pasar `REQUIRED_HYDRATION_PASS`.
3. Solo después se espera `RENDER_READY_PASS`.
4. Las colecciones opcionales pueden quedar degradadas sin bloquear la vista.
5. Las proyecciones read-only derivadas se cachean y se invalidan por cambios de fuente o membresía; nunca escriben datos para resolver visualización.
6. Un watchdog protege el pipeline, pero no sustituye el diagnóstico de causa raíz.

## Caso Cliente 360

Con el volumen observado en v16, 430 consultas de asesor deben reutilizar una sola construcción de la proyección. El fixture v17 demuestra 1 build antes de invalidación y exactamente una reconstrucción posterior a cada invalidación controlada.

## Por rol

- **Dirección:** puede ver la cartera completa y responsables proyectados sin reconstrucciones por fila.
- **Operativo:** usa la misma autoridad de hidratación, no una lista de dependencias distinta.
- **Asesor:** la proyección y el scope siguen siendo read-only y respetan membresía/scope; no habilitan escrituras ni reasignaciones.

## Seguridad y migración

Un fallo visual no autoriza tocar Rules, Auth, datos reales, reimportar clientes/aseguradoras ni convertir colecciones opcionales en requisitos artificiales. La ruta de corrección es producto/contrato/validador según la causa clasificada.
