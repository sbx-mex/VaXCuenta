# Validación de VaXCuenta con el directorio vigente

Base revisada: **sbx-mex/VaXCuenta**, commit **98d942032610e80d0a79643b909fde6c80de37c0**. Corte real: **11 de octubre de 2026**.

## Resultado

**103 pruebas aprobadas: 45 Python y 58 JavaScript.** Se verifican importación, CeCo, duplicados, asignaciones, importes, periodos, filtros, exportaciones, limpieza protegida y PWA. El sitio preparado contiene **26 archivos públicos**. Los archivos Excel y CSV originales no se modifican.

| Control | Resultado |
| --- | --- |
| Directorio | 969 CeCo únicos; 13 claves repetidas consolidadas sin duplicar importes. |
| Asignaciones | Nombre, región y DM provienen del Directorio.xlsx del propio repositorio. |
| Futuro cambio de directorio | Prueba cambia nombre, región y DM de Angel; metas e importes reales permanecen iguales. |
| Identidades contradictorias | La carga rechaza el mismo CeCo con distintos nombres, regiones o DM antes de escribir el corte. |
| Pendientes de directorio | 9 tiendas ausentes; conservan sus importes en Por asignar. |
| Estatus contradictorio | CeCo 43256, Por confirmar; no excluye ni duplica importes. |
| Región de metas vs. directorio actual | Sin diferencias en las fuentes actuales; se conserva la región original para futuras comparaciones. |
| Real nacional de campaña | $3,349,828; 9,372 registros, fechas e importes preservados. |
| Centro Norte, semana 40 | 72 tiendas; $58,420 real, $132,480 objetivo, 44.1% avance, $74,060 faltante. |
| Centro Norte, acumulado | 72 tiendas; $188,780 real, $258,960 objetivo, 72.9% avance. |

## Exportaciones

El XLSX real generado por la aplicación se abre con un lector independiente de Python. Las cinco hojas son **Resumen, Validación, Tiendas, Real diario y Metas**. Se comparan todos los CeCo del alcance, importes reales, metas y proyecciones diarias contra las fuentes originales. Las ocho diferencias son cero y sus resultados OK.

Tiendas muestra región vigente, región original de metas, fuente de asignación y estatus del directorio. Los importes continúan calculándose desde Real diario y Metas mediante fórmulas por CeCo. Los nuevos campos de asignación no alteran las referencias financieras. Las fórmulas, los valores numéricos y las fechas tipadas se verifican en el archivo exportado; no se realizó una sesión de Microsoft Excel.

El resumen PDF regional es una página horizontal con seis DM, indicadores, cobertura y explicación del avance. Se verificó su texto con un lector independiente y se revisó el render de la página: totales legibles, fuentes incluidas y sin elementos cortados. El PDF detallado conserva todas las tiendas y se pagina.

## Navegador

Se revisó Chromium en **1440, 390 y 320 px**. Se comprobaron inicio, filtros, semana, detalle de tienda, búsqueda inmediata, navegación Acerca de, carga de ambas fotografías, retorno a la consulta y descargas reales XLSX/PDF. Sin errores de JavaScript ni desbordamiento horizontal en esos tamaños. Se inspeccionaron capturas de escritorio y móvil.

Acerca de usa las fotografías adjuntas sin alterar sus bytes. Los recursos nuevos se incluyen en el build y el caché offline. La primera instalación no anuncia falsamente una actualización pendiente. La versión nueva se activa al pulsar Usar versión nueva; el cambio de controlador sólo recarga la pestaña que solicitó la actualización. Se cubren esos estados con pruebas específicas y una actualización real de Service Worker en Chromium que conserva Región y Periodo.

## Refuerzo del motor de cálculo

Antes de mostrar el corte, se comprueban CeCo únicos, claves CeCo+día únicas, fechas reales válidas, importes en centavos enteros, semanas conocidas y conciliación de meta semanal con donativos proyectados. Los registros se ordenan por fecha para determinar el último día correctamente. Si hay real de una semana previa a la primera meta disponible, la comparación acumulada queda incompleta y se suprime su porcentaje.

## Publicación

El PR aplica los archivos del ZIP validado y refuerza el motor de cálculo y la actualización de la PWA. Se comprueba siguiendo el flujo: datos, pruebas Python, plan de limpieza, pruebas JavaScript, limpieza, preparación de eliminaciones, build y verificación del artefacto.

GitHub Actions valida los pull requests sin publicar. Al integrar en main, vuelve a validar y publica el artefacto. El corte de la información sigue siendo el del CSV, no la fecha de publicación.
