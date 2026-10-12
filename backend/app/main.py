from fastapi import FastAPI, Request
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.exc import OperationalError

from app.api.router import api_router
from app.api.routes import system
from app.core.config import get_settings
from app.db.session import DatabaseNotConfiguredError

settings = get_settings()
app = FastAPI(
    title=settings.project_name, version=settings.version,
    description="Backend for SmartTwin Cloud. All sensor data is SIMULATED sample data.",
)
# CORS: lets the React dev server (http://localhost:5173) call this API from the browser.
app.add_middleware(CORSMiddleware, allow_origins=settings.cors_origin_list,
                   allow_methods=["GET", "POST", "PATCH", "OPTIONS"], allow_headers=["*"])
app.include_router(system.router)
app.include_router(api_router)


@app.exception_handler(RequestValidationError)
async def validation_error(_: Request, exc: RequestValidationError):
    """Consistent 422 body: a readable 'detail' string plus the detailed 'errors' list."""
    # drop 'input'/'ctx': they can hold values (like NaN) that are not valid JSON
    errors = [{k: v for k, v in e.items() if k not in ("input", "ctx", "url")} for e in jsonable_encoder(exc.errors(), custom_encoder={Exception: str})]
    summary = "; ".join(f"{'.'.join(str(p) for p in e['loc'] if p not in ('body', 'query', 'path'))}: {e['msg']}" for e in errors)
    return JSONResponse(status_code=422, content={"detail": f"Invalid input: {summary}", "errors": errors})


@app.exception_handler(DatabaseNotConfiguredError)
async def db_not_configured(_: Request, __: DatabaseNotConfiguredError):
    return JSONResponse(status_code=503, content={"detail": "Database is not configured. Set DATABASE_URL in backend/.env (see README)."})


@app.exception_handler(OperationalError)
async def db_unreachable(_: Request, __: OperationalError):
    return JSONResponse(status_code=503, content={"detail": "Cannot connect to the database. Is PostgreSQL running and DATABASE_URL correct?"})
