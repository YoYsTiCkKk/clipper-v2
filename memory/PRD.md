# Clipper - PRD (Product Requirements Document)

## Problem Statement
Uber Eats para barberos/peluqueros. App para buscar barberos por zona, ver portfolio de cortes, reservar cita con dia/hora, elegir tarifa y metodo de pago (app o efectivo). Mercado español.

## Architecture
- **Backend**: FastAPI + MongoDB (Motor async) + Emergent Stripe integration
- **Frontend**: React 18 + Tailwind CSS + shadcn/ui + react-leaflet
- **Auth**: JWT sessions (httpOnly cookies) + Emergent Google OAuth
- **Payments**: Stripe (Visa/Mastercard) via emergentintegrations, Bizum (proximamente)
- **Maps**: Leaflet + CartoDB dark tiles (free)
- **Design**: Noir & Amber theme (Zinc-950 + Amber-500), Syne + Manrope fonts

## User Personas
1. **Cliente**: Busca barberos, reserva citas, paga por servicios
2. **Barbero**: Gestiona perfil, servicios, portfolio, acepta reservas

## Core Requirements
- Busqueda de barberos por geolocalizacion en mapa
- Perfiles de barbero con portfolio de fotos
- Sistema de reservas con seleccion de dia/hora/servicio
- Pago con tarjeta (Stripe) o efectivo
- Dashboard cliente (mis reservas)
- Dashboard barbero (gestion de servicios, portfolio, reservas, perfil)

## What's Been Implemented (2026-03-18)
### Backend (server.py)
- Auth: register, login, Google OAuth, me, logout
- Barbers: list (geo query), detail, slots, profile update, services CRUD, portfolio CRUD
- Bookings: create, list, status update
- Payments: Stripe checkout, status polling, webhook
- Seed: 4 demo barbers in Madrid

### Frontend (React)
- Landing page with hero and CTA
- Auth page with login/register tabs and Google OAuth
- Map search with barber markers (CircularPhoto + AmberRing)
- Barber profile with services, portfolio gallery, booking button
- Booking flow: service → date → time → payment method → confirm
- Client dashboard: upcoming/past bookings, cancel option
- Barber dashboard: stats, bookings mgmt, services CRUD, portfolio CRUD, profile edit
- Payment success page with status polling
- Bottom navigation, responsive design, Spanish UI

### Integrations
- Stripe payments (EUR) via emergentintegrations
- Emergent Google OAuth for social login
- Leaflet/OpenStreetMap for maps

## Prioritized Backlog

### P0 (Critical - Next Sprint)
- File upload for portfolio images (currently URL-based)
- Real-time notifications for new bookings
- Barber availability management (custom schedule per day)

### P1 (High Priority)
- Reviews and ratings system
- Push notifications
- Bizum payment integration
- Search filters (price range, rating, service type)
- User profile editing for clients

### P2 (Medium Priority)
- Chat between client and barber
- Booking reminders (email/SMS)
- Barber earnings dashboard
- Admin panel
- Multi-language support
- Social sharing of barber profiles

## Next Action Items
1. Add file upload for barber portfolio photos
2. Implement reviews/ratings system
3. Add real-time booking notifications
4. Barber availability calendar management
5. Search filters on map page
