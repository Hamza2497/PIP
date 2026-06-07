from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.db_init import create_tables
from app.routers import auth, chat, health

app = FastAPI(title="PIP")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup() -> None:
    await create_tables()


app.include_router(health.router)
app.include_router(chat.router)
app.include_router(auth.router)
