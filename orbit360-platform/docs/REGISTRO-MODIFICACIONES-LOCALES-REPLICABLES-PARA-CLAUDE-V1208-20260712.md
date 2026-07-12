# REGISTRO DE MODIFICACIONES LOCALES REPLICABLES PARA CLAUDE — v1.208

Fecha: 2026-07-12  
Estado: `REGISTRADO_PARA_PROXIMA_SINCRONIZACION / NO_REQUIERE_REINICIAR_CANDIDATA`

## Regla de continuidad

Claude continúa sobre su última candidata. Este documento no sustituye el paquete v1.207 ni pide reconstruir módulos. Solo registra patrones locales que deben compararse con la próxima candidata y adaptarse cuando falten.

## 1. Patrón reusable: estados visibles de negocio

En Aseguradoras se corrigieron códigos internos para evitar copy técnico visible.

Mapeo reusable:

| Estado interno | Copy de usuario |
|---|---|
| `sin_sensibles` | Sin recursos sensibles registrados |
| `backend_required` | Conexión segura pendiente |
| `default-deny` | Pendiente de configuración validada |
| fuente inspeccionada | Fuente revisada |
| persistencia solicitada | Guardado en proceso |
| read model confirmado | Guardado y verificado |
| segundo gate pendiente | Pendiente de aprobación final |

Claude debe aplicar este patrón visual donde existan estados equivalentes, sin copiar nombres de fuentes, aseguradoras o reglas A&S.

## 2. Patrón reusable: capacidad por configuración tenant

La UX debe asumir que una capacidad puede estar:

```txt
no contratada
configurada
pendiente de conexión
con fuente recibida
requiere validación
persistida y verificada
lista para aprobación
habilitada
```

No debe tratar `archivo cargado`, `provider disponible` o `método frontend resuelto` como sinónimo de habilitación.

## 3. Patrón reusable: frontera visual

Aseguradoras puede mostrar:

- fuentes;
- versiones;
- estado de revisión;
- disponibilidad para Cotizador/Comparativo;
- bloqueos comprensibles;
- acciones permitidas por rol.

Pero la candidata no debe:

- incorporar runtime A&S;
- usar IDs A&S;
- mostrar aseguradoras reales como seed;
- copiar tasas o reglas;
- activar una tarifa con datos ficticios;
- mostrar términos backend/LAB/provider/snapshot.

## 4. Academia reusable

Agregar o conservar en Academia general:

- diferencia entre cargar, revisar, guardar, verificar y habilitar;
- por qué una fuente no activa automáticamente el Cotizador;
- qué significa “Pendiente de configuración validada”;
- cómo interpretar bloqueos sin conocer infraestructura;
- por qué una propuesta necesita revisión humana y aprobación final.

No incluir nombres, tasas, documentos, links o decisiones específicas A&S.

## 5. Clasificación del cambio local v1.208

```txt
carga runtime A&S condicionada: EXCLUSIVO_A&S / NO_CLAUDE
normalización IDs documentales AseGuate: EXCLUSIVO_A&S / NO_CLAUDE
copy de estados internos: REUSABLE / ADAPTAR
modelo de estados por capacidad: REUSABLE / ADAPTAR
segundo gate visible: REUSABLE / ADAPTAR
pruebas de no contaminación tenant: PATRÓN_REUSABLE / NO_COPIAR_IMPLEMENTACIÓN_A&S
```

## 6. Criterio de auditoría de la próxima candidata

Cuando Claude entregue la siguiente candidata:

1. tomar esa candidata como base, no una versión anterior;
2. verificar si ya incorporó estos patrones;
3. no pedir de nuevo lo que ya atendió;
4. cosechar únicamente mejoras faltantes;
5. mantener fuera del prototipo toda configuración A&S;
6. actualizar este registro con atendido/parcial/pendiente.
