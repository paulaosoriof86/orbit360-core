# Hotfix — Aseguradoras borrar/desactivar seguro v1330

Fecha: 2026-07-07
Rama: `ays/backend-tenant-lab-v99-20260703`
PR: #5 draft/open

## Objetivo

Evitar pérdida de trazabilidad en el directorio de aseguradoras.

La acción segura debe ser:

```txt
Desactivar vinculación cuando hay historial.
Borrar solo si no existen vínculos operativos.
```

## Archivo modificado

```txt
orbit360-platform/modules/aseguradoras.js
```

## Cambios funcionales aplicados

### 1. Detección de vínculos

Se agregaron helpers para revisar vínculos contra:

- pólizas;
- cobros;
- siniestros;
- reclamos;
- documentos;
- comisiones.

### 2. Desactivar vinculación con confirmación

Al apagar la vinculación de una aseguradora, la UI ahora:

- explica que desactivar conserva histórico;
- muestra vínculos actuales detectados;
- permite cancelar y revertir el switch;
- registra actividad administrativa.

### 3. Borrado bloqueado si hay vínculos

Si la aseguradora tiene vínculos operativos, no se borra.

La UI ofrece desactivar vinculación como alternativa segura.

### 4. Borrado permitido solo sin vínculos

Si no hay vínculos operativos detectados:

- pide motivo obligatorio;
- pide confirmación final;
- registra actividad administrativa;
- borra del directorio.

### 5. Guardar cambios sensibles con motivo

Guardar ficha de aseguradora ahora pide:

- motivo del cambio;
- confirmación;
- deja claro que los portales solo guardan referencia de credencial y no contraseñas reales.

### 6. Credenciales

Se mantiene el patrón seguro:

```txt
credentialRef = backend_required
```

No se guardan contraseñas reales en frontend.

## Validación local previa al update remoto

Antes de subir el reemplazo funcional se generó archivo local temporal y se validó:

```txt
node --check aseguradoras_hotfix.js: OK
```

## Validación remota desde GitHub

Se verificó que el archivo remoto contiene:

- helpers `safeAll`, `vinculos`, `vinculosTxt`;
- actividad administrativa `adminAct`;
- confirmación de desactivar vinculación;
- borrado bloqueado con vínculos;
- motivo obligatorio para borrado sin vínculos;
- credencial pendiente de bóveda segura.

## Pendiente

Falta validación local final en repo completo:

```txt
node --check orbit360-platform/modules/aseguradoras.js
node tools/orbit360-validar-backend-lab-contrato.mjs
```

No se debe considerar deployable hasta smoke local.

## Impacto Claude/prototipo

Claude debe conservar:

- `Desactivar vinculación` como alternativa a borrar.
- Borrado bloqueado si hay historial.
- Motivo obligatorio para acciones críticas.
- Bóveda/credencial segura como referencia backend.
- No mostrar contraseñas ni secretos.

## Impacto Academia

Academia debe enseñar:

- Directorio de aseguradoras no es histórico borrable libremente.
- Aseguradora vinculada activa aparece en cotización/emisión.
- Aseguradora desactivada conserva trazabilidad.
- Borrar solo aplica a registros sin vínculos operativos.
- Cuentas, portales y comisiones son datos sensibles.

## Estado

Hotfix funcional aplicado.
Pendiente validación local/smoke.

No se tocó backend protegido.
No se tocó `index.html`.
No merge.
No deploy.
No datos reales.
No secretos.
