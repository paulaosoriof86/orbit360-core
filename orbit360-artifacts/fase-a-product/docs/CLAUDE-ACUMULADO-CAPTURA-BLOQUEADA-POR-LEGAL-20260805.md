# CLAUDE ACUMULADO — CAPTURA BLOQUEADA POR ESTADO LEGAL

Fecha: 2026-08-05  
Clasificación: `REPLICABLE_CLAUDE_ACUMULADO`

## Patrón reusable

Una validación visual no debe considerar PASS únicamente porque:

- la ruta final coincide;
- la autenticación terminó;
- el video y el frame tienen tamaño válido;
- no existen errores de página.

Debe verificar además que no exista un overlay bloqueante que impida observar el contenido de la ruta.

## Hallazgo

El arnés aislado abrió ocho contextos nuevos. En cada contexto apareció el modal `Acuerdos legales`. Los ocho PNG eran técnicamente válidos, pero semánticamente repetían la misma barrera y no demostraban Cliente 360, Aseguradoras, Pólizas, Cobros, Conciliaciones, Ops, Leads o Importar.

## Correctivo reusable

Antes de cerrar el contexto y extraer el frame:

1. detectar diálogos u overlays visibles;
2. identificar barreras legales, onboarding, permisos o autenticación incompleta;
3. fallar con un código específico de mecanismo;
4. conservar la URL cuando producto e integridad ya pasaron;
5. impedir que la corrección de captura redepliegue backend o Hosting.

Código contractual aplicado:

```text
PIPELINE_MECHANISM_FAILURE:ROUTE_<route>_LEGAL_MODAL_BLOCKING_CAPTURE
```

## No replicar

- datos, usuarios o identidades A&S;
- tenant real;
- credenciales o secretos;
- aceptación legal ficticia;
- backend protegido;
- reglas Firestore;
- URL privada como configuración genérica.

## Arquitectura recomendada

Separar tres estados:

```text
PRODUCT_AND_INTEGRITY_PASS
VISUAL_CAPTURE_TECHNICAL_PASS
MANUAL_ROUTE_CONTENT_APPROVED
```

El GO visual final solo existe cuando los tres son verdaderos.

## Impacto en Academia

Enseñar la diferencia entre archivo de evidencia válido y evidencia semánticamente útil. Un PNG correcto puede ser inválido para aprobación cuando muestra un modal, pantalla de carga, error de permisos o contenido técnico.
