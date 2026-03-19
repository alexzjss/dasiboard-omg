from fastapi import APIRouter, Depends
from app.schemas.schemas import UserOut
from app.api.routes.auth import get_current_user

router = APIRouter()

@router.get("/me", response_model=UserOut)
def get_profile(user=Depends(get_current_user)):
    return user
