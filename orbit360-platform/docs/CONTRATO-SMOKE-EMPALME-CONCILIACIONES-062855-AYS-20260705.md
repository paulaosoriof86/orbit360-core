# Contrato — Smoke de empalme frontend Conciliaciones 062855

**Fecha:** 2026-07-05  
**Proyecto:** Orbit 360 A&S  
**Rama:** `ays/backend-tenant-lab-v99-20260703`  
**PR:** #5 draft, sin merge, sin deploy  
**Estado:** empalme frontend aplicado en GitHub; smoke estático agregado.

---

## 1. Objetivo

Validar que el empalme frontend de la candidata `062855.313` quedó alineado con el backend protegido y con el contrato de `conciliaciones`.

Este bloque no avanza a datos reales ni a parser. Se ubica inmediatamente después del empalme porque el plan exige verificar antes de continuar.

---

## 2. Herramienta agregada

```txt
tools/orbit360-validar-empalme-conciliaciones-062855-ays.mjs
```

Uso local:

```bash
node tools/orbit360-validar-empalme-conciliaciones-062855-ays.mjs
```

---

## 3. Qué valida

### 3.1 `index.html`

Debe conservar:

```txt
loader LAB
init LAB
store base
adapter Firestore LAB
Auth LAB fix
módulo Conciliaciones
```

Además, el módulo de Conciliaciones debe cargarse una sola vez.

### 3.2 `modules/conciliaciones.js`

Debe confirmar:

- existencia del módulo `Conciliaciones`;
- lectura de propuestas desde la colección `conciliaciones`;
- consulta de detalle de propuesta;
- actualización únicamente de la propuesta;
- visibilidad para Dirección, Admin y Finanzas;
- mensajes visibles de validación sin aplicación de pagos;
- estado honesto: validada no significa pagada.

### 3.3 Bloqueos

El módulo no puede contener lógica de:

- modificar cobros directamente;
- crear recaudos desde la bandeja;
- marcar cobros como pagados;
- persistencia operativa fuera de `Orbit.store`;
- conexión directa a backend desde el módulo.

---

## 4. Decisiones posibles

```txt
EMPALME_VALIDO
EMPALME_VALIDO_CON_ADVERTENCIAS
EMPALME_BLOQUEADO
```

---

## 5. Límites del smoke

Este smoke es estático.

No reemplaza:

- smoke visual real en navegador;
- ejecución local del adapter Firestore LAB;
- validación E2E con propuestas persistidas;
- prueba de roles con sesión real;
- prueba de auditoría real;
- deploy.

---

## 6. Siguiente paso del plan

Después de este smoke estático, continuar con:

```txt
smoke visual/operativo local de Conciliaciones
adapter Firestore LAB local
perfilador de columnas por fuente
```

No avanzar a datos reales ni aplicación controlada hasta completar validaciones.