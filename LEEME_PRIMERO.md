# VaXCuenta · Consulta breve

## Aplicar este ZIP

Extrae su contenido en la raíz de sbx-mex/VaXCuenta, respetando las carpetas y reemplazando los archivos del mismo nombre. Contiene sólo cambios necesarios; no reemplaza las fuentes CSV ni Excel. Guarda los cambios en main. El workflow existente valida con Python y JavaScript, genera la app y publica en GitHub Pages.

## Versión visual resumida

Inicio concentra indicadores y resultados. Las advertencias, pendientes de metas, CeCo sin registro y los importes a revisar están en **Acerca de → A revisar → Ver detalle**. La ampliación de fotografías abre dentro de la app; usa **Cerrar** o Escape para regresar. El pie muestra “Juntos, cada aportación cuenta.”

Esta actualización conserva la base de tiendas con objetivo positivo y su cruce con Directorio.xlsx. No cambia los importes ni el corte.

## Lectura del reporte

1. Elige Región, DM o Tienda. Nombre y asignación provienen de data/Directorio.xlsx actualizado.
2. Compara **meta total cargada → acumulado al corte → avance campaña → por recaudar**.
3. Elige una semana para el detalle del periodo. La comparación principal conserva toda la campaña.
4. Exporta PDF o Excel. Usa **Usar versión nueva** si tienes la app instalada.

Sólo se evalúan CeCo con meta total positiva. Los que tienen meta cero o no tienen objetivo quedan fuera de filtros, porcentajes y reportes; Python concilia sus importes en auditoría. Las tiendas con meta futura forman parte de la campaña, con acumulado cero si todavía no tienen registro. Sin registro no confirma una venta cero.

## Auditoría de los archivos vigentes

| Dato nacional | Resultado |
| --- | ---: |
| Corte real | 12 de octubre de 2026 |
| CeCo con objetivo positivo | 967 |
| CeCo con meta total cero excluidos | 9 |
| Meta total cargada | $16,353,570 |
| Acumulado al corte | $3,631,748 |
| Avance contra meta cargada | 22.2% |
| Por recaudar contra meta cargada | $12,721,822 |

**Falta la meta de semana 49, correspondiente al 30 de noviembre.** Se muestran los objetivos disponibles; no se inventa ese importe ni se etiqueta la base como completa. Al cargarlo, Python recalcula la meta y el avance.

## Descargas

El resumen PDF presenta los cuatro indicadores y resultados por Región o DM; el detalle PDF añade todas las tiendas. Excel abre en **Campaña** y mantiene ocho hojas: Campaña, Resumen del periodo, Validación, Tiendas, Real diario, Metas, Real campaña y Metas campaña. Las columnas P:S de Tiendas concilian la campaña mediante fórmulas. Los 12 controles de Validación deben mostrar diferencia cero y OK.

## Actualizar y validar

Conserva nombres y encabezados de data/Directorio.xlsx, data/VaxCuenta Objetivos 26.xlsx y data/Va X Cuenta.csv. El CSV debe mantener el acumulado desde el inicio; el corte sólo avanza con registros de CeCo evaluados. La fecha de publicación no cambia el corte.

```sh
python3 scripts/build_data.py
python3 -m unittest discover -s tests -p 'test_*.py' -v
npm test
python3 scripts/cleanup_legacy.py
npm run build
python3 scripts/verify_release.py
```

Validación: **48 pruebas Python y 60 JavaScript**. Se comprueban importes, exclusión sin objetivo, asignación vigente, metas futuras, independencia del selector semanal y exportaciones. Detalle en docs/AUDITORIA.md y docs/audit.json.
