# Avance Backend LAB · Empalme index principal

Fecha: 2026-07-03
Rama: `ays/backend-tenant-lab-v99-20260703`
Repo: `paulaosoriof86/orbit360-core`

## Resumen

Se corrigió el `index.html` principal para continuar el empalme ágil entre el prototipo Claude más reciente y el Backend LAB A&S, sin sobrescribir `data/store.js` ni tocar módulos.

## Entrada utilizada

- ZIP limpio local: `Prototype Development Request - 2026-07-02T201909.489.zip`.
- Rama GitHub objetivo: `ays/backend-tenant-lab-v99-20260703`.
- Archivo base corregido: `orbit360-platform/index.html`.

## Hallazgo 1 · Mojibake en index de la rama LAB

- Módulo/área: Shell / Login / Topbar / Index principal.
- Síntoma/necesidad: El `index.html` de la rama LAB tenía caracteres corruptos visibles como `Â`, `Ã`, `ðŸ`, `â€”`, `â€¦` en textos de UI.
- Esperado: UTF-8 limpio, sin BOM visible y sin caracteres corruptos.
- Causa raíz probable: Reinterpretación de UTF-8 durante algún empalme anterior o manipulación de archivo con codificación incorrecta.
- Archivo/función: `orbit360-platform/index.html`.
- Fix aplicado: Se reemplazó el contenido del `index.html` por la versión limpia del ZIP más reciente, validando que no contuviera patrones de mojibake.
- Impacto en prototipo comercializable: Alto. Protege la presentación white-label, evita pantallas dañadas y aplica aprendizaje al prototipo base.
- Estado: RESUELTO en rama LAB.

## Hallazgo 2 · Backend LAB no quedaba formalmente inicializado desde index principal

- Módulo/área: Backend LAB / Shell / Data Layer.
- Síntoma/necesidad: El `index.html` de la rama tenía el hook de `data/store-firestore-lab.local.js`, pero no cargaba de forma explícita `core/backend-lab-loader.js` ni `core/backend-lab-init.js` antes del store.
- Esperado: El modo `?orbitBackend=firestore-lab&tenant=alianzas-soluciones` debe poder inicializar Firebase LAB y luego permitir que el store LAB reemplace/controle `Orbit.store` sin tocar módulos.
- Archivo/función: `index.html`, bloque `DATA LAYER`.
- Fix aplicado: Se insertaron, antes de `data/store.js`, los scripts:
  - `core/backend-lab-loader.js?v=lab-20260703`
  - `core/backend-lab-init.js?v=lab-20260703`
  - Se preservó `data/store-firestore-lab.local.js?v=lab-store-20260703` inmediatamente después de `data/store.js` y antes de `data/seed.js`.
- Impacto en prototipo comercializable: Alto. Permite usar el index principal como entrada única: demo por defecto y Firestore LAB solo con bandera explícita.
- Estado: RESUELTO en rama LAB; pendiente smoke en navegador local con Auth LAB.

## Hallazgo 3 · localStorage directo en shell

- Módulo/área: Shell / Sidebar.
- Síntoma/necesidad: El `index.html` usaba `localStorage` directo para persistir el estado de sidebar (`orbit360_sbhide`).
- Esperado: Toda preferencia persistente debe usar `Orbit.store.pref` y `Orbit.store.setPref`, para que el backend pueda redirigir esa persistencia por tenant.
- Archivo/función: `index.html`, bloque `mostrar / ocultar sidebar`.
- Fix aplicado: Se reemplazó el acceso directo a `localStorage` por `Orbit.store.pref('orbit360_sbhide', '0')` y `Orbit.store.setPref('orbit360_sbhide', value)`.
- Impacto en prototipo comercializable: Medio/alto. Refuerza la regla de capa única y evita excepciones que luego rompan multi-tenant.
- Estado: RESUELTO en rama LAB. Reportar a Claude/prototipo base si esta lógica existe en nuevos ZIP.

## Verificación realizada aquí

- Repo correcto confirmado: `paulaosoriof86/orbit360-core`.
- Rama de trabajo usada: `ays/backend-tenant-lab-v99-20260703`.
- `index.html` actualizado en GitHub con commit:
  - `f87407bfba197177f958aa8c528e0691a63995dc` primera corrección UTF-8/hook.
  - `d4efee458aa109ef48fa616ceedf505112d1863a` corrección inmediata de sintaxis en selector de rol.
- Lectura posterior del archivo confirmó:
  - título y descripción UTF-8 limpios;
  - loader/init LAB antes de `data/store.js`;
  - `data/store-firestore-lab.local.js` después de `data/store.js`;
  - sidebar persistente vía `Orbit.store`;
  - selector de rol con sintaxis corregida.

## Verificación pendiente

No se pudo verificar render real de navegador desde esta herramienta. Pendiente ejecutar smoke local en Windows con puerto estable, sin producción, sin Hosting deploy y sin datos reales.

Criterios del smoke pendiente:

1. Abrir demo normal sin querystring y confirmar que carga modo local sin Firebase visible.
2. Abrir `?orbitBackend=firestore-lab&tenant=alianzas-soluciones` y confirmar que se solicita Auth LAB real.
3. Confirmar que `Orbit.store.__firestoreLabExplicit === true` o que `OrbitBackend.status()` muestre `mode: firestore-lab`.
4. Confirmar que no hay fallback silencioso a demo/localStorage en modo LAB.
5. Confirmar que no aparecen notas técnicas en UI cliente.
6. Confirmar que no reaparecen patrones de mojibake: `Â`, `Ã`, `ðŸ`, `â€”`, `â€¦`.

## Pendiente para Claude / prototipo base

- Incorporar en el prototipo base el mismo aprendizaje: no usar `localStorage` directo en shell/módulos para preferencias que deben ser tenant-aware.
- Mantener el index UTF-8 limpio al generar ZIPs.
- No remover hooks backend cuando entregue prototipos nuevos; el empalme debe preservar backend y reemplazar solo visual/módulos/docs según gate.
