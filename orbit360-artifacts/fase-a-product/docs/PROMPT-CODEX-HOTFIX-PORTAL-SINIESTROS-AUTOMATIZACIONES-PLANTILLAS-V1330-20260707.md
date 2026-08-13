# PROMPT CODEX — Hotfix portal/siniestros/automatizaciones/plantillas v1330 — 2026-07-07

## Contexto obligatorio

Trabaja en:

```txt
Repo: paulaosoriof86/orbit360-core
Rama: ays/backend-tenant-lab-v99-20260703
PR: #5 draft/open
Merge: NO
Deploy: NO
Main: NO
Producción: NO
Datos reales: NO
Secretos: NO
```

Leer antes de tocar:

```txt
orbit360-platform/docs/DOCUMENTO-MAESTRO-CONSOLIDADO-ORBIT360-AYS-20260704.md
orbit360-platform/docs/ADENDUM-ACADEMIA-PROFUNDA-INTERACTIVA-ORBIT360-AYS-20260704.md
orbit360-platform/docs/ADDENDUM-MAESTRO-PATRONES-REUTILIZABLES-CLAUDE-BACKEND-ORBIT360-20260707.md
orbit360-platform/docs/AUDITORIA-BLOQUE-OPS-LEADS-PORTAL-SINIESTROS-PLANTILLAS-AUTOMATIZACIONES-V1330-20260707.md
```

No tocar archivos protegidos:

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
```

Objetivo: hotfix quirúrgico de honestidad operativa, fechas vivas, moneda y trazabilidad. No rediseñar módulos ni refactorizar completo.

---

## Archivos permitidos

Solo modificar:

```txt
orbit360-platform/modules/portal.js
orbit360-platform/modules/siniestros.js
orbit360-platform/modules/automatizaciones.js
orbit360-platform/modules/plantillas.js
```

Crear documentación de cierre:

```txt
orbit360-platform/docs/HOTFIX-PORTAL-SINIESTROS-AUTOMATIZACIONES-PLANTILLAS-V1330-20260707.md
```

---

## Cambios requeridos

### 1. Portal — pólizas activas vs histórico

Archivo:

```txt
orbit360-platform/modules/portal.js
```

Cambiar filtro actual:

```js
p.estado !== 'Cancelada'
```

por filtro estricto:

```js
function esPolizaActivaPortal(p){
  return p && (p.estado === 'Vigente' || p.estado === 'Por renovar');
}
```

y usarlo para las pólizas mostradas como activas.

No ocultar históricos de forma destructiva. Si no se implementa pestaña histórica en este hotfix, no mostrar estados no renovables como activos.

### 2. Portal — reportar pago sin fecha fija

Reemplazar:

```js
vence: '2026-06-26'
```

por:

```js
vence: Orbit.ui.today()
```

O, si existe helper SLA, usar fecha viva configurable. No dejar literal fija.

### 3. Portal — adminNotif no afirma WhatsApp/correo enviado

Cambiar texto:

```txt
La notificación aparece en el portal del cliente y se envía por WhatsApp/correo.
```

por:

```txt
La notificación aparece en el portal del cliente. WhatsApp/correo quedan pendientes de integración o canal conectado.
```

Cambiar toast:

```txt
Notificación enviada
```

por:

```txt
Notificación registrada en portal
```

No afirmar envío real.

### 4. Portal — WhatsApp del asesor

Actualmente `soporteAsesor(cli)` arma `wa.me` con teléfono del cliente.

Debe usar teléfono/WhatsApp del asesor:

```js
const wa = String((ase && (ase.telefono || ase.whatsapp)) || '').replace(/\D/g, '');
```

Si no hay teléfono de asesor, mostrar estado honesto:

```txt
Canal pendiente de configuración
```

No crear enlace `wa.me/` vacío.

### 5. Portal — subir documento no afirma carga real

Mientras no haya Storage/backend real, el texto debe indicar:

```txt
Tu documento queda registrado en el expediente para revisión del equipo. La carga real del archivo requiere Storage/backend conectado.
```

Toast:

```txt
Documento registrado en expediente · revisión pendiente
```

No afirmar que el archivo binario fue guardado si solo se guarda metadata.

### 6. Siniestros — no sumar monedas crudas

Archivo:

```txt
orbit360-platform/modules/siniestros.js
```

El KPI `Indemnización pagada` no debe sumar `montoAprobado` crudo con moneda actual.

Cambiar a una de estas opciones:

Opción preferida para hotfix mínimo:

```js
const pagado = arr
  .filter(r => r.estado === 'Pagado')
  .reduce((s, r) => s + q.norm(r.montoAprobado || 0, ((S().get('clientes', r.clienteId) || {}).moneda || Orbit.q.monedaPais())), 0);
