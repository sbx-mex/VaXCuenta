# Auditoría del workflow de VaXCuenta

Auditado: 12 de octubre de 2026.

Repositorio: [sbx-mex/VaXCuenta](https://github.com/sbx-mex/VaXCuenta).

Commit revisado: `172c97b96131c6c85724877e4dc9a80d2d0d2f92`, 79 archivos.

Ejecución fallida: [38317971674](https://github.com/sbx-mex/VaXCuenta/actions/runs/38317971674).

## Causa confirmada

El paso de importación terminó correctamente, con corte real 2026-10-11 y recaudación de $3,349,828. Después fallaron cuatro pruebas de limpieza de Python. Su copia temporal heredaba la carpeta site/ antigua del repositorio; su manifiesto de prueba sólo conocía dos archivos. La protección contra borrar archivos desconocidos detectaba los demás y detenía la prueba.

Se reprodujeron los mismos cuatro errores con una copia de los 79 archivos, comprobados por huella Git. El error estaba en la preparación del entorno temporal de las pruebas.

## Corrección aplicada

- Las pruebas excluyen site/ y dist/ del checkout antes de crear sus propios archivos temporales. Sus once verificaciones de limpieza, protección de datos, archivos desconocidos y commits siguen activas.
- El workflow prepara Python 3.12 y mantiene los controles de datos, importación, dinero, CeCo y último corte real.
- `.gitignore` excluye dist/, que se genera exclusivamente para la publicación.
- La limpieza real conserva el manifiesto con las huellas de las 33 copias antiguas; cualquier archivo desconocido o cambiado detiene la eliminación.

## Resultado comprobado

| Control | Resultado |
| --- | --- |
| Pruebas de Python con site/ y dist/ presentes | 30 aprobadas. |
| Pruebas de JavaScript | 36 aprobadas. |
| Total | 66 aprobadas. |
| Eliminaciones verificadas | 33 copias antiguas retiradas del repositorio de prueba. |
| CSV, Excel y configuración | Idénticos por SHA-256 antes y después. |
| Publicación preparada | 17 archivos, entrada index.html completa y corte 2026-10-11. |
| Versión PWA | 61dc588e86336398. |
| Segunda ejecución desde un checkout limpio | 66 pruebas aprobadas; ningún commit vacío. |
| Push y persistencia de limpieza | Comprobados contra un remoto Git local. |

Se probaron los comandos del YAML en su orden real: datos, pruebas Python, plan de limpieza, pruebas JavaScript, limpieza, preparación de eliminaciones, build, verificación y commit. El proyecto de GitHub no fue modificado desde esta sesión. El despliegue remoto y su estado verde se comprobarán al ejecutar el nuevo commit cargado por el usuario.

## Publicar

Carga los seis archivos del ZIP en la raíz del repositorio y selecciona **Settings → Pages → Source → GitHub Actions**. Abre el workflow **VaXCuenta - Validar, limpiar y publicar** en el nuevo commit. Reejecutar el commit anterior usa el test anterior y reproduce el error.
