# VaXCuenta: directorio vigente y consulta clara

## Consultar la app

1. Abre https://sbx-mex.github.io/VaXCuenta/.
2. Elige Región, DM o Tienda y el periodo. Compara real y objetivo del mismo alcance.
3. Usa Exportar para compartir el resumen PDF o revisar el detalle en Excel.
4. Cuando aparezca **Usar versión nueva**, selecciónalo al terminar la consulta. Los filtros del enlace se conservan. Para adoptar esta primera mejora desde una versión anterior, cierra las otras ventanas de VaXCuenta y vuelve a abrirla.

## Actualizar las fuentes

Reemplaza los archivos en data/ conservando nombres y encabezados: **Directorio.xlsx**, **VaxCuenta Objetivos 26.xlsx** y **Va X Cuenta.csv**. El CSV debe conservar el acumulado desde el inicio de campaña. Guarda los cambios en main y revisa **Actions → VaXCuenta - Validar, limpiar y publicar**. El workflow valida y publica; Pages debe usar **GitHub Actions**.

Nombre de tienda, región y DM siguen el Directorio.xlsx del propio repositorio. Objetivos y real se unen por CeCo, sin cambiar sus importes. Las asignaciones contradictorias bloquean una carga; las tiendas ausentes conservan sus importes en Por asignar.

## Qué cambia

- **Directorio.xlsx manda:** nombre, región y DM se actualizan por CeCo. Real y metas se agrupan juntos. Si falta una tienda, sus importes permanecen en Por asignar.
- **Lectura en tres pasos:** elige tu alcance, compara real y proyección, exporta y valida. Una frase explica cuánto se proyectó, cuánto se recaudó y cuánto falta.
- **Exportación con vista previa:** confirma periodo, corte, tiendas e importes antes de descargar. Conserva filtros y búsqueda.
- **Validación en pantalla:** se rechazan CeCo o días duplicados, importes inválidos y metas que no concilian. Un real previo a la primera meta disponible marca la comparación incompleta.
- **Actualizar la app:** el botón Usar versión nueva aplica la actualización al seleccionarlo y conserva los filtros del enlace.
- **Acerca de:** propósito de VaXCuenta, fotografías de Enrique César Flores y Jorge Alcantar Aguiar y un mensaje de acompañamiento a los equipos.

## Exportar y validar

| Descarga | Uso |
| --- | --- |
| Resumen PDF | Comparte indicadores, avance, cobertura y notas del periodo. |
| Excel para validar | Resumen, Validación, Tiendas, Real diario y Metas. Región vigente y original de metas para contrastar asignaciones. |
| PDF con todas las tiendas | Resumen más todos los CeCo seleccionados. |

En Excel empieza por **Resumen**. En **Validación**, las ocho diferencias deben ser 0 y el resultado OK. En **Tiendas**, consulta el CeCo: las columnas finales muestran región original de metas, fuente de asignación y estatus del directorio. **Real diario** y **Metas** permiten rastrear los importes originales.

## Ejemplo con el directorio actual

| Centro Norte | Tiendas | Real MXN | Objetivo MXN | Avance | Faltante MXN |
| --- | ---: | ---: | ---: | ---: | ---: |
| Semana 40: 1–4 octubre | 72 | $58,420 | $132,480 | 44.1% | $74,060 |
| Acumulado: 1–11 octubre | 72 | $188,780 | $258,960 | 72.9% | $70,180 |

El corte real del archivo es **11 de octubre de 2026**. La fecha de publicación no adelanta ese corte.

## Validación

**103 pruebas aprobadas: 45 Python y 58 JavaScript.** Se concilian los importes y todos los CeCo con las fuentes, se comprueban futuras actualizaciones del directorio, duplicados, filtros, exportaciones y caché PWA. CSV y Excel originales conservan sus bytes.

Hay **9 CeCo con meta o real que faltan en el directorio** y **1 CeCo con estatus de apertura contradictorio**. Se muestran pendientes y se conservan sus importes. También se mantienen las notas de fuentes sobre semana 49 y CeCo sin clave de metas. Consulta docs/AUDITORIA.md y docs/audit.json.

GitHub Actions valida el PR antes de integrarlo. Después del merge, main ejecuta la validación y publicación de la app. La fecha de publicación no cambia el corte real del CSV.
