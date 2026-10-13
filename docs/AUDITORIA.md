# Auditoría de VaXCuenta

Información real al **2026-10-12**.

- CSV completo: 10,406 filas; $3,635,868.00.
- Campaña: 10,288 filas; **$3,631,748.00**.
- Fuera de campaña: 118 filas; $4,120.00.
- Metas válidas: 8,778 filas por CeCo y semana; sin claves repetidas.
- Tiendas con meta o real: 976; con recaudación: 947.
- Claves duplicadas del directorio consolidadas sin sumar importes: 13.
- Fechas del CSV interpretadas como mes/día/año (10/11/2026 = 11 de octubre).
- El corte proviene de las fechas dentro de campaña, nunca de la fecha de publicación.
- Conciliación: CSV completo = real de campaña + importes fuera de campaña.

## Notas del origen

- 9 tiendas sin DM confirmado; sus importes se conservan en Región y Tienda y en el grupo DM pendiente de asignación.
- 9 tiendas con meta o real no aparecen en Directorio.xlsx; conservan sus importes en Por asignar hasta confirmar su región y DM.
- 1 CeCo tienen estatus distintos en filas del directorio; se muestran como Por confirmar. Esto no excluye ni duplica sus importes.
- Falta el objetivo de la semana 49 (30 de noviembre). No se extrapola ni se presenta una meta total de campaña completa.
- 14 importes no son múltiplos de $10; se preservan. Recaudado / $10 expresa donativos equivalentes, no tickets comprobados.

## Tiendas con DM pendiente

43065, 43196, 43199, 43206, 43214, 43248, 43251, 43260, 43261

## Procedencia

Recaudación y metas: archivos adjuntos originales, conservados en data/.
Nombre, región y DM vigentes: data/Directorio.xlsx del propio repositorio.
Objetivos: VaxCuenta Objetivos 26.xlsx, vinculados por CeCo y semana; los importes se conservan.
Los hashes SHA-256 y el detalle de incidencias están en audit.json.
