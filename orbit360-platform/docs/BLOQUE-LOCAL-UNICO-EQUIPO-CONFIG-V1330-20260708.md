# BLOQUE LOCAL UNICO EQUIPO/CONFIG V1330 — 2026-07-08

## Proposito

Preparar el siguiente bloque para ejecutar cuando Paula vuelva al computador, sin reconstruir instrucciones ni repetir auditorias.

Este documento no modifica codigo funcional. Es una especificacion operativa para el patch local seguro.

## Estado actual

PR #5 sigue en draft, sin merge y sin deploy.

Rama activa:

```txt
ays/backend-tenant-lab-v99-20260703
```

Head remoto documentado al momento de preparar este bloque:

```txt
8ca6223587f84cfdabfc37372f54fd59cdb2bd4b
```

Worktree local reportado antes por Paula:

```txt
C:\Users\paula\OneDrive\Documentos\GitHub\orbit360-core\_codex_hotfix_portal_v1330
```

HEAD local reportado:

```txt
36d3afad316e3ecc4bf4ca46aa5227d87e3bd0d3
```

Por lo tanto, antes de parchar debe confirmarse si el worktree local esta actualizado contra la rama remota o si debe traer commits documentales recientes.

## Restricciones

No hacer:

- No commit automatico.
- No push automatico.
- No deploy.
- No merge.
- No main.
- No tocar backend protegido.
- No tocar `index.html`.
- No tocar herramientas backend salvo autorizacion explicita.

Archivos protegidos:

```txt
orbit360-platform/data/store.js
orbit360-platform/data/store-firestore-lab.local.js
orbit360-platform/core/backend-lab-loader.js
orbit360-platform/core/backend-lab-init.js
orbit360-platform/core/backend-lab-security-guard.js
orbit360-platform/core/auth.js
orbit360-platform/core/importa.js
firestore.rules
tools/orbit360-*
orbit360-platform/index.html
```

## Archivos permitidos para este bloque

Solo:

```txt
orbit360-platform/modules/equipo.js
orbit360-platform/modules/configuracion.js
orbit360-platform/docs/CIERRE-EQUIPO-CONFIG-GATES-V1330-20260707.md
```

Opcional solo si se documenta resultado:

```txt
orbit360-platform/docs/REGISTRO-ACCIONES-CELULAR-V1330-20260708.md
orbit360-platform/docs/PLAN-TRABAJO-ACTUALIZADO-V1330-20260708.md
```

## Objetivo Equipo

Modulo:

```txt
orbit360-platform/modules/equipo.js
```

Debe quedar:

1. Crear usuario exige motivo administrativo.
2. Editar usuario exige motivo administrativo.
3. Inactivar usuario exige motivo administrativo.
4. Cambiar roles exige motivo administrativo.
5. Cambiar modulos override exige motivo administrativo.
6. Cambiar permisos por rol/modulo/accion exige motivo administrativo.
7. Reset de permisos exige confirmacion reforzada y motivo.
8. No se puede dejar el tenant sin administrador activo.
9. Se registra actividad/auditoria si existe coleccion `actividades` o equivalente disponible.
10. Copy visible no debe decir `Auth backend`, `backend`, `LAB` ni terminos tecnicos.

Copy recomendado:

- `Auth backend` -> `canal seguro autorizado`.
- `invitacion pendiente de Auth backend` -> `acceso pendiente de canal seguro autorizado`.

## Objetivo Configuracion

Modulo:

```txt
orbit360-platform/modules/configuracion.js
```

Debe quedar:

1. Pestaña interna Orbit oculta o redirigida si rol no autorizado.
2. Cambio de plan exige confirmacion, motivo y registro.
3. Guardar modulos activos exige motivo y registra antes/despues.
4. Reset de configuracion exige confirmacion reforzada, motivo y registro.
5. Corregir residual visual `itar</button></td>`.
6. Copy de APIs/credenciales no debe prometer cifrado/conexion productiva si no hay backend seguro activo.
7. Integraciones deben mostrarse como preparadas/pendientes si no estan conectadas.

Copy recomendado:

- `Las credenciales se guardan cifradas... Nunca se exponen en el front` -> `Las credenciales deben configurarse mediante canal seguro autorizado. Esta pantalla prepara la conexion, define permisos minimos y evita exponer secretos en el navegador.`

## Regla tecnica del patch v2

No usar reemplazos por bloques exactos largos.

Usar:

- reemplazos por funciones pequenas;
- patrones cortos;
- validacion antes de escribir;
- backup previo;
- si no encuentra un patron, detener y reportar, no escribir parcialmente;
- despues de escribir, ejecutar `node --check` inmediatamente.

## Orden local obligatorio

1. Ir al worktree local correcto.
2. Confirmar rama/head.
3. Confirmar que no hay protegidos modificados.
4. Crear backup de `equipo.js` y `configuracion.js`.
5. Aplicar patch v2 tolerante.
6. Ejecutar:

```txt
node --check orbit360-platform/modules/equipo.js
node --check orbit360-platform/modules/configuracion.js
node tools/orbit360-validar-backend-lab-contrato.mjs
```

7. Confirmar status protegidos vacio.
8. Confirmar cambios esperados:

```txt
M orbit360-platform/modules/equipo.js
M orbit360-platform/modules/configuracion.js
?? orbit360-platform/docs/CIERRE-EQUIPO-CONFIG-GATES-V1330-20260707.md
```

9. Copiar reporte al portapapeles.
10. Pegar reporte en ChatGPT.

## Criterio de exito

Exito solo si:

- `node --check equipo.js` sin errores.
- `node --check configuracion.js` sin errores.
- Contrato backend LAB: `Errores: 0` y `RESULTADO: OK`.
- Protegidos limpios.
- No hay cambios fuera de los archivos permitidos.
- El documento de cierre queda creado.

## Criterio de bloqueo

Bloquear si:

- Rama/head no puede confirmarse.
- Hay protegidos modificados.
- `node --check` falla.
- El patch intenta tocar `index.html`, `data/store.js`, `core/auth.js`, `core/importa.js`, `tools` o `firestore.rules`.
- Se detecta que el worktree local quedo detras del remoto y no se puede sincronizar sin riesgo.

## Documento de cierre esperado

Crear:

```txt
orbit360-platform/docs/CIERRE-EQUIPO-CONFIG-GATES-V1330-20260707.md
```

Debe incluir:

- fecha;
- archivos modificados;
- resumen Equipo;
- resumen Configuracion;
- validaciones ejecutadas;
- protegidos limpios;
- impacto comercializable;
- impacto Claude;
- impacto Academia;
- estado final.

## Impacto Claude

Claude debe conservar estos patrones:

- acciones administrativas con motivo y confirmacion;
- copy honesto;
- secciones internas ocultas por rol;
- no simular integraciones activas;
- no pedir ni guardar secretos reales en frontend;
- no mostrar terminos tecnicos visibles al cliente/admin comercial.

## Impacto Academia

Actualizar rutas/microlecciones:

### Direccion/Admin

- Gestion segura de usuarios.
- Roles y permisos.
- Ultimo administrador activo.
- Cambios de plan y modulos.
- Trazabilidad de motivos administrativos.

### Marketing/Integraciones

- Preparado vs enviado/publicado/confirmado.
- Integracion pendiente vs integracion activa.
- Secretos y credenciales solo por canal seguro.

### Finanzas/Conciliacion

- Validar propuesta no aplica pago.
- Pais/moneda obligatorios.
- No mezclar fuentes ni monedas.

## Estado

Preparado desde celular como documento operativo. Pendiente ejecucion local cuando Paula tenga computador.
