# VaXCuenta · Starbucks México

PWA para comparar **acumulado al corte vs. meta total cargada de campaña** por **Región, DM y Tienda**, en la campaña del **1 de octubre al 30 de noviembre de 2026**.

La entrada pública es **index.html en raíz**, con verde Starbucks, naranja sutil, logotipo, filtros, detalle diario de tienda, comparación semanal, avance de toda la campaña, exportación y soporte sin conexión.

**Publicar y ver: [LEEME_PRIMERO.md](LEEME_PRIMERO.md).**

## Una sola fuente

| Archivo o carpeta | Uso |
| --- | --- |
| `index.html`, `app.mjs`, `model.mjs`, `styles.css` | App y cálculos editables en raíz. |
| `assets/` | Logotipo de campaña e iconos PWA. |
| `data/Va X Cuenta.csv` | Recaudación original por CeCo y día. |
| `data/VaxCuenta Objetivos 26.xlsx` | Metas originales por CeCo y semana. |
| `data/Directorio.xlsx` | Nombre de tienda, región y DM vigentes. |
| `data/dashboard.json` | Corte preparado por el importador. |
| `scripts/sw.template.js` | Plantilla del Service Worker. El build genera `sw.js` con versión. |
| `scripts/legacy-files.json` | Lista exacta de copias anteriores que puede retirar el workflow. |
| `dist/` | Artefacto temporal de publicación, ignorado en Git y fuera del ZIP correctivo. |

La carpeta anterior `site/` y el `dist/` que estaba guardado en el repositorio se retiran después de validar sus huellas y el reemplazo correcto en raíz. El conjunto de regresión es compacto y conserva los casos necesarios para las pruebas. La carga pública conserva sólo los CeCo con objetivo positivo; los importes excluidos se concilian en auditoría.

## Workflow

**VaXCuenta - Validar, limpiar y publicar** valida las fuentes y pruebas, aplica la limpieza verificada, guarda las eliminaciones y los archivos generados, construye un artefacto con lista explícita de recursos públicos y lo publica en GitHub Pages. CSV, Excel, scripts y auditorías quedan fuera del artefacto de publicación.

El job de limpieza usa `contents: write` sólo para guardar los cambios validados. No necesita PAT ni un secreto adicional. El push es normal, sin `--force`: una actualización posterior en `main` no se sobrescribe. En pull requests se ejecutan los controles sin publicar ni guardar cambios en el remoto.

La raíz también contiene la app completa para evitar que la configuración de publicación por rama sirva el README. El modo recomendado para un único flujo de publicación es **GitHub Actions**.

## Evaluar la campaña

Sólo se consideran CeCo con meta total positiva, incluidos los de metas futuras. Los CeCo sin objetivo o con meta cero se excluyen. Meta total cargada = suma de todos los objetivos del Excel; avance campaña = acumulado completo al corte ÷ meta total cargada. Falta semana 49: se señala la base incompleta sin estimar importes. La fecha de publicación no cambia el corte.

## Actualizar

Reemplaza el CSV acumulado desde el 1 de octubre; conserva sus encabezados y su nombre. El corte proviene del último día real de CeCo con objetivo dentro de la campaña. Las cargas que retroceden el corte o pierden el inicio del acumulado se rechazan. Se mantienen los importes no múltiplos de $10 y se distinguen sin registro, cero y meta pendiente.

Las metas y la región/DM se unen por CeCo. La semana 40 conserva el objetivo semanal completo. En semanas posteriores en curso la meta monetaria se prorratea por días calendario hasta el corte. El dato diario del Excel se conserva como número independiente en el detalle. La meta total cargada incluye también las semanas futuras; el selector semanal sólo cambia el detalle del periodo.

**Directorio.xlsx del propio repositorio es la fuente vigente de nombre, región y DM.** Metas y real se unen por CeCo y se agrupan juntos con esa asignación. Los importes originales no cambian. Una tienda ausente del directorio conserva sus importes en Por asignar y su DM queda pendiente. Se rechazan asignaciones contradictorias del mismo CeCo antes de escribir el corte.

Centro Norte tiene **73 tiendas con objetivo de campaña**: **$205,870 acumulados / $1,198,560 de meta total cargada = 17.2%**, al 12 de octubre. Atana Lindavista (43194) está en Centro Norte. Los nombres y regiones originales de metas se conservan como referencia de auditoría; el reporte Excel muestra ambas regiones. **Acerca de** incluye el propósito de VaXCuenta y los perfiles de Enrique César Flores y Jorge Alcantar Aguiar.

## Exportar la consulta

El botón **Exportar** muestra primero una vista previa del alcance, periodo real, corte del archivo y cuatro indicadores. Conserva filtros y búsqueda durante la descarga.

- **Descargar resumen PDF**: resultados por Región o DM, lectura del avance y avisos para revisar. Centro Norte, semana 40, ocupa una página con seis DM, aunque la tabla de pantalla esté en Tiendas.
- **Descargar Excel para validar**: Campaña, Resumen, Validación, Tiendas, Real diario, Metas, Real campaña y Metas campaña. Conserva todas las filas del alcance, valores numéricos, fechas y fórmulas que vinculan el real y las metas por CeCo. Doce controles muestran diferencias y OK/REVISAR.
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

La app también rechaza datos compilados duplicados o inválidos antes de mostrarlos. Si el real precede a la primera meta disponible, señala la comparación como incompleta. Las siguientes versiones se aplican mediante **Usar versión nueva**, al terminar la consulta; los filtros se conservan en el enlace.
