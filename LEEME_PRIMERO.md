# VaXCuenta: exportar, entender y validar

## Cargar esta mejora

1. Descomprime **VaXCuenta_Mejora_Exportaciones.zip**. Sube el **contenido interior de VaXCuenta/** a la raíz de **sbx-mex/VaXCuenta**, conservando las carpetas y reemplazando los archivos existentes. Guarda los cambios en **main**.
2. Ejecuta **Actions → VaXCuenta - Validar, limpiar y publicar → Run workflow → main**. El workflow existente valida con Python y JavaScript, limpia las copias obsoletas verificadas y publica el tablero. Pages debe usar **GitHub Actions**.
3. Abre **https://sbx-mex.github.io/VaXCuenta/** y actualiza con **Ctrl + F5**.

El ZIP contiene únicamente archivos nuevos o modificados del proyecto. Los archivos originales de recaudación, objetivos y directorio se conservan en el repositorio. No subas la carpeta exterior VaXCuenta como una subcarpeta adicional.

## Exportar en tres opciones

| Opción | Para qué sirve |
| --- | --- |
| **Descargar resumen PDF** | Lectura rápida: real, objetivo, avance, faltante y datos por revisar. Centro Norte, semana 40, se resume en una página con sus seis DM. |
| **Descargar Excel para validar** | Empieza en Resumen y comprueba los controles en Validación. Tiendas, Real diario y Metas permiten rastrear cada importe por CeCo. |
| **Descargar PDF con todas las tiendas** | Incluye el resumen y después todos los CeCo del alcance, con páginas numeradas. |

Antes de descargar verás el alcance, periodo, corte, importes y número de tiendas. Los archivos conservan esa consulta aunque después cambies los filtros. La búsqueda también se aplica al reporte.

## Validar en tres pasos

1. En **Resumen**, confirma región, periodo, fecha del archivo y número de tiendas.
2. En **Validación**, las ocho diferencias deben ser **0** y el resultado **OK**. Un OK confirma que los importes concilian; los avisos de falta de registro o meta requieren revisar el origen.
3. En **Tiendas**, identifica el CeCo que deseas comprobar. **Real diario** conserva sus filas e importes originales; **Metas** muestra la meta semanal, los días de objetivo y el importe aplicado al periodo. Si modificas los datos dentro de Excel, las fórmulas y los controles se actualizan.

## Ejemplo de control: Centro Norte

| Periodo | Tiendas | Real MXN | Objetivo MXN | Avance | Faltante MXN |
| --- | ---: | ---: | ---: | ---: | ---: |
| Semana 40: 1–4 octubre | 71 | $58,420 | $130,820 | 44.7% | $72,400 |
| Acumulado: 1–11 octubre | 71 | $188,190 | $255,640 | 73.6% | $67,450 |

**El archivo tiene información al 11 de octubre de 2026; la semana 40 sólo incluye real del 1 al 4 de octubre.** Se mantiene el objetivo semanal completo.

La región se toma del Excel de metas y el DM del directorio. Atana Lindavista (43194) pertenece a Centro Poniente según sus metas y no se agrega a Centro Norte. Jinetes (38661) no tiene registro de semana 40; conserva su meta de $1,510.

## Validación de la entrega

**89 pruebas aprobadas: 39 Python y 50 JavaScript.** Excel y PDF se comprobaron con lectores independientes; se revisó el recálculo y la presentación de las cinco hojas. El flujo completo se ensayó con los archivos de la versión actual de GitHub y un repositorio local de prueba.

La ejecución verde y publicación en GitHub se confirman después de cargar los archivos y ejecutar el workflow en el nuevo commit.
