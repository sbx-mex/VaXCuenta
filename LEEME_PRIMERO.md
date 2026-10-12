# VaXCuenta corregido: cargar y ver

Este ZIP corrige el problema de ver el README en el enlace del sitio. La app completa queda en **index.html, en la raíz**. Incluye el workflow **VaXCuenta - Validar, limpiar y publicar**.

## Dos pasos

1. Descomprime el ZIP. Sube **todo el contenido de la carpeta VaXCuenta** a la raíz de **sbx-mex/VaXCuenta**, reemplazando los archivos existentes. Incluye `.github/workflows/deploy-pages.yml`. No subas el ZIP como archivo ni subas la carpeta VaXCuenta dentro del repositorio. Los tres archivos originales CSV/Excel no están en este ZIP correctivo: el flujo conserva los que ya cargaste en `data/`.
2. En **Actions**, abre **VaXCuenta - Validar, limpiar y publicar** y ejecuta **Run workflow → main**. Al terminar en verde abre **https://sbx-mex.github.io/VaXCuenta/**. Usa **Ctrl + F5** si conservas la página anterior.

La app ya está en raíz y funciona con la configuración `main / (root)` que muestras. Para que sólo publique el flujo validado, selecciona **Settings → Pages → Source → GitHub Actions**.

## Ver antes de subir

El ZIP contiene **VaXCuenta_Vista_Previa.html**, fuera de la carpeta que se carga a GitHub. Ábrelo con doble clic en Chrome o Edge: muestra la app con el corte real del **11 de octubre** sin instalar nada. Es una vista local fija para revisión; no se carga al repositorio. La instalación PWA y las actualizaciones se usan en el sitio publicado.

## Qué hace el workflow

- Valida los CSV, metas, CeCo, fechas y totales.
- Ejecuta **66 pruebas** de datos, app, PWA y limpieza.
- Revisa las huellas de las copias anteriores de **site/** y **dist/**.
- Elimina **33 archivos antiguos identificados**, después de validar la app de raíz. Si encuentra otra versión o archivos desconocidos, se detiene antes de borrar.
- Guarda la limpieza y el corte mediante un commit automático, sin sobrescribir commits posteriores.
- Genera un `dist/` nuevo sólo durante la ejecución y publica exclusivamente el tablero.

**No borres a mano `data/`, `tests/`, `scripts/` ni los Excel.** Las eliminaciones autorizadas están listadas en **docs/OBSOLETOS.md**. El flujo guarda su resultado en **docs/LIMPIEZA_OBSOLETOS.json**.

## Datos confirmados

| Corte | Recaudado | Objetivo | Avance | Faltante |
| --- | ---: | ---: | ---: | ---: |
| 11 de octubre de 2026 | $3,349,828 | $3,526,930 | 95.0% | $177,102 |

La semana 40 conserva la meta semanal completa. Los $4,120 previos al 1 de octubre no entran al avance. Siguen señaladas la meta faltante del 30 de noviembre y las asignaciones pendientes de DM.

## Actualizar después

Reemplaza **data/Va X Cuenta.csv** con el acumulado desde el **1 de octubre hasta el último dato real**. Mantén los nombres originales del Excel de metas y del directorio. El workflow recalcula y publica; no añadas otra carpeta `site/` ni vuelvas a subir `dist/`.
