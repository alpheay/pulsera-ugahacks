"""Pulsera — Community Safety Pulse Network

FastAPI backend server with PulseNet anomaly detection,
real-time WebSocket communication, and community aggregation engine.
"""

import logging

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .db import init_db
from .services.anomaly_detection import anomaly_detection_service
from .websocket.handler import websocket_endpoint
from .routes.community import router as community_router
from .routes.zones import router as zones_router
from .routes.alerts import router as alerts_router
from .routes.pulsenet import router as pulsenet_router
from .routes.auth import router as auth_router
from .routes.groups import router as groups_router
from .routes.health_data import router as health_data_router
from .routes.episodes import router as episodes_router

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting Pulsera server...")
    await init_db()
    logger.info("Database tables created")
    await anomaly_detection_service.initialize()
    logger.info("PulseNet inference service initialized")
    yield
    logger.info("Shutting down Pulsera server...")


app = FastAPI(
    title="Pulsera",
    description="Community Safety Pulse Network — Real-time wearable anomaly detection",
    version="0.2.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(groups_router)
app.include_router(health_data_router)
app.include_router(community_router)
app.include_router(zones_router)
app.include_router(alerts_router)
app.include_router(pulsenet_router)
app.include_router(episodes_router)

app.add_api_websocket_route("/ws", websocket_endpoint)


@app.get("/health")
async def health_check():
    from .websocket.connection_manager import connection_manager
    return {
        "status": "ok",
        "service": "pulsera",
        "active_devices": connection_manager.active_device_count,
    }
