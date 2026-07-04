# Registro backend continuidad — Portal acceso, PWA, invitaciones y calidad de datos

Fecha: 2026-07-04
Proyecto: Orbit 360 A&S
Rama: `ays/backend-tenant-lab-v99-20260703`
PR: #5 draft

## Bloque trabajado

Se documentó el bloque de acceso al Portal de Clientes, creación/habilitación de usuario, URL directa, anclaje web, PWA, invitaciones a clientes nuevos/existentes y gestión de datos faltantes.

## Hallazgos/preguntas de Paula

Paula solicitó definir:

- cómo entra el cliente al Portal;
- cuándo se crea usuario de Portal;
- si habrá URL para web/link directo;
- cómo se instala como PWA;
- cómo invitar automáticamente a clientes nuevos/pólizas nuevas;
- cómo invitar individual o masivamente clientes existentes;
- cómo solicitar datos faltantes desde Calidad de Datos;
- cómo notificar al asesor;
- cómo mantener trazabilidad.

## Archivos creados

- `CONTRATO-PORTAL-CLIENTES-ACCESO-USUARIOS-PWA-AYS-20260704.md`
- `CONTRATO-INVITACIONES-PORTAL-CLIENTES-AYS-20260704.md`
- `CONTRATO-CALIDAD-DATOS-SOLICITUD-DATOS-FALTANTES-AYS-20260704.md`
- `PLAN-BACKEND-PORTAL-AUTH-PWA-INVITACIONES-CALIDAD-DATOS-20260704.md`
- `PENDIENTES-CLAUDE-PORTAL-ACCESO-PWA-INVITACIONES-CALIDAD-DATOS-V123-20260704.md`

## Decisiones

1. Portal debe tener acceso por web, URL directa y PWA.
2. Usuario de Portal se crea/prepara al crear cliente/póliza, al migrar cliente o al habilitar manualmente.
3. Invitaciones deben poder ser automáticas, individuales y masivas.
4. No enviar contraseñas planas; usar magic link, link de activación, OTP o creación de contraseña cuando Auth real esté listo.
5. Calidad de Datos debe permitir solicitar faltantes, no solo mostrarlos.
6. Asesor debe ser notificado cuando su cliente es invitado, activa portal, responde datos, reporta pago o solicita gestión.
7. Todo debe quedar trazado.

## Nota sobre acceso de ChatGPT

ChatGPT sí puede actualizar documentación y archivos de repo mediante el conector, como se hizo en este bloque. Lo que quedó bloqueado antes fue subir un script ejecutable específico por control de seguridad del conector. No fue falta de acceso al repo.

## Próximo paso recomendado

Auditar candidata activa v1.123 para ver estado actual de:

- `modules/portal.js`;
- `modules/cliente360.js`;
- `modules/calidad.js`;
- `modules/equipo.js`;
- `modules/configuracion.js`;
- `modules/notificaciones.js`;
- `core/auth.js`;
- `core/config.js`;
- `data/seed.js`;
- `index.html`;
- manifest/PWA si existe.

## Estado

Documentado. No se tocó `data/store.js`, Firestore, deploy, main ni datos reales.
