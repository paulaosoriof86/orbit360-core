# Continuidad operativa Orbit 360 A&S LAB — post Auth/Preview

Fecha: 2026-07-14

## Estado verificado

- Repo: `paulaosoriof86/orbit360-core`.
- Rama obligatoria: `ays/backend-tenant-lab-v99-20260703`.
- HEAD vigente al cierre inicial: `d9c7a5eb5487820500d432441470e65b8c29d713`.
- PR #5: draft/open, sin merge a `main`.
- Proyecto Firebase LAB: `ays-orbit-360-lab`.
- Canal preview: `orbit360-ays-lab`, no live, expiración renovable 30 días.
- Preview operativo: `https://ays-orbit-360-lab--orbit360-ays-lab-fj1zxnk2.web.app/ays-lab-preview.html`.
- Workflow `Orbit 360 A&S LAB Preview`: éxito previo al bloque de carga.
- Usuario LAB canónico sincronizado: `orbit.lab@demo.com`.
- La contraseña se mantiene únicamente como secreto `ORBIT360_LAB_LOGIN_PASSWORD`; no documentar ni exponer.
- Service account LAB disponible solo como secreto de GitHub; no exponer.
- No producción, no main, no pólizas, no cobros, no finmovs.

## Carga inicial preparada

Único archivo válido:

```txt
CARGA-INICIAL-AYS-LAB-SANITIZADA-20260714.json
```

Conteos esperados:

```txt
Clientes listos: 414
Clientes retenidos: 26
Aseguradoras canónicas: 26
```

Reglas:

- 26 retenidos no se escriben.
- Portales y accesos solo conservan referencias seguras.
- Sin contraseñas, tokens ni secretos.
- 48 filas de accesos mezcladas como contactos fueron eliminadas del payload.
- No usar ningún payload o cargador anterior.

## Próximo bloque exacto

1. Abrir el preview.
2. Iniciar sesión con `orbit.lab@demo.com` y la contraseña secreta vigente.
3. Entrar a `Importar > Carga inicial A&S`.
4. Seleccionar el JSON sanitizado.
5. Ejecutar dry-run.
6. Confirmar conteos y bloqueos.
7. Si bloqueos = 0, confirmar carga.
8. Verificar escritura y rollback.
9. Validar visualmente Cliente360 y Aseguradoras con datos reales.

## Riesgo operativo a revisar antes de confirmar escritura

El dry-run resuelve asesores desde la colección `asesores`. Si faltan Paula, Carlos, Samuel, Fernando, Johanna, Braulio o Nicole, no relajar la validación ni asignar silenciosamente. Resolver el catálogo de asesores en LAB mediante configuración controlada y volver a correr el dry-run.

## Metodología vinculante

- Política 0 manual.
- El computador de Paula no permite `.cmd` ni `.ps1`.
- No entregar ejecutores locales.
- Manual permitido solo para abrir URL, iniciar sesión, seleccionar archivo y validar visualmente.
- Todo lo demás debe ejecutarse vía GitHub, GitHub Actions, Firebase LAB o herramientas directas.
- Trabajar en carriles A/B/C y reportar siempre: carril, avance visible, fuente usada, pendiente y siguiente acción.
- Prioridad actual: carril C con guardas B; después validación visual A.
- No repetir auditorías sin nuevo insumo.
- No volver al seed ficticio para validación operativa.

## Plan operativo siguiente

1. Cerrar carga real de Clientes + Aseguradoras.
2. Validar calidad, asignaciones, duplicados y directorio GT/CO.
3. Validar tres vistas: Dirección desktop, Operativo tablet y Asesor móvil.
4. Corregir solo hallazgos concretos y redeploy preview.
5. Continuar con Pólizas como fuente separada.
6. Después Vehículos, Recibos/Cartera, Cobros/Conciliación y Comisiones, sin mezclar fuentes.
7. Continuar Cotizador/Comparativo, Ops y Leads.
8. Preparar gate de producción únicamente con Auth, roles, scopes, datos reales, smoke, rollback y autorización explícita.

## Academia y Claude

Cada cambio debe documentar impacto en Academia: multirol, scopes, importador, calidad, directorio de aseguradoras, seguridad, preview vs producción y rollback. Todo patrón frontend reusable se traduce a Claude/Academia. Nunca enviar a Claude secretos, datos reales ni backend protegido.

## Incidente operativo y corrección — 2026-07-14

### Hallazgo

El perfil `data/import-initial-profiles.js` y el flujo `modules/importar-initial-tenant-lab.js` existían y el workflow verificaba su presencia y sintaxis, pero la aplicación no los cargaba desde el runtime del preview. El workflow podía quedar verde aunque la tarjeta `Carga inicial A&S` no apareciera en `Importar`.

### Causa raíz

Validación de existencia sin validación de integración/runtime. Faltaba conectar los dos complementos al arranque exclusivo de `firestore-lab` para el tenant `alianzas-soluciones`.

### Fix

Archivo:

```txt
orbit360-platform/core/backend-lab-init.js
```

Cambio:

- versión interna `v1.104` → `v1.105`;
- carga secuencial y única de `data/import-initial-profiles.js` y `modules/importar-initial-tenant-lab.js`;
- activación únicamente en modo `firestore-lab` y tenant `alianzas-soluciones`;
- sin datos reales, secretos, contraseñas ni payload versionado;
- el JSON continúa seleccionándose en el navegador y permanece local hasta la confirmación.

Commit del fix:

```txt
4b670ab3d741205d08a4e0486aef384233b3bf22
```

Validación realizada:

- `node --check` del archivo modificado: PASS;
- rama y PR correctos: PASS;
- no `main`, no producción, no rules, no datos versionados.

### Impacto y estado

- Impacto: desbloquea la aparición del flujo controlado dentro de `Importar`.
- Estado: FIX APLICADO; pendiente verificar el nuevo preview y ejecutar el dry-run autenticado.
- Rollback: revertir únicamente el commit `4b670ab3d741205d08a4e0486aef384233b3bf22` si el cargador LAB provoca una regresión; no tocar `Orbit.store`, Auth, rules ni datos.

### ¿Aplica a Claude/prototipo?

Sí, como patrón reusable de UX: una carga inicial configurada por tenant debe aparecer solo cuando existe un perfil autorizado y debe incluir dry-run, bloqueos, confirmación, reporte y rollback. Claude no recibe el código LAB, secretos, datos reales ni configuración Firebase.

### Academia

Actualizar la ruta de Dirección/Administración con: carga inicial por tenant, selección local del lote, dry-run, diferencia crear/actualizar/retenidos, bloqueos, confirmación reforzada, reporte y rollback. Aclarar que preview no equivale a producción.
