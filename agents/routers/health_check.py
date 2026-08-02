from fastapi import APIRouter

# Initialize the router instead of 'app'
router = APIRouter(tags=["Health"])

@router.get("/")
def health_check():
    """Simple route to check if the Python server is alive."""
    return {"status": "online", "message": "AI Brain is listening."}