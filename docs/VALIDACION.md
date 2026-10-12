# Validación del proyecto

Corrección de Python auditada el **12 de octubre de 2026**. Información real al **11 de octubre**.

## Resultado

**66 pruebas automatizadas aprobadas: 30 de Python y 36 de JavaScript.** Se ejecutaron sobre una copia exacta del repositorio actual, primero con las carpetas antiguas presentes y después en un checkout limpio de la versión corregida. La preparación del sitio y la verificación de publicación finalizaron correctamente en ambas ejecuciones.

## Fallo auditado y corrección

La ejecución [38317971674](https://github.com/sbx-mex/VaXCuenta/actions/runs/38317971674), del commit `172c97b96131c6c85724877e4dc9a80d2d0d2f92`, falló en cuatro pruebas de `tests/test_cleanup.py`. El importador de datos sí terminó correctamente. El entorno de cada prueba copiaba `site/` del checkout y después creaba un manifiesto de prueba con sólo dos archivos. Los otros archivos heredados se detectaban como desconocidos, por lo que la limpieza protegida se detenía.

La corrección excluye `site/` y `dist/` al construir el entorno temporal de cada prueba. La limpieza real sigue verificando las huellas de todas las copias del repositorio. El workflow prepara explícitamente **Python 3.12** y `.gitignore` excluye el `dist/` generado. Se mantuvieron las 30 pruebas de Python y las 36 de JavaScript, con sus verificaciones y fallos efectivos.

Se reprodujeron los cuatro errores antes de corregirlos, usando Python 3.12.14. Después se repitieron los comandos del workflow en el orden declarado en el YAML y se comprobó el commit automático contra un remoto Git local.

| Control | Resultado |
| --- | --- |
| Conciliación del CSV completo | $3,353,948 = $3,349,828 de campaña + $4,120 fuera de campaña. |
| Objetivo al corte, semanas 40 y 41 | $3,526,930. |
| Avance nacional, razón de totales | 94.978579%; se presenta redondeado a 95.0%. |
| Faltante nacional | $177,102. |
| Tiendas activas al corte | 975; 944 con recaudación registrada y 31 sin fila de campaña. |
| Región, DM y Tienda | Los tres niveles conservan las mismas sumas de real y objetivo. |
| Claves financieras | Sin duplicados de CeCo + fecha ni CeCo + semana. |
| Semana 40 parcial | El real empieza el 1 de octubre; se conserva la meta semanal completa. |
| Objetivo diario | Se conserva como número, incluidos decimales y bases diarias del origen. |
| Siguientes cortes | Se probaron el avance al lunes 12 de octubre y una corrección del mismo corte. |
| Carga acumulada | Rechaza retroceso de corte o pérdida del inicio de campaña. |
| Datos faltantes | Distingue sin registro, cero real y objetivo pendiente. |
| DM pendiente | 10 tiendas en el catálogo; 8 activas al corte y 2 con metas posteriores. |
| Caché de PWA | Sólo toca su propia ruta; usa el corte de red y conserva el descargado sin conexión. |
| Exportación | Comparte el mismo alcance, periodo, búsqueda y sumas de la pantalla. |
| Recursos de publicación | Rutas relativas, iconos PNG con tamaño correcto y módulos disponibles. |
| Archivos de origen | Quedan fuera de la carpeta publicada. |

## Cobertura de aplicación

Se probaron la carga inicial y eventos de filtros, agrupación, detalle de tienda, búsqueda, restablecimiento, ayuda de instalación y recuperación ante una actualización fallida en un DOM simulado en Node. Las pruebas del Service Worker verifican precarga, actualización del corte, lectura sin conexión, navegación con filtros y separación de cachés por proyecto.

Se comprobaron de forma independiente las sumas vigentes contra el origen y las reglas con un conjunto fijo de regresión. Una actualización legítima de los archivos no queda bloqueada por valores históricos fijados en una prueba.

## Límites de la verificación

No se ejecutó una revisión visual en un navegador real, ni el diálogo nativo de impresión o instalación en un dispositivo, durante esta entrega. La PWA y la vista PDF están implementadas y sus archivos y reglas fueron comprobados; su apariencia y los diálogos nativos deben revisarse al abrir el sitio preparado.

Se verificó el repositorio sbx-mex/VaXCuenta en el commit `172c97b96131c6c85724877e4dc9a80d2d0d2f92`. Sus **79 archivos** coinciden por huella Git con la copia usada para reproducir y corregir el fallo. Esta entrega es un ZIP correctivo para cargar al repositorio; no se alteró el remoto desde esta sesión. La ejecución verde y la publicación en GitHub deben comprobarse después de cargarlo. La acción de preparación de Python se contrastó con su definición oficial de `actions/setup-python@v6`.

Las notas de los archivos de origen siguen visibles en el tablero y en AUDITORIA.md. Las pruebas aprobadas validan su tratamiento; no convierten una asignación o una meta faltante en un dato confirmado.

## Corrección comprobada

- index.html contiene la app completa en raíz, con todos sus recursos relativos.
- Se probó la actualización sobre una copia exacta del repositorio vigente, con site/ y dist/ todavía presentes: las 66 pruebas pasaron, se retiraron 33 archivos antiguos, se guardó el commit en un remoto Git local y se verificaron los 17 archivos públicos.
- Se clonó el resultado y se ejecutó nuevamente el mismo flujo: las 66 pruebas volvieron a pasar, se conservaron el historial de limpieza y la versión PWA `61dc588e86336398`, y no se creó un commit vacío.
- Los tres orígenes CSV/Excel y config.json permanecieron idénticos por SHA-256.
- La publicación usa la misma entrada, corte y versión PWA de la raíz; no contiene el README ni archivos de origen.
- El fixture de regresión fue reducido a 6,650 bytes; los datos operativos siguen completos.
- El ZIP incluye solamente seis archivos nuevos o modificados. No contiene CSV, Excel, copias de site/ ni el dist/ generado.

La vista previa HTML de la entrega anterior conserva los indicadores correctos. Este ZIP corrige el workflow y sus pruebas; no sustituye la revisión visual del sitio publicado en un navegador real.
