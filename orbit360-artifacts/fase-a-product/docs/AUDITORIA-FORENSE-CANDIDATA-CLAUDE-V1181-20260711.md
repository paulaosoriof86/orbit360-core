# AUDITORÍA FORENSE PROFUNDA — CANDIDATA CLAUDE v1.181

Fecha: 2026-07-11  
Proyecto: Migración Alianzas y Soluciones — Orbit 360  
Candidata: `Prototype Development Request - 2026-07-11T064855.455.zip`  
SHA256: `aaee77c448a63fe736faa0815acd0180452a820215daff6fd9a45a01049353cc`  
Rama obligatoria: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open, sin merge, deploy ni producción  
Carril auditado: A, validado contra B/C

## Decisión

La afirmación de entrega —“todos los pendientes accionables de Carril A están cerrados; lo que resta depende de archivos protegidos”— **no queda validada**.

v1.181 corrige varios hallazgos de la candidata anterior y mantiene una estructura incremental limpia, pero conserva bloqueos de UX, permisos, integridad, contratos, Academia y documentación que son accionables en archivos no protegidos.

```txt
ESTRUCTURA ZIP: APROBADA
SINTAXIS JS/MJS: APROBADA
ARCHIVOS B PROTEGIDOS: SIN CAMBIOS
UX ASEGURADORAS: APROBADA PARCIAL
CONTRATO _fuentes: RECHAZADO
ROL ACTIVO / MULTIROL: RECHAZADO
EDICIÓN / AUDITORÍA: RECHAZADO
GATE COTIZADOR / COMPARATIVO: RECHAZADO
DTO COTIZACIONNORMALIZADA: RECHAZADO
ESTADO IA / CREDENCIALES: RECHAZADO
ACADEMIA: APROBADA PARCIAL
DOCUMENTACIÓN DE ENTREGA: RECHAZADA
EMPALME DIRECTO: NO AUTORIZADO
NUEVO BASELINE: NO AUTORIZADO
```

## Integridad del paquete

- 98 archivos.
- 0 agregados y 0 eliminados frente a la candidata anterior.
- 11 modificados frente a la candidata anterior.
- Sin traversal, symlinks o cifrado.
- Referencias locales de `index.html` presentes.
- Sin IDs estáticos duplicados detectados.
- Todos los `.js/.mjs` pasan `node --check`.
- `data/store.js`, `core/auth.js` y `core/importa.js` permanecen idénticos a la candidata base.

## P0 accionables de Carril A

### 1. `_fuentes` no conserva el contrato vivo

v1.181 vuelve a exportar `_fuentes`, pero reduce tipos, estados y dimensiones. Conserva solo `pais/moneda/ramo/producto`; la rama viva ya contempla familia, subtipo, segmento, tipo de riesgo, vehículo, uso y plan. El evaluador de v1.181 devuelve un estado simplificado y cambia firmas/retornos. La coincidencia es nominal, no contractual.

Corrección: montar la nueva UX encima del motor vivo, conservando firmas, dimensiones, estados canónicos, compatibilidad legacy y capacidades separadas para tarifas, reglas, presentación, Comparativo, condiciones y casos de prueba.

### 2. Permisos leen rol base, no rol activo

`modules/aseguradoras.js` y `modules/academia.js` consultan `Orbit.auth.user().rol`. El selector “ver como” usa `Orbit.session.rol()`. Una persona con Auth Dirección puede cambiar a vista Asesor y seguir conservando acciones administrativas. También falta resolución consistente de SuperAdmin/AdminTenant.

Corrección: resolver primero `Orbit.session.rol()`, después Auth; aplicar extras/restricciones/scope; ocultar y bloquear handlers.

### 3. Importar permanece visible sin permiso

El botón `Importar` se renderiza para todos los roles con acceso al módulo y abre `Orbit.importa.open('directorio-aseguradoras')`. Solo `Nueva aseguradora` está condicionado.

Corrección: permiso en render y handler; estado solo lectura para roles sin administración.

### 4. Escrituras inmediatas sin motivo/diff/rollback

Contactos, portales, cuentas, requisitos, productos, segmentos, planes, porcentajes de comisión y documentos escriben al store durante `change` o al agregar filas. Cerrar el modal no revierte. No existe flujo completo Draft → Revisar → Motivo → Confirmar → Guardar.

Corrección: trabajar sobre draft local; guardar una sola vez; motivo obligatorio; registro antes/después; cancelar sin modificar store.

### 5. Borrado seguro incompleto

`vinculos(id)` revisa pólizas, cobros, comisiones y reclamos, pero no cubre documentos/conocimiento, cotizaciones, comparativos, gestiones, actividad, historial, productos/planes y otras referencias. Si no encuentra esos cuatro vínculos, ejecuta `remove`. La auditoría alojada dentro de la entidad desaparece junto con ella.

Corrección: desactivar conservando histórico; si existe borrado excepcional, auditoría externa previa, motivo, confirmación reforzada y todas las relaciones.

### 6. Gate de Cotizador es default-allow

