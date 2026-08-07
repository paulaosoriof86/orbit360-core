# Claude acumulado · patrón reusable v15 · Inicio hydration + STOP consumer

## Alcance exportable

Este documento contiene únicamente patrones reutilizables. No incluye secretos, datos reales, credenciales, reglas productivas ni implementación backend protegida.

## REPLICABLE_CLAUDE_ACUMULADO

### 1. Readiness required/optional

Un módulo no debe esperar indiscriminadamente todas las fuentes disponibles. Debe declarar:

- fuentes `required`: bloquean el render si faltan o fallan;
- fuentes `optional`: permiten render degradado si faltan o fallan.

El estado degradado debe ser visible y honesto, sin copy técnico y sin fingir integraciones o datos disponibles.

### 2. Runtime composition observable

No basta con validar estáticamente que un contrato existe. El precheck debe demostrar que ese contrato quedó montado sobre la instancia viva que usa la UI.

Patrón recomendado:

- marker de archivo cargado;
- marker de binding sobre el owner real;
- diagnóstico `mounted()`;
- readiness de fuentes required;
- readiness final de la vista.

Cada paso debe tener checkpoint distinto.

### 3. Rebind ante reemplazo de owner

Cuando una plataforma puede sustituir adaptadores durante bootstrap, un overlay de lectura debe detectar si cambió la identidad del owner y volver a montar sus wrappers sobre la nueva instancia, sin escribir datos.

### 4. Proyección visual read-only

Si una referencia opcional no está disponible como colección durable, la UI puede proyectar etiquetas/responsables desde relaciones canónicas existentes. La proyección:

- no crea registros;
- no corrige datos silenciosamente;
- conserva indicación interna de que es `projectionOnly`;
- no bloquea vistas cuya información esencial está disponible.

### 5. STOP idempotente

Un consumidor de STOP debe aceptar tanto el estado activo como estados parciales ya consumidos. El resultado terminal siempre debe normalizar:

- `consumed=true`;
- `allowedExecutions=0`;
- `authorizationFrozen=true`;
- `replayAllowed=false`;
- capacidades runtime deshabilitadas;
- lifecycle STOP;
- overlay runtime/Hosting deshabilitado;
- nueva autorización requerida.

Repetir el consumidor sobre el mismo estado terminal debe ser seguro y no crear una nueva ejecución.

## ACADEMIA_ACTUALIZAR

Enseñar la diferencia entre:

- defecto funcional de UI;
- fuente requerida realmente faltante;
- fuente opcional degradada;
- contrato correcto pero no montado en runtime;
- validador que no observa la composición real;
- cierre parcial de lifecycle/pipeline.

## BACKEND_PROTEGIDO_NO_CLAUDE

No transferir a Claude:

- scripts exactos de consumo de autorización;
- lifecycle/overlay concretos del tenant;
- relay GitHub Actions exacto;
- scripts de credenciales, Firebase, Hosting, backup o rollback;
- paths o contratos protegidos de LAB/productivo.

Para Claude solo se acumula el patrón abstracto de idempotencia y observabilidad.

## TENANT_AYS_ONLY

Ninguno de estos patrones debe hardcodear A&S. El comportamiento reusable se resuelve por contrato de módulo, store y configuración del tenant.
