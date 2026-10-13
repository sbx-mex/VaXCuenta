# VaXCuenta · Starbucks México

PWA para comparar **recaudación real vs. objetivo** por **Región, DM y Tienda**, en la campaña del **1 de octubre al 30 de noviembre de 2026**.

La entrada pública es **index.html en raíz**, con verde Starbucks, naranja sutil, logotipo, filtros, detalle diario de tienda, comparación semanal, objetivo diario numérico, exportación y soporte sin conexión.

**Publicar y ver: [LEEME_PRIMERO.md](LEEME_PRIMERO.md).**

## Una sola fuente

| Archivo o carpeta | Uso |
| --- | --- |
| `index.html`, `app.mjs`, `model.mjs`, `styles.css` | App y cálculos editables en raíz. |
| `assets/` | Logotipo de campaña e iconos PWA. |
| `data/Va X Cuenta.csv` | Recaudación original por CeCo y día. |
| `data/VaxCuenta Objetivos 26.xlsx` | Metas originales por CeCo y semana. |
| `data/Directorio.xlsx` | DM y región de referencia del directorio operativo. |
| `data/dashboard.json` | Corte preparado por el importador. |
| `scripts/sw.template.js` | Plantilla del Service Worker. El build genera `sw.js` con versión. |
| `scripts/legacy-files.json` | Lista exacta de copias anteriores que puede retirar el workflow. |
| `dist/` | Artefacto temporal de publicación, ignorado en Git y fuera del ZIP correctivo. |

La carpeta anterior `site/` y el `dist/` que estaba guardado en el repositorio se retiran después de validar sus huellas y el reemplazo correcto en raíz. El conjunto de regresión es compacto y conserva los casos necesarios para las pruebas. La carga pública mantiene todos sus registros y sus importes.

## Workflow

**VaXCuenta - Validar, limpiar y publicar** valida las fuentes y pruebas, aplica la limpieza verificada, guarda las eliminaciones y los archivos generados, construye un artefacto con lista explícita de recursos públicos y lo publica en GitHub Pages. CSV, Excel, scripts y auditorías quedan fuera del artefacto de publicación.

El job de limpieza usa `contents: write` sólo para guardar los cambios validados. No necesita PAT ni un secreto adicional. El push es normal, sin `--force`: una actualización posterior en `main` no se sobrescribe. En pull requests se ejecutan los controles sin publicar ni guardar cambios en el remoto.

La raíz también contiene la app completa para evitar que la configuración de publicación por rama sirva el README. El modo recomendado para un único flujo de publicación es **GitHub Actions**.

## Actualizar

Reemplaza el CSV acumulado desde el 1 de octubre; conserva sus encabezados y su nombre. El corte proviene del último día real dentro de la campaña. Las cargas que retroceden el corte o pierden el inicio del acumulado se rechazan. Se mantienen los importes no múltiplos de $10 y se distinguen sin registro, cero y meta pendiente.

Las metas y la región/DM se unen por CeCo. La semana 40 conserva el objetivo semanal completo. En semanas posteriores en curso la meta monetaria se prorratea por días calendario hasta el corte. El dato diario del Excel se muestra como número independiente.

La región financiera se conserva del **Excel de metas**; el directorio aporta el DM. Esto concilia Centro Norte en semana 40 con **71 tiendas y $130,820 de objetivo**. Atana Lindavista (43194), que el directorio ubica en Centro Norte, permanece en Centro Poniente según las metas. Las diferencias de asignación quedan documentadas.

## Exportar la consulta

El botón **Exportar** muestra primero una vista previa del alcance, periodo real, corte del archivo y cuatro indicadores. Conserva filtros y búsqueda durante la descarga.

- **Descargar resumen PDF**: resultados por Región o DM, lectura del avance y avisos para revisar. Centro Norte, semana 40, ocupa una página con seis DM, aunque la tabla de pantalla esté en Tiendas.
- **Descargar Excel para validar**: Resumen, Validación, Tiendas, Real diario y Metas. Conserva todas las filas del alcance, valores numéricos, fechas y fórmulas que vinculan el real y las metas por CeCo. Ocho controles muestran diferencias y OK/REVISAR.
- **Descargar PDF con todas las tiendas**: resumen más lista completa de CeCo y sus importes, con páginas numeradas.

`report.mjs` prepara una misma consulta para ambas exportaciones y comprueba que el resumen concilie con las tiendas, el real diario y las metas del periodo antes de descargar. Las filas sin registro conservan su objetivo; las metas incompletas se señalan sin inventar un avance.

PDF-LIB 1.17.1, sus fuentes CFF Nimbus Sans y las licencias están incluidos en `vendor/`. El PDF lleva las fuentes embebidas y el logotipo de campaña para mantener una lectura consistente. Los recursos de exportación forman parte de la PWA; después de la primera visita están disponibles sin conexión.

## Validar localmente

Python 3.10+ y Node 20+. Sin `pip install` ni `npm install`.

```sh
python3 scripts/build_data.py
python3 -m unittest discover -s tests -p 'test_*.py' -v
npm test
python3 scripts/cleanup_legacy.py
python3 scripts/cleanup_legacy.py --apply
npm run build
python3 scripts/verify_release.py
python3 -m http.server 8000 --directory dist
```

La limpieza se ejecuta **antes del build**. Si ya existe un `dist/` recién generado, no se considera una copia anterior por nombre; sus huellas son distintas y el limpiador no lo elimina.

## Documentación

- [Metodología](docs/METODOLOGIA.md)
- [Auditoría de datos](docs/AUDITORIA.md)
- [Obsoletos identificados](docs/OBSOLETOS.md)
- [Validación y límites](docs/VALIDACION.md)
- [GitHub Pages con workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)

Un despliegue convencional de GitHub Pages permite consultar las cifras sin inicio de sesión. Región, DM y Tienda son filtros de consulta. La primera visita guarda el corte para consulta sin conexión, siempre con su fecha visible.
