# Requerimientos UX — Clientes, calidad de datos y asesores

Fecha: 2026-07-09  
Proyecto: Orbit 360 A&S  
Fuente real inicial: `Contratantes Datos de Contacto 2026-07-08.xlsx`  
Rama activa: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open, sin merge, sin deploy, sin main.

## Motivo

La primera fuente real de clientes mostró que el campo asesor/vendedor es crítico y puede venir vacío, incorrecto, con nombre de empresa o con aliados. También mostró brechas fuertes de correo, teléfono, documento y ubicación.

El módulo Clientes debe permitir corregir rápido sin entrar obligatoriamente a la ficha completa.

## Listado de clientes — columnas mínimas

```txt
Cliente
Tipo
País
Departamento/Provincia
Ciudad/Municipio
Asesor principal
Aliado/Canal
WhatsApp/Teléfono
Correo
Calidad de datos
Estado operativo
Alertas
Acciones rápidas
```

## Acciones rápidas desde listado

```txt
Editar asesor principal inline
Asignar asesor masivo
Agregar/corregir WhatsApp
Agregar/corregir correo
Marcar como requiere validación
Ver duplicados probables
Abrir ficha completa
Crear tarea para asesor
Exportar faltantes
```

## Edición rápida de asesor

Debe existir una celda o control editable en el listado:

```txt
Asesor principal: dropdown de asesores activos del tenant.
Aliado/canal: campo secundario opcional.
Motivo de cambio: obligatorio cuando se cambia asesor después de importación.
Auditoría: registrar antes/después, usuario, fecha y origen.
```

## Reglas de asesor A&S

```txt
Vendedor vacío -> FALTA_ASESOR.
Vendedor = Alianzas y Soluciones/empresa -> Paula Osorio + canal empresa.
Vendedor compuesto -> asesor principal + aliado(s).
Vendedor abreviado o no reconocido -> ASESOR_REQUIERE_VALIDACION.
```

Estas reglas deben estar en configuración de tenant, no hardcodeadas en core.

## Calidad de datos visible

Cada cliente debe mostrar:

```txt
Score 0-100
Badge: Completo / Bueno / Requiere completar / Crítico
Alertas principales
Responsable de completar
Fecha última revisión
```

Alertas mínimas:

```txt
Falta asesor
Falta WhatsApp/teléfono
Falta correo
Falta documento
Falta ciudad/departamento
Duplicado probable
Pendiente de pólizas
Asesor requiere validación
```

## Filtros rápidos

```txt
Falta asesor
Falta contacto
Sin correo
Sin WhatsApp
Duplicado probable
Pendiente pólizas
Requiere validación
Por asesor
Por ciudad/departamento
Por tipo persona
Por estado operativo
```

## Vista para asesores

Cada asesor debe poder ver:

```txt
Mis clientes con datos incompletos
Mis clientes sin WhatsApp
Mis clientes sin correo
Mis clientes pendientes de pólizas
Mis clientes reactivables
Duplicados probables en mi cartera
```

## Notificaciones/tareas

Después de importación:

```txt
AdminTenant/Dirección ve resumen general.
Cada asesor recibe tarea interna con sus clientes incompletos.
Clientes sin asesor quedan en cola de validación.
Duplicados probables quedan en cola de deduplicación.
```

Estado honesto:

```txt
Tarea preparada
Pendiente de envío
Pendiente de integración
```

No decir “enviado” si WhatsApp/correo no está conectado.

## Estado operativo de cliente

Antes de importar pólizas:

```txt
Pendiente de pólizas
```

Después de importar pólizas:

```txt
Activo: tiene póliza Vigente o Por renovar.
Activo en mora: tiene póliza vigente/por renovar y cobros vencidos.
Inactivo: no tiene pólizas vigentes/por renovar.
Reactivable: histórico o inactivo con oportunidad comercial.
```

## Catálogos geográficos

Para registro manual e importación:

```txt
País -> Departamento/Provincia -> Ciudad/Municipio
```

Requisitos:

```txt
- Normalizar tildes/mayúsculas/minúsculas.
- Evitar variantes libres cuando existe catálogo.
- Permitir “Otro / requiere validación” cuando no coincida.
- No bloquear importación si falta dato, pero sí marcar calidad.
```

## Multi-tenant

El diseño debe servir para otros tenants:

```txt
- Sinónimos de columnas configurables.
- Reglas de asesor por tenant.
- Catálogos por país habilitado.
- Campos obligatorios configurables por tenant/plan.
- Calidad de datos configurable.
```

## ¿Aplica a Claude/prototipo?

Sí.

Claude/prototipo debe agregar o preservar:

```txt
- columnas de asesor y calidad en listado;
- edición rápida de asesor;
- filtros por faltantes;
- vista “clientes por completar”;
- estado pendiente de pólizas;
- preparación de tareas/notificaciones honestas;
- UI de duplicados probables.
```

## Estado

Requerimiento UX documentado. Pendiente implementación en módulo Clientes/Cliente360 e importador.