```

Y en foot agregar claridad:

```txt
normalizado / no mezclar monedas
```

Si `q.norm` no corresponde para este indicador, separar por moneda/país y mostrar por país. No dejar suma cruda.

### 7. Siniestros — no asumir aprobado = reclamado

Cambiar esta regla:

```js
if (['Aprobado', 'Pagado'].includes(nuevoEst) && !r.montoAprobado) patch.montoAprobado = r.montoReclamado;
```

por una regla honesta:

```js
if (['Aprobado', 'Pagado'].includes(nuevoEst) && !r.montoAprobado) {
  patch.montoAprobadoPendiente = true;
}
```

O no tocar `montoAprobado` y registrar en bitácora:

```txt
Monto aprobado pendiente de confirmar
```

No asignar monto reclamado como aprobado sin confirmación.

### 8. Siniestros — fecha viva en nuevo reclamo

Reemplazar:

```js
ts: '2026-06-24 ' + new Date().toTimeString().slice(0, 5)
```

por:

```js
ts: Orbit.ui.today() + ' ' + new Date().toTimeString().slice(0, 5)
```

### 9. Automatizaciones — escaneo manual no afirma envío

Archivo:

```txt
orbit360-platform/modules/automatizaciones.js
```

En `#aut-scan`, cambiar mensajes:

```txt
campaña de cobro enviada
campaña enviada
notificado al equipo
recordatorio al asesor
```

por:

```txt
campaña de cobro preparada · evento registrado para integración
campaña de renovación preparada · evento registrado para integración
evento registrado para notificar al equipo
recordatorio preparado para asesor
```

Toast final debe decir:

```txt
Escaneo completado. Eventos preparados/registrados; envío real depende del proveedor conectado.
```

No afirmar envío real.

### 10. Plantillas — WhatsApp con trazabilidad honesta

Archivo:

```txt
orbit360-platform/modules/plantillas.js
```

El botón WhatsApp no debe abrir `wa.me` directo sin estado/trazabilidad.

Hotfix mínimo aceptable:

- Validar que haya cliente y teléfono.
- Insertar actividad:

```js
titulo: 'Mensaje de plantilla preparado'
detalle: '<nombre plantilla> · WhatsApp Web abierto'
```

- Abrir `wa.me`.
- Mostrar toast:

```txt
Chat abierto en WhatsApp Web; confirma el envío en WhatsApp.
```

Opcional mejor:

Usar `Orbit.notify.cliente()` si está disponible, pasando `canal:'whatsapp'`, asunto y mensaje. Pero no romper la UX actual.

---

## Validaciones obligatorias

Ejecutar:

```bash
node --check orbit360-platform/modules/portal.js
node --check orbit360-platform/modules/siniestros.js
node --check orbit360-platform/modules/automatizaciones.js
node --check orbit360-platform/modules/plantillas.js
node tools/orbit360-validar-backend-lab-contrato.mjs
```

Esperado:

```txt
0 errores JS
Contrato backend LAB OK
0 errores
1 warning esperado del guard LAB en index si aparece
```

Buscar que no queden literales problemáticas:

```bash
grep -R "2026-06-26\|2026-06-24\|campaña enviada\|notificado al equipo\|Notificación enviada\|se envía por WhatsApp/correo" orbit360-platform/modules/portal.js orbit360-platform/modules/siniestros.js orbit360-platform/modules/automatizaciones.js orbit360-platform/modules/plantillas.js
```

No debe haber coincidencias problemáticas.

---

## Documentación de cierre

Crear:

```txt
orbit360-platform/docs/HOTFIX-PORTAL-SINIESTROS-AUTOMATIZACIONES-PLANTILLAS-V1330-20260707.md
```

Debe incluir:

```txt
- commit aplicado
- archivos modificados
- validaciones ejecutadas
- confirmación de no tocar backend protegido
- impacto Claude/prototipo reusable
- impacto Academia
```

Impacto Claude/Academia obligatorio:

```txt
Portal: reportar pago no aplica pago.
Portal: documento subido registra soporte, no valida ni guarda archivo real sin Storage.
Siniestros: reclamado ≠ aprobado ≠ pagado.
Automatizaciones: preparado/registrado ≠ enviado por proveedor.
Plantillas: WhatsApp Web abierto ≠ mensaje entregado.
```

---

## Commit esperado

```txt
fix(ays): honestidad portal siniestros automatizaciones plantillas v1330
```

No incluir archivos no relacionados, `_backups/`, reportes locales ni docs eliminados localmente.