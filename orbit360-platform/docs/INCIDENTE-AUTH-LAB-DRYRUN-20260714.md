# Incidente Auth LAB antes de dry-run — 2026-07-14

## Carril

C — datos reales, con guardas B de autenticación y Firestore LAB.

## Necesidad

El preview mostraba el chrome de la aplicación y permitía abrir `Carga inicial A&S`, pero el dry-run respondía `Inicia sesión` porque no existía una sesión Firebase LAB válida.

## Evidencia

- UI visible con identidad estática `Andrea Beltrán`.
- Archivo sanitizado seleccionado y validado.
- Gate de dry-run bloqueado por ausencia de `Orbit.store._labStatus().auth.uid`.
- No se escribió ningún dato.

## Causa raíz

1. La identidad estática del chrome podía aparentar una sesión válida aunque Firebase Auth aún no hubiera confirmado usuario.
2. La carga inicial podía abrirse antes de autenticar.
3. Los listeners Firestore se intentaban adjuntar antes de Auth y no se rearmaban explícitamente al iniciar sesión.
4. El acceso directo a `index.html` podía conservar runtime/PWA anterior.

## Corrección

Archivos:

- `core/backend-lab-auth-guard.js`
- `core/backend-lab-init.js`
- `ays-lab-preview.html`
- `.github/workflows/orbit360-ays-lab-preview.yml`

Cambios:

- forzar login Firebase LAB si no existe usuario canónico;
- impedir abrir dry-run/escritura con sesión ausente;
- rechazar una cuenta distinta de `orbit.lab@demo.com`;
- retirar la identidad estática demo del chrome en modo LAB;
- desmontar y rearmar snapshots al confirmar Auth;
- limpiar Service Worker y Cache Storage desde la puerta oficial del preview;
- validar sintaxis del guard en CI.

## Seguridad

- no se expuso contraseña;
- no se versionaron secretos;
- no se tocó producción ni `main`;
- no se escribieron Clientes ni Aseguradoras durante el incidente;
- PR #5 permanece draft/open.

## Estado

Fix aplicado en rama `ays/backend-tenant-lab-v99-20260703`. Pendiente confirmar redeploy del canal y repetir únicamente el acceso por `ays-lab-preview.html`, login LAB y dry-run.

## ¿Aplica a Claude/prototipo?

Sí, como patrón UX: nunca mostrar una plataforma operable ni permitir abrir una carga controlada cuando la autenticación real requerida no está confirmada. La identidad visible debe corresponder a la sesión efectiva. No compartir código Firebase, secretos ni datos reales.

## Academia

Añadir en rutas de Dirección/Administración:

- diferencia entre sesión visual y Auth real;
- preview vs producción;
- carga inicial solo con usuario autorizado;
- bloqueo previo a dry-run;
- reconexión de datos tras autenticación;
- rollback y ausencia de escritura ante un gate fallido.
