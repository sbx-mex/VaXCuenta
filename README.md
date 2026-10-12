# VaXCuenta · Starbucks México

PWA estática de recaudación para la campaña del **1 de octubre al 30 de noviembre de 2026**. Compara pesos reales con el objetivo proyectado y resume **Región, DM y Tienda**.

La pantalla muestra cuatro indicadores: **recaudado**, **objetivo al corte**, **avance** y **faltante**. Incluye filtros dependientes, búsqueda por CeCo o nombre, detalle diario de tienda, tendencia semanal, exportación a CSV y una vista de impresión para guardar como PDF. El objetivo diario se muestra como número de donativos.

**Empieza por [LEEME_PRIMERO.md](LEEME_PRIMERO.md)** para publicar y actualizar.

## Datos

| Archivo | Uso |
| --- | --- |
| `data/Va X Cuenta.csv` | Recaudación original por CeCo y día, expresada en MXN. |
| `data/VaxCuenta Objetivos 26.xlsx` | Metas originales por CeCo y SEM_ALSEA. |
| `data/Directorio.xlsx` | Región y DM de Esfuerzo Operativo. |
| `config.json` | Fechas de campaña, semana ancla y reglas del objetivo. |
| `site/data/dashboard.json` | Datos preparados para la consulta. Se genera automáticamente. |

El importador usa Python sin paquetes externos. Conserva los archivos fuente, rechaza claves financieras duplicadas y prepara el resultado con escritura atómica. El corte proviene del máximo día real dentro de la campaña. Los reemplazos deben conservar el acumulado.

Región y DM se toman del directorio operativo. Si una tienda no está en él, se conserva la región del Excel y se identifica su DM como pendiente. Ambas métricas se asignan a la misma tienda y región; ninguna fila real se pierde por falta de responsable.

## Publicación

La carpeta `.github/workflows` contiene la validación y el despliegue a GitHub Pages. El artefacto publicado es exclusivamente `dist/`; los Excel, CSV originales, motores, pruebas y auditorías permanecen fuera de ese artefacto.

Las rutas del sitio, el manifiesto y el Service Worker son relativas. Funciona en el subdirectorio del repositorio sin cambiar un base path. No depende de CDN, fuentes externas ni un servidor de aplicación. El Service Worker usa una caché propia por ruta y solicita primero el corte más reciente; sin conexión informa que está mostrando el último descargado.

Un despliegue convencional de GitHub Pages abre las cifras sin inicio de sesión. Región, DM y Tienda son filtros de consulta, no permisos. La visibilidad del repositorio y la del sitio se configuran por separado en GitHub.

## Verificación y desarrollo

Requiere Python 3.10+ y Node 20+. No requiere `npm install` ni `pip install`.

```sh
python3 scripts/build_data.py
python3 -m unittest discover -s tests -p 'test_*.py' -v
npm test
npm run build
python3 scripts/verify_release.py
python3 -m http.server 8000 --directory dist
```

`site/` contiene la aplicación editable. `dist/` es el sitio preparado para publicar. Modifica `site/` y vuelve a ejecutar el build; las modificaciones directas en `dist/` se sobrescriben.

Las pruebas de regresión usan un conjunto fijo del corte inicial en `tests/fixtures/`, para que un nuevo corte no rompa pruebas por importes históricos fijados. Las pruebas de integración contrastan además la carga vigente con su auditoría.

## Identidad visual

Verde Starbucks `#006241`, naranja cálido y fondos claros. El logotipo Va por mi cuenta se muestra desde el marco original del PowerPoint adjunto, conservado en `site/assets/campaign-frame.png`. El icono de la app es SVG con sus variantes PNG para instalación. El diseño se adapta a móvil con tarjetas por resultado y no requiere desplazamiento horizontal de la tabla.

## Documentación

- [Metodología](docs/METODOLOGIA.md)
- [Auditoría de fuentes](docs/AUDITORIA.md)
- [Validación del proyecto](docs/VALIDACION.md)
- [Publicación oficial con GitHub Actions](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)
- [Instalación de PWA](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable)
