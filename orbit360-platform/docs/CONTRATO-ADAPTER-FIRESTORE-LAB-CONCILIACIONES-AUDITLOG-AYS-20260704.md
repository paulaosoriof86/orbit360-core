# Contrato backend — Adapter Firestore LAB para `conciliaciones/auditLog`

**Fecha:** 2026-07-04  
**Proyecto:** Orbit 360 A&S  
**Rama:** `ays/backend-tenant-lab-v99-20260703`  
**PR:** #5 draft, sin merge, sin deploy  
**Estado:** integración local protegida y validador estático agregados.

---

## 1. Objetivo

Conectar el bloque anterior de persistencia LAB local con el Store Firestore LAB real, sin saltar directamente a pagos ni mutar colecciones operativas.

El flujo protegido queda:

```txt
plan validado -> ejecutor LAB -> conciliaciones/auditLog -> onSnapshot -> futura UI/bandeja
```

La aplicación de cobros/comisiones sigue fuera de alcance:

```txt
VALIDADA -> validar transición -> aplicar cobro/comisión -> auditLog -> notificación
```

---

## 2. Qué se agregó

Herramientas:

```txt
tools/orbit360-integrar-adapter-conciliaciones-firestore-lab-ays.ps1
tools/orbit360-validar-adapter-conciliaciones-firestore-lab-ays.mjs
tools/orbit360-test-validar-adapter-conciliaciones-firestore-lab-ays.mjs
```

---

## 3. Por qué se hace con script local y no reemplazo bruto

`data/store-firestore-lab.local.js` es archivo backend protegido.

Por eso no debe pisarse desde un ZIP Claude ni editarse de forma masiva sin backup.

La integración se hace con script local que:

- crea backup;
- agrega solo las colecciones faltantes;
- no toca reglas;
- no despliega;
- no ejecuta writes;
- valida estáticamente el adapter.

---

## 4. Colecciones requeridas

El adapter Firestore LAB debe incluir:

```txt
conciliaciones
auditLog
```

Estas colecciones deben quedar dentro de `COLLECTIONS` para que el Store LAB pueda:

- mantener cache por colección;
- enganchar `onSnapshot`;
- exponer `all/get/where/insert/update/remove/_emit`;
- mantener paths tenant-safe:

```txt
tenantId/{tenantId}/conciliaciones/{id}
tenantId/{tenantId}/auditLog/{id}
```

---

## 5. Restricciones de seguridad

El adapter debe conservar:

```txt
mode === firestore-lab
tenantId === alianzas-soluciones
canonical path tenantId/{tenantId}/{collection}
onSnapshot
API Orbit.store compatible
cleanForWrite
no fallback operativo como fuente de verdad
```

No debe contener ni introducir:

```txt
apply_payment
aplicar_pago
estado:'Pagado'
estado:"Pagado"
postRecaudo(
secret
token
apiKey
webhook
password
credential
```

---

## 6. Herramienta de integración local

Uso dry-run:

```powershell
powershell -ExecutionPolicy Bypass -File tools/orbit360-integrar-adapter-conciliaciones-firestore-lab-ays.ps1 -DryRun
```

Uso apply local:

```powershell
powershell -ExecutionPolicy Bypass -File tools/orbit360-integrar-adapter-conciliaciones-firestore-lab-ays.ps1 -Apply
```

Qué hace:

- revisa `orbit360-platform/data/store-firestore-lab.local.js`;
- agrega `'conciliaciones'` y `'auditLog'` si faltan;
- crea backup en `_backups/`;
- ejecuta validador si Node está disponible;
- genera reporte en `_orbit360_reports/`;
- no hace commit;
- no hace deploy.

---

## 7. Validador estático

Uso:

```bash
node tools/orbit360-validar-adapter-conciliaciones-firestore-lab-ays.mjs
```

El validador revisa:

- gate `firestore-lab`;
- tenant `alianzas-soluciones`;
- ruta `tenantId/{tenantId}/{collection}`;
- colecciones `conciliaciones` y `auditLog`;
- API `insert/update/all/where`;
- `onSnapshot`;
- `_emit`;
- ausencia de textos prohibidos de aplicación directa.

---

## 8. Pruebas sintéticas

Suite:

```bash
node tools/orbit360-test-validar-adapter-conciliaciones-firestore-lab-ays.mjs
```

Casos cubiertos:

1. adapter válido;
2. falta `conciliaciones`;
3. falta `auditLog`;
4. falta gate `firestore-lab`;
5. presencia de texto prohibido `postRecaudo`.

Resultado local sintético:

```txt
Casos: 5
FAIL: 0
RESULTADO: OK
```

---

## 9. Alcance honesto

Este bloque deja listo el puente técnico para que Firestore LAB pueda observar y persistir `conciliaciones/auditLog`.

No crea todavía la UI de bandeja ni aplica pagos. Eso queda para bloques separados:

```txt
UI/Bandeja conciliaciones
Flujo de aplicación controlada
```

---

## 10. Siguiente paso recomendado

Crear smoke local de extremo a extremo:

```txt
propuestas sintéticas -> plan persistencia -> ejecutor local mirror -> adapter Firestore LAB validado -> reporte de readiness UI/bandeja
```

Luego construir la UI/bandeja o el bridge con Claude cuando vuelva capacidad.