# Implementación P0.10b — wire de resolución y perfil financiero en P0.9

Fecha: 2026-07-10  
Estado: `WIRE_IMPLEMENTADO / SMOKE_CONFIGURADO / INDEX_NO_APLICADO / FIRESTORE_LAB_PENDIENTE`

## 1. Necesidad

P0.10 ya resolvía aliases e IDs, pero la configuración debía integrarse al servicio operativo de conocimiento para evitar dos pasos manuales:

1. asignar `aseguradoraId` antes de inspeccionar;
2. agregar gastos/IVA a una regla antes de persistir.

## 2. Archivo actualizado

```text
orbit360-platform/modules/aseguradoras-knowledge-p09.js
```

## 3. Resolución antes de inspección

El servicio ahora recibe:

- tenant;
- fuente;
- nombre o alias opcional;
- directorio del tenant;
- actor y propósito.

Antes de construir la solicitud al provider ejecuta:

```text
source
→ tenantInsurerConfigP10.resolveInsurer
→ ID de directorio o ID interno estable
→ contexto seguro
→ runner/provider
```

Si no puede resolver la aseguradora y no existe ID explícito, bloquea antes de ejecutar el provider.

## 4. Contexto seguro

La inspección ya no necesita exponer la ficha completa de la aseguradora. El contexto conserva únicamente:

- ID;
- nombre;
- país/moneda;
- aliases;
- clave canónica;
- ID interno/directorio.

No incorpora:

- portales;
- accesos;
- cuentas;
- contactos;
- secretos.

## 5. Enriquecimiento de reglas

Durante `buildPlan()`:

1. se reciben reglas revisadas;
2. P0.10 busca un perfil financiero aplicable;
3. agrega solo componentes faltantes;
4. conserva los componentes extraídos de la fuente;
5. registra qué perfil se aplicó;
6. fuerza cero habilitación;
7. entrega la regla al runtime P0.9.

Para AseGuate, agrega:

```text
issuance_expense: 5% / base_premium
tax: 12% / subtotal_before_tax
```

No agrega una segunda copia si la regla ya contiene esos componentes.

## 6. Compatibilidad multi-tenant

- sin configuración tenant, un ID explícito válido sigue siendo utilizable;
- otro tenant no recibe los aliases o perfiles A&S;
- la resolución por ID del directorio funciona después de persistir;
- la resolución por ID interno funciona antes de vincular directorio;
- una fuente desconocida queda bloqueada.

## 7. Estado honesto

El wire conserva:

```text
writeAllowed: false
enablesCotizador: false
enablesComparativo: false
requiresHumanValidation: true
```

Persistir el plan sigue dependiendo del writer P0.9, del rol activo y de confirmación. La habilitación continúa en el gate P0.8.

## 8. Smoke

```text
tools/orbit360-test-aseguradoras-knowledge-p10-wire.mjs
```

Cubre:

- inspección AseGuate sin ID manual;
- ID del directorio;
- contexto sin datos sensibles;
- aplicación de gastos e IVA;
- plan metadata-only;
- persistencia aislada;
- fuente visible en AseGuate;
- Banrural Salud → Aseguradora Rural;
- Cotizador VA → Seguros Columna;
- fuente desconocida bloqueada;
- cero habilitación.

El workflow P0.10 fue actualizado para incluir este smoke.

## 9. Impacto

### Aseguradoras

La carga podrá resolver la entidad automáticamente y mostrar la decisión antes del dry-run.

### Cotizador

Las reglas validadas podrán usar perfiles financieros específicos sin fórmulas globales.

### Comparativo

Las propuestas externas conservan la identidad canónica correcta.

### Academia

Debe enseñar resolución automática, corrección humana, perfil financiero y diferencia entre persistir/habilitar.

## 10. Pendientes

- ejecución visible de CI;
- dry-run del integrador en checkout completo;
- `--apply` controlado;
- provider LAB conectado;
- primera persistencia Firestore LAB;
- read model real;
- binding AseGuate real;
- smoke visual.
