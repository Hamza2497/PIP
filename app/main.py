from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.db_init import create_tables
from app.routers import auth, checkpoint, chat, health, roadmap, stacks, users


@asynccontextmanager
async def lifespan(app: FastAPI):
    await create_tables()
    yield


app = FastAPI(title="PIP", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(chat.router)
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(stacks.router)
app.include_router(roadmap.router)
app.include_router(checkpoint.router)