El código excluye un ramo únicamente cuando `cotizador === false`; ausencia de configuración equivale a habilitado. No exige habilitación explícita, conocimiento validado, tarifa/reglas/presentación vigentes, país/moneda/producto/plan/segmento ni segundo gate.

Corrección: default-deny y habilitación explícita separada para Cotizador y Comparativo.

### 7. DTO `CotizacionNormalizada` pierde datos

El DTO define fraccionamiento, suma, deducible y exclusiones, pero el envío desde Cotizador no pasa cliente, clienteId, asesor, fraccionamiento, suma asegurada, coberturas, deducible, condiciones ni exclusiones. Una cotización de 12 pagos puede llegar al Comparativo como contado. PDF/manual tampoco usan de forma consistente el mismo DTO.

Corrección: DTO completo y único para Cotizador/PDF/manual, con pruebas de preservación.

### 8. `credentialRef` todavía se interpreta como API key

Automatizaciones guarda `credentialRef:'backend_required'`, pero lo envía a `Orbit.ia.conectar` como segundo parámetro. `core/ia.js` lo recibe como `key`, lo persiste en localStorage y marca `conectado:!!key`. Resultado: referencia opaca guardada como key y estado conectado falso.

Corrección: no invocar `conectar` con credentialRef; separar configurado, pendiente de bóveda, conectado y verificado; no persistir referencia como secreto.

### 9. Logo continúa como Data URL

La miniatura se genera con `readAsDataURL` y `canvas.toDataURL`, y queda embebida en la entidad. Reducir tamaño no convierte binario/base64 en referencia documental.

Corrección: `logoRef/backend_required` o asset ficticio controlado; no persistir Data URL en entidad operativa.

## P1 accionables

- IDs documentales generados durante normalización, potencialmente inestables.
- Normalización simplificada pierde trazabilidad y dimensiones profundas.
- Grupo puede figurar habilitado con una sola fuente etiquetada, sin conjunto suficiente.
- Esquema de productos/documentos/cuentas/actividad aún incompleto frente al paquete.
- KPIs confían en estados manuales y no en vigencia/conexión verificada.
- Academia muestra metadata a nivel de curso, no por cada lección.
- El recurso `Guía de Aseguradoras.pdf` se declara, pero no se entrega como archivo real.
- README/CHANGELOG y documentos de continuidad permanecen desactualizados.
- No hay manifiesto, SHA base, diff formal, inventario, matriz reproducible ni evidencia responsive entregada.

## Verificación visual

Se intentó smoke automatizado local, pero Chromium bloqueó `localhost` y `file://` por política administrativa (`ERR_BLOCKED_BY_ADMINISTRATOR`). Se verificaron estructura y sintaxis de forma independiente; la afirmación “verificado en vivo” de la candidata no sustituye evidencia reproducible.

## Reutilizable

- Directorio operativo como portada.
- Ficha por pestañas.
- Tarifas/conocimiento como sección secundaria.
- Contactos, plataformas, cuentas y productos.
- Mejor copy operativo.
- Eliminación del campo visible de contraseña.
- Patrón conceptual `credentialRef`, después de corregir su consumo.
- CSS responsive.
- Curso de Aseguradoras, después de corregir rol y profundidad.
- Seed más ficticio que la candidata anterior.
- Estructura incremental sin tocar protegidos.

## Carriles

### A — continúa abierto

```txt
compatibilidad _fuentes
rol activo/multirol
permisos Importar
draft/cancelación/motivo/diff
borrado seguro
gate default-deny
DTO completo
estado honesto IA
logo por referencia
Academia profunda por lección
documentación/evidencia
```

### B — después de cerrar A

```txt
empalme selectivo
conservación backend LAB
Auth/Firestore/Orbit.store
bóveda real
validadores y smoke contractual
index protegido
```

### C — separado

```txt
dry-run directorios GT/CO
fuentes reales de aseguradoras
tarifas/cotizadores
trazabilidad y validación humana
```

## Orden v1.182

1. Partir de v1.181.
2. Reconciliar `_fuentes` con contrato vivo.
3. Usar rol activo `Orbit.session`.
4. Aplicar permiso a Importar y handlers.
5. Ficha como draft local con Guardar/Cancelar.
6. Motivo y diff antes/después.
7. Desactivación segura en lugar de borrado normal.
8. Gate explícito default-deny.
9. DTO completo y común.
10. No pasar credentialRef como key.
11. No almacenar logo base64.
12. Academia por rol activo y por lección.
13. Entregar recurso real o retirarlo.
14. Actualizar README/CHANGELOG/manifiesto/diff/matriz.
15. Entregar evidencia responsive.

## Conclusión

```txt
NO EMPALMAR CÓDIGO TODAVÍA
NO DECLARAR NUEVO BASELINE
NO PASAR TODA LA RESPONSABILIDAD A CARRIL B
DEVOLVER CORRECCIÓN INCREMENTAL A CLAUDE
AUDITAR DIFERENCIALMENTE v1.182
```

Estado: `CARRIL_A_ABIERTO_CON_P0_ACCIONABLES`.
