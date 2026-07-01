# CXOrbia — Prompt para HeyGen (Avatar IA)

## Configuración del avatar recomendada
- **Avatar**: mujer o hombre profesional, apariencia corporativa amigable, edad 30-45
- **Idioma**: Español neutro (sin acento marcado)
- **Tono**: seguro, claro, cálido — como un product manager explicando a un colega
- **Fondo**: oficina moderna minimalista, o fondo sólido de color corporativo (azul oscuro / blanco)
- **Velocidad**: normal (1.0x)
- **Música de fondo**: suave, instrumental, baja (-15dB)

---

## Prompt base para HeyGen (pegar en el campo de script)

> Copia el guion del VIDEO que quieras (de GUION-HEYGEN-POR-MODULO.md) y pégalo aquí.
> Luego pega este prompt en la descripción del video o en el sistema de prompt del avatar:

---

**Prompt del sistema (para todos los videos):**

```
Eres un especialista en experiencia al cliente y tecnología operativa que presenta CXOrbia, 
una plataforma SaaS para consultoras de mystery shopping y auditoría.

Habla en primera persona plural ("nosotros", "nuestra plataforma").
Sé directo, concreto y usa ejemplos operativos reales (visitas, evaluadores, liquidaciones, cuestionarios).
Evita tecnicismos innecesarios; si usas uno, explícalo en una frase.
Cierra cada video con una llamada a la acción corta: "Explóralo en el módulo X" o "Te vemos en el siguiente video".
Duración objetivo: 90 a 120 segundos por video.
```

---

## Configuraciones por video

| # | Tema | Longitud | Tono | Fondo |
|---|---|---|---|---|
| 01 | Introducción | 2 min | Inspirador | Logo CXOrbia grande |
| 02 | Crear cliente | 2 min | Tutorial | Pantalla de la plataforma |
| 03 | Dashboard | 2 min | Analítico | Gráficas de fondo |
| 04 | Shopper | 2 min | Amigable | App móvil de fondo |
| 05 | Cuestionarios | 2 min | Técnico amigable | Editor de cuestionario |
| 06 | Liquidaciones | 2 min | Práctico | Tabla de pagos |
| 07 | Portal cliente | 2 min | Estratégico | Dashboard del cliente |
| 08 | CRM | 2 min | Comercial | Kanban pipeline |
| 09 | Automatizaciones | 2 min | Técnico | Flujo de Make |
| 10 | Backend | 3 min | Técnico | Código/Firebase |

---

## Flujo de producción recomendado

1. Abre HeyGen → Crear video → Selecciona avatar
2. Pega el guion del módulo correspondiente en el campo de script
3. Elige voz: español neutro, velocidad 1.0x
4. Ajusta pausas donde hay puntos seguidos (HeyGen respeta la puntuación)
5. Añade el logo de CXOrbia como overlay (esquina superior derecha, transparencia 80%)
6. Renderiza en 1080p
7. Sube a la plataforma en el módulo de Aprendizaje correspondiente (Capacitación & IA → Aprendizaje → bloque del módulo)

---

## Nota sobre personalización por cliente

Para adaptar los videos a un cliente específico (ej. TyA):
- Reemplaza "tu consultora" por el nombre del cliente
- Reemplaza "evaluadores" por el término que usen ("shoppers", "visitadores", "auditores")
- Ajusta los ejemplos de países/monedas a los suyos
- Renderiza una versión "blanca" y una versión con la marca del cliente
