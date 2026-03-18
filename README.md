# Clipper MVP Completo

App tipo Uber Eats para barberos/peluqueros en el mercado español, con tema oscuro (Zinc-950 + Amber-500).

- **Mapa interactivo** con Leaflet/OpenStreetMap: busca barberos cercanos con marcadores circulares con foto y borde ámbar (4 barberos demo en Madrid)
- **Perfiles de barbero** con portfolio de fotos, lista de servicios con precios, bio, valoración y botón de reserva
- **Flujo de reserva completo**: selección de servicio → calendario → horarios disponibles → método de pago (tarjeta/efectivo) → confirmación
- **Pagos con Stripe** (Visa/Mastercard, EUR) integrado via emergentintegrations; Bizum marcado como "Próximamente"
- **Auth**: registro email/contraseña con roles (cliente/barbero) + Google OAuth via Emergent Auth
- **Dashboard cliente**: reservas próximas/historial, cancelación
- **Dashboard barbero**: gestión de reservas (confirmar/completar), servicios CRUD, portfolio CRUD, edición de perfil con coordenadas

### Mejoras Fase 2 (Implementadas)
1. **Optimización de Imágenes (WebP)**: Las fotos del portfolio y avatares son redimensionadas a 1080px de ancho máx y convertidas a WebP (Pillow), reduciendo un ~80% su peso.
2. **Cortes a Domicilio (Home Service)**: Los barberos pueden activar "A Domicilio" definiendo una tarifa extra por desplazamiento. El cliente suma el sobrecargo al instante en la reserva.
3. **Feed de Estilos Global**: Nueva página tipo Instagram/TikTok combinando fotos del portafolio de los barberos locales de forma aleatoria, con opción de dar "Guardar" e iniciar reserva.
4. **Sistema de Penalización por No-Show**: Las reservas en "Efectivo" ahora capturan una tarjeta obligatoriamente mediante un `SetupIntent` de Stripe (sin cobro inmediato) a modo de garantía para la cancelación.
