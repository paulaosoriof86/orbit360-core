# ACADEMIA — CAPTURA BLOQUEADA POR ESTADO LEGAL

Fecha: 2026-08-05

## Caso

Un workflow puede terminar con éxito técnico y aun así producir evidencia visual no aprobable. En el Microbloque 2.5:

- preflight: PASS;
- Functions: 4/4;
- Hosting: PASS;
- integridad: PASS;
- ocho videos y PNG válidos;
- contenido visible: modal `Acuerdos legales` en las ocho rutas.

## Aprendizaje por rol

### Dirección

Una URL disponible no equivale a aprobación visual. La revisión debe confirmar que se ve el contenido operativo esperado y no una barrera previa.

### Operativo

El acuerdo legal es un gate de acceso, no un defecto de Cliente 360, Aseguradoras, Pólizas, Cobros, Ops o Leads. No se corrige reimportando datos ni modificando módulos.

### Asesor

La aceptación legal debe aparecer una vez según las reglas del tenant y del usuario. No puede simularse mediante hardcode ni ocultarse para producir capturas.

### Desarrollo y QA

La evidencia visual debe validar dos capas:

1. validez técnica del archivo: PNG/video, URL, autenticación y ausencia de errores;
2. validez semántica: contenido de la ruta visible y libre de overlays bloqueantes.

## Clasificación correcta

```text
PIPELINE_MECHANISM_FAILURE
```

El capturador no detectó que el modal bloqueaba el contenido.

Clasificación secundaria:

```text
VALIDATOR_STALE
```

El criterio automático aceptaba bytes válidos sin demostrar contenido visible.

No corresponde clasificar como `FUNCTIONAL_DEFECT` mientras no se observe el módulo detrás del modal.

## Regla reusable

Toda evidencia visual acumulativa debe fallar cuando exista un diálogo u overlay bloqueante, aunque:

- la URL sea correcta;
- la sesión esté autenticada;
- el video tenga bytes;
- no existan errores JavaScript.

## Separación de acciones

Cuando producto e integridad pasan y falla solo la captura:

- conservar el preview;
- no redeplegar Functions;
- no redeplegar Hosting;
- no repetir pruebas funcionales cerradas;
- corregir el owner del capturador;
- validar source-only el nuevo contrato;
- solicitar después una recaptura limitada al navegador.

## Seguridad y legal

No debe marcarse una aceptación legal ficticia en datos reales para agilizar una captura. El contrato debe respetar trazabilidad, idempotencia, configuración por tenant y el principio de que el acuerdo se presenta una sola vez.
