# Auditoria Firestore LAB - rutas candidatas

- Fecha local: 2026-07-01 03:25:14
- Rama: feat/ays-auth-lab-correction-20260630
- HEAD inicial: dbd6d05 docs(lab): documentar pendiente Claude y continuidad backend
- Restricciones: sin push, sin deploy, sin produccion, sin datos reales.

## Resultado de auditoria

- Store LAB explicito encontrado: True
- API _emit encontrada: True
- Metodo _labStatus encontrado: True
- No-fallback/auth-required encontrado: True
- localStorage en store LAB: True
- referencias seed en store LAB: True

## Rutas candidatas detectadas

- tenants/{tenant}/{collection}
- tenantId/{tenant}/{collection}
- orbitTenants/{tenant}/{collection}
- orbit/{tenant}/{collection}
- clientesOrbit/{tenant}/{collection}
- {collection}

## Decision

No se ejecuta lectura real del seed hasta que exista Firebase Auth LAB. El smoke automatico queda instalado y correra solo cuando Auth + Orbit.store esten listos.
