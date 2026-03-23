import os
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from core.database import create_db_and_tables
from contextlib import asynccontextmanager
from routers import auth, users, projects, recruitments, notifications, comments, search

os.makedirs("uploads/profilePictures", exist_ok=True)
os.makedirs("uploads/Projects", exist_ok=True)
os.makedirs("uploads/Recruitments", exist_ok=True)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # This runs BEFORE the app starts
    print("Connecting to Docker Database...")
    create_db_and_tables()
    print("✅ Tables created!")
    yield


app = FastAPI(title="IITK ProjectSpace API", lifespan=lifespan)

app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(projects.router)
app.include_router(recruitments.router)
app.include_router(notifications.router)
app.include_router(comments.router)
app.include_router(search.router)


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
