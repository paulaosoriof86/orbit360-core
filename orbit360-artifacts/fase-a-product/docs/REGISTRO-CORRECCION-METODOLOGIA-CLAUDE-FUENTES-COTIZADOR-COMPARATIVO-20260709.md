# Registro — corrección metodología Claude, fuentes, Cotizador/Comparativo

Fecha: 2026-07-09  
Proyecto: Orbit 360 A&S  
Rama activa: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open, sin merge, sin deploy, sin main.

## Motivo

Paula señaló tres riesgos metodológicos:

```txt
1. Se indicó a Claude leer documentos sin aclarar que estaban dentro del paquete.
2. Academia podía estar incompleta o dispersa frente al pendiente acumulado.
3. Cotizador/Comparativo no estaba siendo mencionado explícitamente en los últimos bloques, aunque es módulo core comercializable.
```

## Corrección aplicada

A partir de este punto, cuando se entregue prompt a Claude debe indicarse:

```txt
Los documentos maestros están dentro del paquete en 00_FUENTES_MAESTRAS/.
No pedir leer fuentes externas si no están adjuntas o incluidas.
Si se menciona un documento, especificar su ruta dentro del paquete o adjuntarlo explícitamente.
```

## Estado del paquete completo ya entregado

El ZIP contiene en `00_FUENTES_MAESTRAS/`:

```txt
DOCUMENTO-MAESTRO-CONSOLIDADO-ORBIT360-AYS-20260704.md
ADENDUM-ACADEMIA-PROFUNDA-INTERACTIVA-ORBIT360-AYS-20260704.md
ADDENDUM-MAESTRO-PATRONES-REUTILIZABLES-CLAUDE-BACKEND-ORBIT360-20260707.md
AUDITORIA-FORENSE.md
GUIA-CHATGPT-CODEX.md
MIGRACION-MAESTRO.md
PLAN-INFRAESTRUCTURA.md
```

Pero el addendum de Academia profunda creado después del paquete aún no está dentro de ese ZIP. Debe pegarse como prompt adicional o regenerarse el paquete si Paula lo solicita.

## Cotizador/Comparativo

Cotizador y Comparativo son módulos core y no deben quedar rezagados.

Regla actual:

```txt
- Si están estables, Claude no debe reescribirlos por estética.
- Sí debe auditarlos/smokearlos en cada candidata.
- Debe conservar tarifas por configuración, planes, aseguradoras, países, moneda y glosario.
- No debe hardcodear A&S ni tarifas reales.
- No debe mezclar GTQ/COP.
- No debe presentar cotización como emisión o conexión real si no está conectada.
- Comparativo debe conservar tabla clara por aseguradora/cobertura/prima/deducible/condición.
- Cotizador debe depender de configuración tenant, no de código duro.
```

## Auditoría módulo por módulo

Se retoma explícitamente matriz de auditoría por módulos:

```txt
Inicio/Dashboard
Clientes
Cliente360
Pólizas
Cobros
Conciliaciones M5
Finanzas/finmovs
Siniestros
Renovaciones
CRM/Leads/Ops
Cotizador
Comparativo
Aseguradoras
Marketing
Portal Cliente
Configuración
Equipo/Roles/Permisos
Integraciones/Automatizaciones
Academia
Importadores/Migración
Documentos/Soportes/Parches
```

Cada módulo debe evaluarse contra:

```txt
- reglas negocio;
- UX/copy cliente;
- país/moneda;
- roles/permisos;
- auditoría;
- Academia;
- backend protegido;
- datos reales/secrets;
- regresiones contra candidata anterior;
- pendientes para Claude vs ChatGPT/Codex.
```

## Estado real

Últimos bloques avanzaron backend/documentación, no sustituyen la auditoría visual/funcional módulo por módulo. Queda retomado el carril de auditoría integral sin abandonar backend.

## Próximo paso recomendado

Preparar addendum corto para Claude que corrija rutas de fuentes y agregue explícitamente Cotizador/Comparativo al smoke visual y a Academia.