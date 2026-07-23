from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Import ALL your modular routers here
from routers import teacher, student, health_check, testing

# Initialize the server with beautiful Swagger UI metadata
app = FastAPI(
    title="AISS AES - AI Evaluation Microservice",
    description="The centralized AI Brain for grading student answers and vectorizing teacher rubrics.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS Middleware setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Attach the routers to the main application
app.include_router(teacher.router)
app.include_router(student.router)
app.include_router(health_check.router) 
app.include_router(testing.router)
