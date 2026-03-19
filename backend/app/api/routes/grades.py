from fastapi import APIRouter, Depends, HTTPException
from psycopg2.extras import RealDictCursor
from typing import List
from app.db.session import get_db
from app.api.routes.auth import get_current_user
from app.schemas.schemas import SubjectCreate, SubjectOut, GradeCreate, GradeOut

router = APIRouter()


@router.get("/subjects", response_model=List[SubjectOut])
def list_subjects(db: RealDictCursor = Depends(get_db), user=Depends(get_current_user)):
    db.execute("SELECT * FROM subjects WHERE owner_id = %s ORDER BY created_at", (str(user["id"]),))
    subjects = db.fetchall()
    result = []
    for s in subjects:
        db.execute("SELECT * FROM grades WHERE subject_id = %s ORDER BY created_at", (str(s["id"]),))
        result.append({**s, "grades": db.fetchall()})
    return result


@router.post("/subjects", response_model=SubjectOut, status_code=201)
def create_subject(body: SubjectCreate, db: RealDictCursor = Depends(get_db), user=Depends(get_current_user)):
    db.execute(
        """INSERT INTO subjects (owner_id, code, name, professor, semester, color)
           VALUES (%s, %s, %s, %s, %s, %s) RETURNING *""",
        (str(user["id"]), body.code, body.name, body.professor, body.semester, body.color),
    )
    s = db.fetchone()
    return {**s, "grades": []}


@router.delete("/subjects/{subject_id}", status_code=204)
def delete_subject(subject_id: str, db: RealDictCursor = Depends(get_db), user=Depends(get_current_user)):
    db.execute("SELECT id FROM subjects WHERE id = %s AND owner_id = %s", (subject_id, str(user["id"])))
    if not db.fetchone():
        raise HTTPException(404, "Disciplina não encontrada")
    db.execute("DELETE FROM subjects WHERE id = %s", (subject_id,))


@router.post("/subjects/{subject_id}/grades", response_model=GradeOut, status_code=201)
def add_grade(subject_id: str, body: GradeCreate, db: RealDictCursor = Depends(get_db), user=Depends(get_current_user)):
    db.execute("SELECT id FROM subjects WHERE id = %s AND owner_id = %s", (subject_id, str(user["id"])))
    if not db.fetchone():
        raise HTTPException(404, "Disciplina não encontrada")
    db.execute(
        """INSERT INTO grades (subject_id, label, value, weight, max_value, date, notes)
           VALUES (%s, %s, %s, %s, %s, %s, %s) RETURNING *""",
        (subject_id, body.label, body.value, body.weight, body.max_value, body.date, body.notes),
    )
    return db.fetchone()


@router.delete("/grades/{grade_id}", status_code=204)
def delete_grade(grade_id: str, db: RealDictCursor = Depends(get_db), user=Depends(get_current_user)):
    db.execute("DELETE FROM grades WHERE id = %s", (grade_id,))
