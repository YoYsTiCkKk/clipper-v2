from fastapi import FastAPI, APIRouter, HTTPException, Request, Response
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import httpx
from passlib.hash import bcrypt
from emergentintegrations.payments.stripe.checkout import (
    StripeCheckout, CheckoutSessionRequest
)

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")

TRANSPORT_FEE = 5.00
MANAGEMENT_FEE = 2.50

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


# ==================== MODELS ====================

class UserRegister(BaseModel):
    email: str
    password: str
    name: str
    role: str = "client"

class UserLogin(BaseModel):
    email: str
    password: str

class ServiceCreate(BaseModel):
    name: str
    price: float
    duration: int = 30

class PortfolioAdd(BaseModel):
    url: str
    description: str = ""

class BarberProfileUpdate(BaseModel):
    bio: Optional[str] = None
    address: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    phone: Optional[str] = None
    name: Optional[str] = None

class BookingCreate(BaseModel):
    barber_id: str
    service_id: str
    date: str
    time: str
    payment_method: str

class CheckoutRequest(BaseModel):
    booking_id: str
    origin_url: str


# ==================== AUTH HELPERS ====================

def hash_pw(password: str) -> str:
    return bcrypt.hash(password)

def verify_pw(password: str, hashed: str) -> bool:
    return bcrypt.verify(password, hashed)

async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("session_token")
    if not token:
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            token = auth[7:]
    if not token:
        raise HTTPException(status_code=401, detail="No autenticado")

    session = await db.user_sessions.find_one({"session_token": token}, {"_id": 0})
    if not session:
        raise HTTPException(status_code=401, detail="Sesion invalida")

    exp = session["expires_at"]
    if isinstance(exp, str):
        exp = datetime.fromisoformat(exp)
    if exp.tzinfo is None:
        exp = exp.replace(tzinfo=timezone.utc)
    if exp < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="Sesion expirada")

    user = await db.users.find_one({"user_id": session["user_id"]}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="Usuario no encontrado")
    return user

