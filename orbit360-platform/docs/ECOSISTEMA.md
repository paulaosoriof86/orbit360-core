# Ecosistema CXOrbia — de plataforma operativa a plataforma estratégica

> Documento de arquitectura de producto. Define cómo CXOrbia deja de ser solo
> una **plataforma operativa de campo** y se convierte en un **ecosistema integral
> para consultoras** de mystery shopping, auditoría, experiencia al cliente e
> investigación de mercados. Genérico y white-label.

---

## 1. El modelo de 3 caras (quién usa qué)

CXOrbia es un producto **multi-lado**. Hay tres tipos de organización y, dentro de
cada una, varios roles:

| Cara | Quién | Para qué | Personas / roles |
|---|---|---|---|
| **Proveedor** | Nosotros (CXOrbia) | Vender instancias, configurar planes/módulos, soporte | Super Admin |
| **Consultora** (tenant) | Nuestro cliente | Vender, configurar programas, operar el campo, entregar inteligencia | Admin · Operativo · **Comercial/CRM** · **Marketing** |
| **Cliente final** (la marca evaluada) | El cliente de la consultora | Ver resultados, evaluar y **accionar** sobre sus sucursales | Director/C-level · Gerente Regional · Responsable de Sucursal · Solo lectura |
| **Shopper** | Evaluador de campo | Ejecutar visitas | Shopper |

**La cadena de valor que cubre el ecosistema:**

```
PROSPECTAR → VENDER → CONFIGURAR PROGRAMA → OPERAR CAMPO → ENTREGAR INTELIGENCIA → ACCIONAR
   (CRM)      (CRM)      (Wizard/Cuest.)      (Operación)    (Portal Cliente)    (Incentivos/
                                                                                  Sanciones/Capac.)
```

- **Comercial (CRM + Marketing)** — lado consultora · *plataforma comercial*.
- **Operación (campo)** — lo que ya existe · *plataforma operativa*.
- **Estrategia (Portal del Cliente)** — lado cliente final · *plataforma estratégica*.

Esto es lo que justifica el **plan más completo** (Enterprise/Estratégico): no se
vende "software de visitas", se vende el ciclo completo de inteligencia de cliente.

---

## 2. Login y separación de portales (recomendación de arquitectura)

**Recomendación: un solo login unificado por tenant + enrutamiento por persona.**
NO un login distinto por portal.

Razones:
- **White-label**: cada consultora tiene **una sola URL de marca**. El rol del
  usuario decide a qué *workspace* entra. Un "Responsable de Sucursal" entra por la
  misma URL del cliente y aterriza en el Portal Estratégico acotado a su sucursal.
- **Auth simple**: un solo SSO, recuperación de contraseña, una sola PWA.
- **Misma base de datos del programa**: el cliente ve EN VIVO lo que la operación
  produce, sin exportar nada.

Aunque el login sea uno, **post-login se presentan como portales distintos**
(*workspaces*): misma shell, distinto set de módulos + acento de color + leyenda de
marca. En producción cada workspace puede vivir además en su **subdominio**
(`operacion.tuconsultora.com`, `clientes.tuconsultora.com`) apuntando al mismo backend.

> En el demo conservamos el selector de perfil en el login y agregamos el **Portal
> del Cliente** como tercera entrada, con un **conmutador de persona** (Director /
> Gerente Regional / Responsable de Sucursal) para mostrar roles y *scope* sin crear
> 3 usuarios.

---

## 3. Los tres pilares (módulos)

### A) Operación de campo — *existe hoy*
Mi Día, Dashboard Operativo, Proyectos, Visitas, Postulaciones, Shoppers, Hojas de
Ruta, Documentos, Aprendizaje, Certificación, Tablón, Soporte IA, Reportes + Finanzas.

### B) Comercial (consultora) — *nuevo · roadmap*
- **CRM Comercial**: pipeline de prospectos/oportunidades (kanban), cuentas y contactos.
- **Propuestas inteligentes**: a partir de un **relevamiento**, la IA arma propuesta,
  alcance, programa sugerido y precio.
- **Demos & simuladores**: simular un programa y un **cuestionario con score** para
  enseñarle al prospecto el entregable antes de vender.
- **Actas inteligentes**: transcribe y resume reuniones (Zoom/Meet), extrae acuerdos y
  tareas, las sincroniza a **Notion**.
- **Marketing & Contenidos**: generación de piezas/publicaciones, calendario,
  mediciones y estrategia (para la consultora y como servicio al cliente final).

### C) Estrategia — Portal del Cliente final — *nuevo · este bloque*
- **Panorama ejecutivo**: score global de la marca, tendencia, NPS, distribución,
  ranking de sucursales (mejores/peores), cobertura del programa.
