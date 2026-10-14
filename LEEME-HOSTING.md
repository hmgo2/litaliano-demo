# Demostración L’Italiano por ACASA ONE

Consulta la guía paso a paso entregada junto a este paquete. No basta subirlo por FTP: requiere Node.js 22+, una sola instancia y un volumen persistente. Las tres interfaces comparten este mismo servicio.

Landing: /landing/ · Menú: / · Personal: /personal · Salud: /api/health.

Railway: volumen /data y DATA_DIR=/data. HOST=0.0.0.0, DEMO=true, SECURE_COOKIES=true y DEMO_PASSWORD de mínimo 14 caracteres. PORT automático. Crear volumen antes de generar datos. La contraseña de entorno solo se usa para la primera inicialización de cada perfil; luego se cambia dentro de la app. Cambiarla en entorno no reemplaza las contraseñas de una base ya creada.

No se incluyen datos locales ni claves reales. Los usuarios nuevos son admin, garzon, cocina, caja, inicialmente con la contraseña privada definida en el hosting. Cada perfil debe cambiarla antes de compartir accesos. Este paquete conserva las etiquetas de demostración y los cupones sin valor real. El inventario y recetas iniciales son ejemplos. El catálogo tiene información/fotos pendientes que completará la cliente. No procesa pagos ni emite boletas del SII. SMTP queda pendiente según proveedor.

Una sola instancia. Las sesiones se cierran al reiniciar, pero pedidos, inventario y reservas deben conservarse en el volumen. Los respaldos no deben publicarse ni guardarse dentro de public/. Exportar XLSX no sustituye el respaldo completo de la base.
