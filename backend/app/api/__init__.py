from .routes_rooms import router as rooms_router
from .websocket import router as ws_router
from .routes_max import router as max_router
from .routes_auth import router as auth_router

__all__ = ["rooms_router", "ws_router", "max_router", "auth_router"]