- **Sucursales & Score**: tarjeta/scorecard por sucursal con **puntuación ponderada**
  (secciones y preguntas con **pesos %**), desglose por sección, histórico de visitas,
  evidencias y cuestionario respondido.
- **Planes de Acción**: a partir de resultados → **incentivos, reconocimientos,
  sanciones, planes de mejora**, asignados a responsables, con seguimiento.
- **Capacitación**: detecta **brechas** por sección y recomienda/asigna capacitación al
  personal de la sucursal (servicio adicional).
- **Reportes**: exportables (PDF/Excel/PPT) por sucursal, región y periodo.
- **Mi Programa**: el cliente ve (y según permiso, ajusta) la **estructura de su
  cuestionario con pesos**: qué se evalúa y cuánto pesa.
- **Servicios & Add-ons (Marketplace)**: catálogo de valor agregado que la consultora
  ofrece (investigación, voz del cliente, BI, capacitación, marketing, integraciones).

---

## 4. Cuestionarios estratégicos (con pesos)

El cuestionario deja de ser solo un formulario: es el **motor de score**.

- **Secciones** con **peso %** (suman 100).
- **Preguntas** con **peso %** dentro de su sección (suman 100).
- Cada respuesta produce un puntaje 0–100; el score de sección = Σ(pregunta×peso); el
  score de la visita = Σ(sección×peso).
- **Preguntas KO/críticas** (anulan o penalizan), **NPS**, escalas, opción múltiple.
- **Versiones por criterio** (marca / tipo de establecimiento / canal).
- **Set-up por programa**: cada programa define su propio árbol de secciones/pesos.
- Origen: **manual / importado / generado con IA** (alimentado por la base de conocimiento).

El **score por sucursal** que ve el cliente sale directamente de esta ponderación.

---

## 5. Roles y permisos (granular, por tenant)

- **Matriz de permisos por módulo y por acción** (ver / editar / exportar / accionar).
- **Scope de datos**: por país, **región**, **sucursal** (el Responsable de Sucursal
  solo ve lo suyo).
- **Roles personalizables** por la consultora (crear roles nuevos del lado cliente).
- Auditoría de accesos (producción).

---

## 6. Marketplace de add-ons e integraciones (valor agregado / upsell)

**Servicios (se venden como add-on del programa):**
Investigación de mercados · Voz del Cliente (encuestas post-transacción, QR, NPS) ·
Mystery shopping competitivo / benchmarking sectorial · Auditoría de cumplimiento ·
Capacitación al personal · Evidencia con foto/GPS/video · Geolocalización / check-in ·
Analítica avanzada / BI · Generación de contenidos (marketing).

**Integraciones (técnicas):**
Google Sheets · Excel Online · Make · WhatsApp (Web + Cloud API) · Gmail/Workspace ·
Outlook/M365 · Mailchimp · Google Drive/Docs · **Notion** · **Zoom** · **Google Meet** ·
Power BI / Looker · SSO (Google/Microsoft) · Facebook/Instagram · YouTube/Vimeo.

---

## 7. Qué más le suele faltar a una consultora (mi recomendación)

Más allá de lo pedido, para que sea **integral** conviene contemplar:

1. **Investigación de mercados** como módulo propio (estudios ad-hoc, paneles, encuestas).
2. **Voz del Cliente (VoC)** — feedback del cliente real, complemento del mystery shopping.
3. **Quality Assurance** — doble validación de cuestionarios y **calibración de evaluadores**.
4. **Facturación y contratos** — SOW/órdenes de servicio, facturación al cliente final
   (cierra el aro con Finanzas).
5. **Gestión de SLAs / cumplimiento de programa** — cobertura, on-time, alertas.
6. **Gobernanza de datos / privacidad / consentimiento** — clave en investigación.
7. **Centro de Inteligencia (IA)** — insights automáticos, alertas y **recomendaciones
   de acción** transversales a los tres pilares.
8. **Benchmarking** entre periodos, regiones y (anónimo) entre sectores.
9. **Programa de incentivos** estructurado para shoppers Y para el personal del cliente.
10. **Centro de ayuda / academia** white-label.

---

## 8. Orden de construcción sugerido (pilar estratégico + comercial)

1. **Portal del Cliente v1** — persona/roles, scoring ponderado, sucursales, planes de
   acción, capacitación, reportes, marketplace. *(este bloque)*
2. **Editor de cuestionarios con pesos %** (secciones/preguntas) + simulador de score.
3. **Roles & permisos del cliente** completos (matriz + scope) y alta de usuarios del cliente.
4. **CRM Comercial** (pipeline, cuentas, propuestas inteligentes, simuladores).
5. **Actas inteligentes** + Notion/Zoom/Meet.
6. **Marketing & Contenidos**.
7. **Investigación de mercados / VoC / QA / Facturación** (profundización del ecosistema).
```
```
> El backlog detallado y su estado viven en `PLAN-DE-TRABAJO.md`.
