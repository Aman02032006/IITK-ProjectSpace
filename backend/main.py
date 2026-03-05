from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from core.database import create_db_and_tables
from contextlib import asynccontextmanager
from routers.auth import router as auth_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    # This runs BEFORE the app starts
    print("Connecting to Docker Database...")
    create_db_and_tables()
    print("✅ Tables created!")
    yield


app = FastAPI(title="IITK ProjectSpace API", lifespan=lifespan)
app.include_router(auth_router)
# Allow Frontend (Port 3000) to talk to Backend (Port 8000)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def read_root():
    return {"status": "ok", "message": "Backend is running and ready for Kernel Panic!"}
