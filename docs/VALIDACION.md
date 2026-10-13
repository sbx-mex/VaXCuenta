# Validación de VaXCuenta: exportación resumida

Entrega revisada con los archivos de **sbx-mex/VaXCuenta**, commit **5684646c2ae190c687d72e0c5e356405bb75e632**. El origen contiene información real al **11 de octubre de 2026**.

## Resultado

**89 pruebas aprobadas: 39 Python y 50 JavaScript.** Se validan la importación, limpieza protegida, reglas monetarias, periodos, filtros, exportaciones y PWA. El artefacto contiene **24 archivos públicos**, incluyendo los generadores y las fuentes embebidas del PDF.

| Comprobación | Resultado |
| --- | --- |
| Centro Norte, semana 40 | 71 CeCo; real $58,420, objetivo $130,820, avance 44.7%, faltante $72,400. |
| Periodo real semanal | 1–4 octubre: 239 filas de 70 tiendas con registro. |
| Corte del archivo | 11 de octubre; no se confunde con el final de la semana elegida. |
| Acumulado regional | 71 tiendas; real $188,190, objetivo $255,640 y avance 73.6%. |
| Asignación regional | Región del Excel de metas. Atana Lindavista (43194) permanece en Centro Poniente; DM del directorio. |
| Jinetes (38661) | Sin registro en semana 40; conserva su meta de $1,510. |
| Real nacional | $3,349,828 de campaña; todas las fechas e importes originales preservados. |
| Objetivo nacional | $3,526,930 al mismo corte; porcentaje como razón de sumas. |
| Fuentes | CSV, Excel de metas, directorio y config conservan sus bytes y huellas. |

## Excel producido por la app

Se reabrió el XLSX con lectores independientes. Contiene **Resumen, Validación, Tiendas, Real diario y Metas**. Python verifica cada CeCo, los 71 objetivos semanales, sus proyecciones diarias numéricas y las 239 filas del CSV por CeCo, fecha e importe. Las ocho diferencias son cero y los ocho resultados son OK.

Tiendas calcula el real desde Real diario y el objetivo desde Metas. Se verificó el recálculo en un motor independiente: añadir temporalmente $10 al real actualiza el resumen de $58,420 a $58,430 y marca REVISAR el control contra el corte original; la conciliación del detalle continúa correcta. Añadir $10 a una meta actualiza el objetivo de $130,820 a $130,830 y marca el control de metas. Se restauraron los valores en memoria; el archivo original no se modificó. No se encontraron errores de fórmula. Se renderizaron y revisaron las cinco hojas.

Los importes, porcentajes, fechas y cantidades son valores tipados. La proyección diaria se presenta con dos decimales y conserva su precisión numérica. Los nombres se escriben como texto y el resultado REVISAR tiene formato de aviso.

## PDF producido por la app

El resumen de Centro Norte, semana 40, tiene **una página horizontal** con seis DM, los indicadores, cobertura, explicación del avance y los dos puntos de auditoría. El resumen acumulado regional también ocupa una página. El resumen nacional tiene dos páginas. Se leyeron sus textos y totales de forma independiente.

El PDF completo regional añade los 71 CeCo después del resumen, en siete páginas; no omite tiendas para reducir longitud. Se verifican el título, las páginas, el archivo PDF real, el logotipo y las dos fuentes Nimbus Sans embebidas. Se revisaron los renders del resumen y del detalle.

## Interfaz, PWA y workflow

La prueba de interfaz usa un DOM simulado. Verifica la vista previa, aplicación inmediata de una búsqueda pendiente, descarga XLSX y PDF real, conservación de la semana al cambiar luego los filtros y recuperación de los botones después de generar el PDF. Se comprueba el caché de los módulos y fuentes bajo la ruta del repositorio.

El workflow mantiene Python 3.12 y Node 24. Se reconstruyó una copia exacta de los 48 archivos actuales de GitHub, se aplicaron sólo las modificaciones y se ejecutaron sus comandos en orden: importación, pruebas, limpieza, preparación de eliminaciones, build, verificación y guardado validado. El push se ensayó únicamente contra un repositorio local. La limpieza protege los originales y conserva el historial; no elimina archivos desconocidos o modificados por su nombre.

No se ejecutó una revisión en navegador real ni en Microsoft Excel. La comprobación de recálculo se realizó con un motor independiente, y la revisión PDF con lectores y renders. No se modificó el repositorio remoto. La ejecución verde y publicación en GitHub se verifican al cargar esta mejora y ejecutar el nuevo commit.

Las notas de origen permanecen: semana 49 sin meta, CeCo pendiente, DM pendientes e importes no múltiplos de $10. Se conservan sus datos y se identifican las faltas sin completarlas con supuestos.
