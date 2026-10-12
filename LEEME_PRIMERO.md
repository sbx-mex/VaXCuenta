# VaXCuenta: listo para GitHub

PWA de Starbucks México para comparar **recaudación real vs. objetivo**, por **Región, DM y Tienda**. Campaña del **1 de octubre al 30 de noviembre de 2026**.

## Publicar en cuatro pasos

1. Crea un repositorio nuevo llamado **VaXCuenta**.
2. Descomprime el ZIP y sube **todo el contenido que está dentro de la carpeta VaXCuenta**, incluyendo `.github`. No subas únicamente el ZIP ni coloques el proyecto dentro de otra carpeta del repositorio.
3. En el repositorio, entra a **Settings → Pages → Build and deployment → Source** y elige **GitHub Actions**.
4. En **Actions**, abre **Validar y publicar VaXCuenta** y elige **Run workflow**. Cuando termine en verde, abre el enlace que muestra el paso de publicación.

El flujo revisa los datos y los cálculos antes de publicar. No necesitas instalar paquetes ni cambiar rutas para el nombre del repositorio. Si subes archivos desde la web y no ves `.github`, créala o súbela desde GitHub Desktop; esa carpeta contiene la publicación automática.

## Consulta inicial

| Información real al | Recaudado | Objetivo al corte | Avance | Faltante |
| --- | ---: | ---: | ---: | ---: |
| 11 de octubre de 2026 | $3,349,828 | $3,526,930 | 95.0% | $177,102 |

La semana 40 va del 28 de septiembre al 4 de octubre. El tablero incluye el real del **1 al 4 de octubre** y conserva el **objetivo semanal completo**. Del CSV se separaron **$4,120 de septiembre**.

## Actualizar la recaudación

Reemplaza **data/Va X Cuenta.csv** por la exportación acumulada **desde el 1 de octubre hasta el último día real**. Conserva su nombre y sus encabezados. Puedes usar UTF-16 o UTF-8.

Al confirmar el cambio en `main`, el mismo flujo recalcula, valida y publica. El corte se obtiene de las fechas del CSV. No edites una fecha para aparentar un avance. Una carga que retrocede el corte o pierde el inicio del acumulado se rechaza; no mezcles varios archivos del mismo corte.

Si cambian las metas, reemplaza **data/VaxCuenta Objetivos 26.xlsx** conservando sus ocho encabezados. Para actualizar responsables, reemplaza **data/Directorio.xlsx** conservando CC, Región y DM. La unión siempre es por CeCo.

## Pendientes del origen

- El Excel trae semanas **40 a 48**. Falta agregar el objetivo de la **semana 49**, correspondiente al **30 de noviembre**. El tablero lo identifica sin extrapolarlo.
- **10 tiendas** no tienen DM confirmado; **8 están activas al corte** y 2 tienen metas posteriores. Sus cifras permanecen visibles bajo una asignación pendiente.
- Miguel Aleman MTY tiene cinco metas con CeCo `pendiente`: quedan en auditoría hasta contar con el código.
- **14 importes** no son múltiplos de $10. Se conservan exactamente; el indicador derivado es “donativos equivalentes”.

Consulta **docs/AUDITORIA.md** para la conciliación y **docs/METODOLOGIA.md** para las reglas de cálculo.

## Abrirlo antes de publicar

La carpeta **dist/** incluye el sitio preparado. Desde la carpeta VaXCuenta ejecuta:

```sh
python -m http.server 8000 --directory dist
```

Abre **http://localhost:8000**. En macOS/Linux usa `python3` si `python` no está disponible. La PWA se instala desde HTTPS o localhost. Evita abrir index.html con doble clic, porque el navegador no permite cargar el archivo de datos así.

Para consultar sin conexión, abre primero el tablero con internet. La app conserva el último corte descargado y muestra su fecha.