async def set_session(response: Response, user_id: str) -> str:
    token = f"session_{uuid.uuid4().hex}"
    await db.user_sessions.insert_one({
        "user_id": user_id,
        "session_token": token,
        "expires_at": (datetime.now(timezone.utc) + timedelta(days=7)).isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    response.set_cookie(
        key="session_token", value=token,
        httponly=True, secure=True, samesite="none",
        path="/", max_age=7 * 24 * 60 * 60
    )
    return token


# ==================== AUTH ROUTES ====================

@api_router.post("/auth/register")
async def register(data: UserRegister, response: Response):
    if await db.users.find_one({"email": data.email}):
        raise HTTPException(status_code=400, detail="Email ya registrado")

    user_id = f"user_{uuid.uuid4().hex[:12]}"
    doc = {
        "user_id": user_id, "email": data.email, "name": data.name,
        "password_hash": hash_pw(data.password), "role": data.role,
        "picture": "", "phone": "",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    if data.role == "barber":
        doc["barber_profile"] = {
            "bio": "", "location": {"type": "Point", "coordinates": [0, 0]},
            "address": "", "rating": 0.0, "review_count": 0,
            "portfolio": [], "services": [],
            "availability": {"weekdays": [1, 2, 3, 4, 5], "start_hour": 9, "end_hour": 19},
            "is_active": False
        }
    await db.users.insert_one(doc)
    token = await set_session(response, user_id)
    return {
        "user_id": user_id, "email": data.email, "name": data.name,
        "role": data.role, "picture": "", "session_token": token
    }

@api_router.post("/auth/login")
async def login(data: UserLogin, response: Response):
    user = await db.users.find_one({"email": data.email}, {"_id": 0})
    if not user or not user.get("password_hash"):
        raise HTTPException(status_code=401, detail="Credenciales invalidas")
    if not verify_pw(data.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Credenciales invalidas")
    token = await set_session(response, user["user_id"])
    return {
        "user_id": user["user_id"], "email": user["email"],
        "name": user["name"], "role": user["role"],
        "picture": user.get("picture", ""), "session_token": token
    }

@api_router.get("/auth/session")
async def process_google_session(session_id: str, response: Response):
    # REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    async with httpx.AsyncClient() as http:
        resp = await http.get(
            "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
            headers={"X-Session-ID": session_id}
        )
        if resp.status_code != 200:
            raise HTTPException(status_code=401, detail="Sesion OAuth invalida")
        data = resp.json()

    email = data["email"]
    existing = await db.users.find_one({"email": email}, {"_id": 0})

    if existing:
        user_id = existing["user_id"]
        await db.users.update_one(
            {"user_id": user_id},
            {"$set": {"name": data["name"], "picture": data.get("picture", "")}}
        )
        role = existing["role"]
    else:
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        await db.users.insert_one({
            "user_id": user_id, "email": email, "name": data["name"],
            "picture": data.get("picture", ""), "role": "client",
            "phone": "", "created_at": datetime.now(timezone.utc).isoformat()
        })
        role = "client"

    token = await set_session(response, user_id)
    return {
        "user_id": user_id, "email": email, "name": data["name"],
        "role": role, "picture": data.get("picture", ""), "session_token": token
    }

@api_router.get("/auth/me")
async def get_me(request: Request):
    user = await get_current_user(request)
    return {k: v for k, v in user.items() if k != "password_hash"}

@api_router.post("/auth/logout")
async def logout(request: Request, response: Response):
    token = request.cookies.get("session_token")
    if token:
        await db.user_sessions.delete_many({"session_token": token})
    response.delete_cookie(key="session_token", path="/", secure=True, samesite="none")
    return {"message": "Sesion cerrada"}


# ==================== BARBER ROUTES ====================

@api_router.get("/barbers")
async def list_barbers(lat: float = 40.4168, lng: float = -3.7038, radius: float = 50000):
    try:
        barbers = await db.users.find(
            {
                "role": "barber", "barber_profile.is_active": True,
                "barber_profile.location": {
                    "$near": {
                        "$geometry": {"type": "Point", "coordinates": [lng, lat]},
                        "$maxDistance": radius
                    }
                }
            },
            {"_id": 0, "password_hash": 0}
        ).to_list(50)
    except Exception:
        barbers = await db.users.find(
            {"role": "barber", "barber_profile.is_active": True},
            {"_id": 0, "password_hash": 0}
        ).to_list(50)
    return barbers

@api_router.get("/barbers/{barber_id}")
async def get_barber(barber_id: str):
    barber = await db.users.find_one(
        {"user_id": barber_id, "role": "barber"},
        {"_id": 0, "password_hash": 0}
    )
    if not barber:
        raise HTTPException(status_code=404, detail="Barbero no encontrado")
    return barber

@api_router.get("/barbers/{barber_id}/slots")
async def get_available_slots(barber_id: str, date: str):
    barber = await db.users.find_one({"user_id": barber_id, "role": "barber"}, {"_id": 0})
    if not barber:
        raise HTTPException(status_code=404)

    avail = barber.get("barber_profile", {}).get("availability", {})
    start_h = avail.get("start_hour", 9)
    end_h = avail.get("end_hour", 19)

    slots = []
    for h in range(start_h, end_h):
        for m in [0, 30]:
            slots.append(f"{h:02d}:{m:02d}")

    bookings = await db.bookings.find(
        {"barber_id": barber_id, "date": date, "status": {"$in": ["pending", "confirmed"]}},
        {"_id": 0, "time": 1}
    ).to_list(100)
    booked = {b["time"] for b in bookings}

    return {"slots": [s for s in slots if s not in booked], "date": date}

@api_router.put("/barbers/profile")
async def update_barber_profile(data: BarberProfileUpdate, request: Request):
    user = await get_current_user(request)
    if user["role"] != "barber":
        raise HTTPException(status_code=403)

    updates = {}
    if data.bio is not None:
        updates["barber_profile.bio"] = data.bio
    if data.address is not None:
        updates["barber_profile.address"] = data.address
    if data.latitude is not None and data.longitude is not None:
        updates["barber_profile.location"] = {
            "type": "Point", "coordinates": [data.longitude, data.latitude]
        }
        updates["barber_profile.is_active"] = True
    if data.phone is not None:
        updates["phone"] = data.phone
    if data.name is not None:
        updates["name"] = data.name

    if updates:
        await db.users.update_one({"user_id": user["user_id"]}, {"$set": updates})
    return await db.users.find_one({"user_id": user["user_id"]}, {"_id": 0, "password_hash": 0})

@api_router.post("/barbers/services")
async def add_service(data: ServiceCreate, request: Request):
    user = await get_current_user(request)
    if user["role"] != "barber":
        raise HTTPException(status_code=403)
    service = {
        "service_id": f"svc_{uuid.uuid4().hex[:8]}",
        "name": data.name, "price": data.price, "duration": data.duration
    }
    await db.users.update_one(
        {"user_id": user["user_id"]},
        {"$push": {"barber_profile.services": service}}
    )
    return service

@api_router.delete("/barbers/services/{service_id}")
async def delete_service(service_id: str, request: Request):
    user = await get_current_user(request)
    if user["role"] != "barber":
        raise HTTPException(status_code=403)
    await db.users.update_one(
        {"user_id": user["user_id"]},
        {"$pull": {"barber_profile.services": {"service_id": service_id}}}
    )
    return {"message": "Servicio eliminado"}

@api_router.post("/barbers/portfolio")
async def add_portfolio(data: PortfolioAdd, request: Request):
    user = await get_current_user(request)
    if user["role"] != "barber":
        raise HTTPException(status_code=403)
    item = {
        "image_id": f"img_{uuid.uuid4().hex[:8]}",
        "url": data.url, "description": data.description
    }
    await db.users.update_one(
        {"user_id": user["user_id"]},
        {"$push": {"barber_profile.portfolio": item}}
    )
    return item

@api_router.delete("/barbers/portfolio/{image_id}")
async def delete_portfolio(image_id: str, request: Request):
    user = await get_current_user(request)
    if user["role"] != "barber":
        raise HTTPException(status_code=403)
    await db.users.update_one(
        {"user_id": user["user_id"]},
        {"$pull": {"barber_profile.portfolio": {"image_id": image_id}}}
    )
    return {"message": "Imagen eliminada"}


# ==================== BOOKING ROUTES ====================

@api_router.post("/bookings")
async def create_booking(data: BookingCreate, request: Request):
    user = await get_current_user(request)
    if user["role"] != "client":
        raise HTTPException(status_code=403, detail="Solo clientes pueden reservar")

    barber = await db.users.find_one(
        {"user_id": data.barber_id, "role": "barber"}, {"_id": 0}
    )
    if not barber:
        raise HTTPException(status_code=404, detail="Barbero no encontrado")

    service = next(
        (s for s in barber.get("barber_profile", {}).get("services", [])
         if s["service_id"] == data.service_id), None
    )
    if not service:
        raise HTTPException(status_code=404, detail="Servicio no encontrado")

    existing = await db.bookings.find_one({
        "barber_id": data.barber_id, "date": data.date, "time": data.time,
        "status": {"$in": ["pending", "confirmed"]}
    })
    if existing:
        raise HTTPException(status_code=409, detail="Horario no disponible")

    service_price = float(service["price"])
    total = service_price + TRANSPORT_FEE + MANAGEMENT_FEE

    booking_id = f"book_{uuid.uuid4().hex[:10]}"
    booking = {
        "booking_id": booking_id,
        "client_id": user["user_id"], "client_name": user["name"],
        "barber_id": data.barber_id, "barber_name": barber["name"],
        "service_id": data.service_id, "service_name": service["name"],
        "service_price": service_price, "date": data.date, "time": data.time,
        "status": "confirmed" if data.payment_method == "cash" else "pending",
        "payment_method": data.payment_method,
        "transport_fee": TRANSPORT_FEE, "management_fee": MANAGEMENT_FEE,
        "total_amount": total,
        "payment_status": "cash" if data.payment_method == "cash" else "pending",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.bookings.insert_one(booking)
    booking.pop("_id", None)
    return booking

@api_router.get("/bookings")
async def list_bookings(request: Request):
    user = await get_current_user(request)
    query = {"client_id": user["user_id"]} if user["role"] == "client" else {"barber_id": user["user_id"]}
    return await db.bookings.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)

@api_router.put("/bookings/{booking_id}/status")
async def update_booking_status(booking_id: str, request: Request):
    body = await request.json()
    status = body.get("status")
    user = await get_current_user(request)
    booking = await db.bookings.find_one({"booking_id": booking_id}, {"_id": 0})
    if not booking:
        raise HTTPException(status_code=404)
    if status in ["confirmed", "completed"] and user["user_id"] != booking["barber_id"]:
        raise HTTPException(status_code=403)
    if status == "cancelled" and user["user_id"] not in [booking["barber_id"], booking["client_id"]]:
        raise HTTPException(status_code=403)
    await db.bookings.update_one({"booking_id": booking_id}, {"$set": {"status": status}})
    return {"booking_id": booking_id, "status": status}


# ==================== PAYMENT ROUTES ====================

@api_router.post("/payments/checkout")
async def create_checkout(data: CheckoutRequest, request: Request):
    user = await get_current_user(request)
    booking = await db.bookings.find_one({"booking_id": data.booking_id}, {"_id": 0})
    if not booking:
        raise HTTPException(status_code=404, detail="Reserva no encontrada")
    if booking["client_id"] != user["user_id"]:
        raise HTTPException(status_code=403)
    if booking["payment_method"] != "app":
        raise HTTPException(status_code=400, detail="Esta reserva se paga en efectivo")

    api_key = os.environ.get('STRIPE_API_KEY')
    if not api_key:
        raise HTTPException(status_code=500, detail="Pagos no configurados")

    host_url = str(request.base_url)
    stripe_checkout = StripeCheckout(api_key=api_key, webhook_url=f"{host_url}api/webhook/stripe")

    success_url = f"{data.origin_url}/payment/success?session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{data.origin_url}/bookings"
    amount = float(booking["total_amount"])

    session = await stripe_checkout.create_checkout_session(CheckoutSessionRequest(
        amount=amount, currency="eur",
        success_url=success_url, cancel_url=cancel_url,
        metadata={"booking_id": data.booking_id, "user_id": user["user_id"]}
    ))

    await db.payment_transactions.insert_one({
        "transaction_id": f"txn_{uuid.uuid4().hex[:10]}",
        "booking_id": data.booking_id, "session_id": session.session_id,
        "user_id": user["user_id"], "amount": amount, "currency": "eur",
        "status": "initiated", "payment_status": "pending",
        "metadata": {"booking_id": data.booking_id},
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    return {"url": session.url, "session_id": session.session_id}

@api_router.get("/payments/status/{session_id}")
async def get_payment_status(session_id: str, request: Request):
    api_key = os.environ.get('STRIPE_API_KEY')
    if not api_key:
        raise HTTPException(status_code=500)

    host_url = str(request.base_url)
    stripe_checkout = StripeCheckout(api_key=api_key, webhook_url=f"{host_url}api/webhook/stripe")
    status = await stripe_checkout.get_checkout_status(session_id)

    txn = await db.payment_transactions.find_one({"session_id": session_id}, {"_id": 0})
    if txn and status.payment_status == "paid":
        already_done = await db.payment_transactions.find_one(
            {"session_id": session_id, "status": "completed"}, {"_id": 0}
        )
        if not already_done:
            await db.payment_transactions.update_one(
                {"session_id": session_id},
                {"$set": {"status": "completed", "payment_status": "paid"}}
            )
            await db.bookings.update_one(
                {"booking_id": txn["booking_id"]},
                {"$set": {"payment_status": "paid", "status": "confirmed"}}
            )

    return {
        "status": status.status, "payment_status": status.payment_status,
        "amount_total": status.amount_total, "currency": status.currency
    }

@api_router.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    api_key = os.environ.get('STRIPE_API_KEY')
    if not api_key:
        return {"status": "error"}
    host_url = str(request.base_url)
    stripe_checkout = StripeCheckout(api_key=api_key, webhook_url=f"{host_url}api/webhook/stripe")
    body = await request.body()
    sig = request.headers.get("Stripe-Signature", "")
    try:
        event = await stripe_checkout.handle_webhook(body, sig)
        if event.payment_status == "paid" and event.metadata:
            bid = event.metadata.get("booking_id")
            if bid:
                await db.bookings.update_one(
                    {"booking_id": bid},
                    {"$set": {"payment_status": "paid", "status": "confirmed"}}
                )
                await db.payment_transactions.update_one(
                    {"session_id": event.session_id},
                    {"$set": {"status": "completed", "payment_status": "paid"}}
                )
    except Exception as e:
        logger.error(f"Webhook error: {e}")
    return {"status": "ok"}


# ==================== SEED DATA ====================

async def seed_demo_data():
    count = await db.users.count_documents({"role": "barber"})
    if count > 0:
        logger.info(f"Already have {count} barbers, skipping seed")
        return

    logger.info("Seeding demo barbers...")
    demo_barbers = [
        {
            "user_id": f"barber_carlos01",
            "email": "carlos@clipper.es",
            "name": "Carlos Garcia",
            "password_hash": hash_pw("demo123"),
            "role": "barber",
            "picture": "https://images.unsplash.com/photo-1607943917700-18ec6ff5a4c2?w=200&h=200&fit=crop",
            "phone": "+34 612 345 678",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "barber_profile": {
                "bio": "Barbero clasico con 10 anos de experiencia. Especialista en degradados y barba.",
                "location": {"type": "Point", "coordinates": [-3.7025, 40.4256]},
                "address": "Calle Fuencarral 45, Malasana, Madrid",
                "rating": 4.8, "review_count": 127,
                "portfolio": [
                    {"image_id": "img_001", "url": "https://images.unsplash.com/photo-1659355751282-5ca7807af9e9?w=400&h=400&fit=crop", "description": "Degradado clasico"},
                    {"image_id": "img_002", "url": "https://images.unsplash.com/photo-1622286342621-4bd786c2447c?w=400&h=400&fit=crop", "description": "Corte moderno"},
                    {"image_id": "img_003", "url": "https://images.unsplash.com/photo-1599351431202-1e0f0137899a?w=400&h=400&fit=crop", "description": "Texturizado"},
                ],
                "services": [
                    {"service_id": "svc_corte1", "name": "Corte de pelo", "price": 15.00, "duration": 30},
                    {"service_id": "svc_barba1", "name": "Arreglo de barba", "price": 10.00, "duration": 20},
                    {"service_id": "svc_combo1", "name": "Corte + Barba", "price": 22.00, "duration": 45},
                    {"service_id": "svc_afeit1", "name": "Afeitado clasico", "price": 12.00, "duration": 25},
                ],
                "availability": {"weekdays": [1, 2, 3, 4, 5, 6], "start_hour": 9, "end_hour": 20},
                "is_active": True
            }
        },
        {
            "user_id": f"barber_miguel01",
            "email": "miguel@clipper.es",
            "name": "Miguel Fernandez",
            "password_hash": hash_pw("demo123"),
            "role": "barber",
            "picture": "https://images.unsplash.com/photo-1741345980697-f3c43eba44a0?w=200&h=200&fit=crop",
            "phone": "+34 623 456 789",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "barber_profile": {
                "bio": "Fade Master. Especialista en degradados artisticos y disenos unicos.",
                "location": {"type": "Point", "coordinates": [-3.6955, 40.4220]},
                "address": "Calle Hortaleza 78, Chueca, Madrid",
                "rating": 4.9, "review_count": 89,
                "portfolio": [
                    {"image_id": "img_004", "url": "https://images.unsplash.com/photo-1622286342621-4bd786c2447c?w=400&h=400&fit=crop", "description": "Fade artistico"},
                    {"image_id": "img_005", "url": "https://images.unsplash.com/photo-1659355751282-5ca7807af9e9?w=400&h=400&fit=crop", "description": "Diseno geometrico"},
                ],
                "services": [
                    {"service_id": "svc_fade1", "name": "Degradado skin fade", "price": 18.00, "duration": 35},
                    {"service_id": "svc_design1", "name": "Diseno artistico", "price": 25.00, "duration": 45},
                    {"service_id": "svc_tinte1", "name": "Tinte", "price": 30.00, "duration": 60},
                    {"service_id": "svc_corte2", "name": "Corte + Lavado", "price": 20.00, "duration": 40},
                ],
                "availability": {"weekdays": [1, 2, 3, 4, 5], "start_hour": 10, "end_hour": 19},
                "is_active": True
            }
        },
        {
            "user_id": f"barber_alejan01",
            "email": "alejandro@clipper.es",
            "name": "Alejandro Ruiz",
            "password_hash": hash_pw("demo123"),
            "role": "barber",
            "picture": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop",
            "phone": "+34 634 567 890",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "barber_profile": {
                "bio": "The Barber Lab. Tratamientos capilares y cortes de vanguardia.",
                "location": {"type": "Point", "coordinates": [-3.7025, 40.4169]},
                "address": "Puerta del Sol 12, Centro, Madrid",
                "rating": 4.7, "review_count": 156,
                "portfolio": [
                    {"image_id": "img_006", "url": "https://images.unsplash.com/photo-1599351431202-1e0f0137899a?w=400&h=400&fit=crop", "description": "Corte texturizado"},
                ],
                "services": [
                    {"service_id": "svc_corte3", "name": "Corte + Lavado", "price": 18.00, "duration": 35},
                    {"service_id": "svc_child1", "name": "Corte infantil", "price": 12.00, "duration": 25},
                    {"service_id": "svc_treat1", "name": "Tratamiento capilar", "price": 35.00, "duration": 50},
                    {"service_id": "svc_combo3", "name": "Pack completo", "price": 40.00, "duration": 70},
                ],
                "availability": {"weekdays": [0, 1, 2, 3, 4, 5], "start_hour": 8, "end_hour": 21},
                "is_active": True
            }
        },
        {
            "user_id": f"barber_javier01",
            "email": "javier@clipper.es",
            "name": "Javier Lopez",
            "password_hash": hash_pw("demo123"),
            "role": "barber",
            "picture": "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200&h=200&fit=crop",
            "phone": "+34 645 678 901",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "barber_profile": {
                "bio": "Street Cuts. Estilo urbano, cortes modernos y precios competitivos.",
                "location": {"type": "Point", "coordinates": [-3.6938, 40.4088]},
                "address": "Calle Embajadores 33, Lavapies, Madrid",
                "rating": 4.6, "review_count": 73,
                "portfolio": [
                    {"image_id": "img_008", "url": "https://images.unsplash.com/photo-1659355751282-5ca7807af9e9?w=400&h=400&fit=crop", "description": "Corte urbano"},
                ],
                "services": [
                    {"service_id": "svc_corte4", "name": "Corte express", "price": 12.00, "duration": 20},
                    {"service_id": "svc_barba4", "name": "Barba", "price": 8.00, "duration": 15},
                    {"service_id": "svc_combo4", "name": "Corte + Barba + Lavado", "price": 25.00, "duration": 50},
                ],
                "availability": {"weekdays": [1, 2, 3, 4, 5, 6], "start_hour": 10, "end_hour": 20},
                "is_active": True
            }
        }
    ]

    for barber in demo_barbers:
        await db.users.insert_one(barber)

    try:
        await db.users.create_index([("barber_profile.location", "2dsphere")])
    except Exception:
        pass

    logger.info(f"Seeded {len(demo_barbers)} demo barbers")


# ==================== STARTUP / SHUTDOWN ====================

@app.on_event("startup")
async def startup():
    try:
        await db.users.create_index([("barber_profile.location", "2dsphere")])
    except Exception:
        pass
    await seed_demo_data()

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
