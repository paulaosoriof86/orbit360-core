# E-REC-007 · ZIP one-click bloqueado / descompresion manual

**Fecha:** 2026-07-03  
**Proyecto:** Orbit 360 / Backend LAB  
**Area:** Ejecucion local / automatizacion

---

## Sintoma

El paquete ZIP one-click entregado para reparar Auth LAB fue bloqueado por Windows y ademas requeria que Paula lo descargara y descomprimiera manualmente.

---

## Esperado

El flujo local debe ser lo menos manual posible. Si se requiere accion local, debe evitarse:

- ZIP descargado desde chat,
- descompresion manual,
- archivos `.cmd` bloqueables,
- cadenas largas de PowerShell,
- dependencias no verificadas.

---

## Causa raiz

Se intento automatizar mediante un ZIP externo en lugar de centralizar el flujo en el repo y reducir la accion local a una sola ejecucion controlada.

---

## Regla de no repeticion

No volver a entregar paquetes ZIP one-click para Orbit 360 cuando el objetivo sea ejecucion local rapida. Preferir, en este orden:

1. Resolver directamente en GitHub.
2. Usar Codex/runner local si esta disponible.
3. Usar un script versionado dentro del repo.
4. Como ultimo recurso, una unica instruccion local corta.

---

## Estado

**ABIERTO COMO REGLA OPERATIVA / NO REPETIR.**

Se debe continuar con enfoque mas automatico: backend y fixes en GitHub; Paula solo valida visualmente o ejecuta una accion local minima cuando sea indispensable por credenciales/archivos locales.
