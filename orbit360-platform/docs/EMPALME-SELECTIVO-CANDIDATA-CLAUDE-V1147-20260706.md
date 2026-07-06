# Empalme selectivo candidata Claude v1.147 — 2026-07-06

**Archivo auditado:** `Prototype Development Request - 2026-07-06T122958.720.zip`  
**SHA256:** `258ec241104780494756e7c3398a0b38b12b8763bfd5856cda0212c52cc3511c`  
**Estado:** auditada. No se empalma ZIP completo. Se prepara empalme selectivo/local por control de seguridad de herramienta.

---

## 1. Auditoría real del ZIP

Resultado del ZIP real recibido:

- 98 archivos dentro de `orbit360-platform`.
- 55 archivos JS revisados con `node --check`: 0 errores.
- `Cliente360` y Academia base ya vienen corregidos.
- `core/importa.js` mejora los residuos principales indicados por Claude.
- `core/config.js` todavía conserva un scope viejo.
- `index.html` del ZIP NO conserva scripts backend LAB ni `portal-v1142-copyfix.js`.

---

## 2. Bloqueador principal

El `index.html` del ZIP no conserva:

```txt
core/backend-lab-loader.js
core/backend-lab-init.js
data/store-firestore-lab.local.js
core/backend-lab-security-guard.js
modules/portal-v1142-copyfix.js
```

Por lo tanto, no puede reemplazar el index vivo.

---

## 3. Decisión de empalme

No empalmar ZIP completo.

Ruta segura:

1. conservar index vivo de la rama;
2. no tocar backend protegido;
3. rescatar copy/Academia de la candidata mediante hotfix selectivo;
4. corregir manualmente `core/config.js` y residuos visibles de `core/importa.js`;
5. ejecutar validadores antes de cualquier commit local.

---

## 4. Incidencia herramienta

Se intentó aplicar un hotfix selectivo sobre `modules/portal-v1142-copyfix.js`, pero la llamada de escritura fue bloqueada por controles automáticos de la herramienta. No se forzó la escritura.

Por seguridad se deja paquete local aplicable y esta documentación.

---

## 5. Estado

- No deploy.
- No merge.
- No datos reales.
- No backend protegido modificado.
- Empalme completo detenido.
- Empalme selectivo pendiente de aplicación local o nueva vía segura.