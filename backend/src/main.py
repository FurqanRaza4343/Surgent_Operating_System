import logging

from fastapi import FastAPI
from fastapi.responses import JSONResponse

from src.config import get_settings
from src.server.middleware import setup_middleware, ALLOWED_ORIGINS
from src.server.exceptions import AppException
from src.router.agents import register_routes

settings = get_settings()

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger("aesthetixai")

app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    docs_url="/docs" if settings.debug else None,
    redoc_url="/redoc" if settings.debug else None,
)

setup_middleware(app)
register_routes(app)


def _with_cors(request, response: JSONResponse) -> JSONResponse:
    # Confirmed (via a minimal FastAPI+CORSMiddleware+exception_handler repro
    # with no other custom code involved) that Starlette's CORSMiddleware
    # never adds Access-Control-Allow-Origin to a response built by a
    # registered `@app.exception_handler` — this is a general framework
    # limitation, not something specific to this app's middleware or DB
    # setup. Without this, the browser reports "blocked by CORS policy"
    # instead of surfacing whatever the real error was underneath.
    origin = request.headers.get("origin")
    if origin in ALLOWED_ORIGINS:
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Access-Control-Allow-Credentials"] = "true"
    return response


@app.exception_handler(AppException)
async def app_exception_handler(request, exc: AppException):
    return _with_cors(request, JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail},
    ))


@app.exception_handler(Exception)
async def unhandled_exception_handler(request, exc: Exception):
    logger.exception("Unhandled exception on %s %s", request.method, request.url.path)
    return _with_cors(request, JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"},
    ))


@app.get("/health")
async def health_check():
    return {"status": "ok", "app": settings.app_name, "version": settings.app_version}
