# G ♥ J — Nuestra Historia

Una aplicación web personal para guardar y visualizar los momentos más importantes de una historia en pareja. Un timeline interactivo que recoge hitos, viajes, estudios, trabajo y momentos de vida compartidos desde 2018.

## ✨ Características

- **Timeline vertical y horizontal** — cambia entre vistas con un clic
- **Agrupación por mes** — los eventos del mismo mes comparten un único punto central
- **Punto multicolor** — el punto se pinta con un `conic-gradient` y cada color apunta hacia la tarjeta de su protagonista; las tarjetas ramifican desde ese punto común
- **Filtros** por protagonista (Juntos, Jorge, Gema), categoría y año
- **Búsqueda** en tiempo real por título o descripción
- **Añadir / editar / eliminar eventos** con formulario integrado
- **Galería de fotos** por evento con lightbox y soporte drag & drop
- **Exportar / importar** datos en JSON
- **Tema claro/oscuro** persistente
- **Diseño responsive** con menú hamburguesa en mobile
- **Back-to-top** con detección automática de scroll

## 🚀 Cómo arrancar en local

```bash
python3 -m http.server 8080
```

Luego abre el navegador en **http://localhost:8080**

> También puedes usar cualquier otro puerto cambiando el número al final:
> ```bash
> python3 -m http.server 3000
> ```

## 🛑 Cómo parar el servidor

Si lo lanzaste en una terminal abierta, basta con pulsar **`Ctrl + C`** en esa terminal.

Si quedó corriendo en segundo plano, busca el proceso por su puerto y mátalo:

```bash
# Ver qué proceso ocupa el puerto 8080
lsof -ti:8080

# Pararlo directamente
kill $(lsof -ti:8080)
```

## 📁 Estructura del proyecto

```
nosotros/
├── index.html              # Entrada principal
├── assets/
│   ├── css/
│   │   ├── style.css       # Entrada principal e importación de cascada
│   │   ├── variables.css   # Tokens de diseño, temas y reset global
│   │   ├── header.css      # Cabecera, menú hamburguesa y barra de filtros
│   │   ├── timeline.css    # Diseño de timeline vertical y horizontal
│   │   └── ui.css          # Modales, formulario, lightbox, toasts y FAB
│   └── js/
│       ├── config.js       # Configuración (categorías, personas, meses)
│       ├── storage.js      # Persistencia en localStorage + import/export
│       ├── events.js       # Store de eventos y filtros
│       ├── gallery.js      # Gestión de imágenes, lightbox, dropzone
│       ├── timeline.js     # Renderizado del timeline (vertical/horizontal)
│       └── app.js          # Lógica principal y coordinación de módulos
└── data/                   # Datos de ejemplo (JSON)
```

## 🛠️ Tecnologías

- HTML5 + CSS3 vanilla (sin frameworks)
- JavaScript ES6+ (sin dependencias externas)
- Google Fonts: Playfair Display + Inter
- Almacenamiento en `localStorage`
- Imágenes opcionales vía [ImgBB API](https://api.imgbb.com/) o base64 local
