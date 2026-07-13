# Reporte de avance verificable — Aseguradoras OP-2 v1.220

Fecha: 2026-07-13  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open  
Sin merge, deploy, producción ni escritura de datos reales

## 1. Estado modular

```txt
CRM OP-1:
  funcional y visualmente cerrado · 10/10

Aseguradoras OP-2:
  cierre funcional implementado
  evidencia visual reutilizable · 12/15
  pendiente visual · 3 vistas de Plataformas
```

## 2. Cambios funcionales v1.220

### Identidad antes de actualizar

El importador base podía proponer una actualización por coincidencia parcial. El guard ahora diferencia:

```txt
identidad canónica exacta:
  puede continuar como propuesta de actualización

coincidencia probable:
  requiere validación
  queda bloqueada
  no se aplica automáticamente
```

Casos cubiertos:

- versiones numéricas;
- diferencias de una letra;
- inclusión parcial;
- coincidencia con directorio existente;
- separación por país;
- red o aliado separado de aseguradora directa.

### Mensajes operativos

La UI ya no debe mostrar códigos internos o copy técnico durante el importador.

Se incorporó:

- mapa de errores conocidos;
- respuesta segura para errores desconocidos;
- sanitización de mensajes tardíos;
- uso de `textContent`;
- bloqueo de aplicación con mensaje operativo;
- cero cambios en backend protegido.

### Cuarentena y revisión

```txt
Cuarentena:
  antes del parser
  sin valores en reporte
  sin escrituras

Revisión preliminar:
  captureSecure=false

Importación preparada:
  captura protegida por defecto
  solo sobre hojas permitidas
```

## 3. CI observable

En la ejecución del commit `b025cc9` aprobaron:

```txt
sintaxis de validadores
acceso y roles
importador y separación de fuente
copy operativo y gate de escritura
cuarentena de hojas
identidad y control de duplicados
UX del directorio y recursos
migración y permisos
Academia y responsive
sintaxis, almacenamiento y baseline protegido
política de recursos
prueba de cuarentena
prueba de versiones y actualizaciones probables
prueba de copy operativo
harness focalizado de Plataformas
```

El único fallo restante fue:

```txt
Validate JSONL evidence reuse runner
```

Causa raíz:

- el verificador histórico dependía de frases en inglés;
- el runner v1.220 utiliza texto operativo en español;
- la evidencia y el comportamiento eran correctos, pero la comparación textual fallaba.

Corrección:

```txt
commit: 6ad2bb852ea3a309fdad4084b7bed255145c6bed
```

El verificador ahora usa:

- funciones;
- IDs exactos de escenarios;
- booleanos JSONL;
- presencia de capturas;
- smoke focalizado;
- ausencia del smoke completo;
- sincronización `ff-only`;
- validadores v1.220;
- ausencia de commit, push o deploy.

Estado honesto:

```txt
Última ejecución totalmente observada:
  todos los contratos funcionales aprobados
  un fallo instrumental identificado

Fallo instrumental:
  corregido

Ejecución posterior:
  pendiente de observación

CI verde:
  no declarado todavía
```

## 4. Gate local final

Archivo:

```txt
tools/orbit360-run-aseguradoras-op2-plataformas-resume.ps1
```

El gate final:

1. sincroniza la rama por avance rápido;
2. integra el index con backup y verificación;
3. ejecuta contratos v1.220;
4. verifica CRM 10/10 y Aseguradoras 12/15 mediante JSONL + capturas;
5. selecciona puerto libre;
6. ejecuta únicamente tres Plataformas;
7. combina el cierre 15/15.

No cierra otras aplicaciones y no repite escenarios aprobados.

No debe solicitarse a Paula hasta confirmar CI verde.

## 5. Carriles

### Carril A

- Academia actualizada a v1.220.
- Patrón Claude consolidado.
- Mensajes operativos y actualización exacta enseñados por rol.
- Progreso y certificados preservados.

### Carril B

- Backend protegido intacto.
- Cuarentena, copy, identidad y migración validados.
- CI dividido por contratos.
- Gate local automatizado.

### Carril C

- Preflight GT/CO completado sin escrituras.
- Guatemala y Colombia permanecen separados.
- Coincidencias probables y entidad aliada identificadas como bloqueos.
- Hojas ajenas permanecen en cuarentena.
- Dry-run parser GT y luego CO pendientes.

## 6. Pendientes reales

```txt
1. Observar la ejecución posterior a 6ad2bb8.
2. Si es verde, ejecutar una sola vez las tres Plataformas.
3. Cerrar Aseguradoras 15/15.
4. Dry-run Guatemala sin escritura.
5. Resolver bloqueos.
6. Dry-run Colombia sin escritura.
7. Continuar Cotizador + Comparativo.
```
