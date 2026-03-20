from fastapi import APIRouter, Depends, HTTPException
from psycopg2.extras import RealDictCursor
from app.db.session import get_db
from app.api.routes.auth import get_current_user
from app.schemas.schemas import BoardCreate, BoardOut, ColumnCreate, ColumnOut, CardCreate, CardOut
from typing import List

router = APIRouter()


def _board_with_cols(db, board_id: str):
    db.execute("SELECT * FROM kanban_columns WHERE board_id = %s ORDER BY position", (board_id,))
    columns = db.fetchall()
    cols_out = []
    for col in columns:
        db.execute("SELECT * FROM kanban_cards WHERE column_id = %s ORDER BY position, created_at", (str(col["id"]),))
        cols_out.append({**col, "cards": db.fetchall()})
    return cols_out


@router.get("/boards", response_model=List[BoardOut])
def list_boards(db: RealDictCursor = Depends(get_db), user=Depends(get_current_user)):
    db.execute("SELECT * FROM kanban_boards WHERE owner_id = %s ORDER BY created_at", (str(user["id"]),))
    boards = db.fetchall()
    return [{**b, "columns": _board_with_cols(db, str(b["id"]))} for b in boards]


@router.post("/boards", response_model=BoardOut, status_code=201)
def create_board(body: BoardCreate, db: RealDictCursor = Depends(get_db), user=Depends(get_current_user)):
    db.execute(
        "INSERT INTO kanban_boards (owner_id, title, color) VALUES (%s, %s, %s) RETURNING *",
        (str(user["id"]), body.title, body.color),
    )
    board = db.fetchone()
    for i, title in enumerate(["A fazer", "Em andamento", "Concluído"]):
        db.execute(
            "INSERT INTO kanban_columns (board_id, title, position) VALUES (%s, %s, %s)",
            (str(board["id"]), title, i),
        )
    return {**board, "columns": _board_with_cols(db, str(board["id"]))}


@router.delete("/boards/{board_id}", status_code=204)
def delete_board(board_id: str, db: RealDictCursor = Depends(get_db), user=Depends(get_current_user)):
    db.execute("SELECT id FROM kanban_boards WHERE id = %s AND owner_id = %s", (board_id, str(user["id"])))
    if not db.fetchone():
        raise HTTPException(404, "Board não encontrado")
    db.execute("DELETE FROM kanban_boards WHERE id = %s", (board_id,))


@router.post("/boards/{board_id}/columns", response_model=ColumnOut, status_code=201)
def add_column(board_id: str, body: ColumnCreate, db: RealDictCursor = Depends(get_db), user=Depends(get_current_user)):
    db.execute("SELECT id FROM kanban_boards WHERE id = %s AND owner_id = %s", (board_id, str(user["id"])))
    if not db.fetchone():
        raise HTTPException(404, "Board não encontrado")
    db.execute(
        "INSERT INTO kanban_columns (board_id, title, position) VALUES (%s, %s, %s) RETURNING *",
        (board_id, body.title, body.position),
    )
    return {**db.fetchone(), "cards": []}


@router.post("/columns/{column_id}/cards", response_model=CardOut, status_code=201)
def add_card(column_id: str, body: CardCreate, db: RealDictCursor = Depends(get_db), user=Depends(get_current_user)):
    db.execute(
        """INSERT INTO kanban_cards (column_id, title, description, priority, due_date, position)
           VALUES (%s, %s, %s, %s, %s, %s) RETURNING *""",
        (column_id, body.title, body.description, body.priority, body.due_date, body.position),
    )
    return db.fetchone()


@router.patch("/cards/{card_id}", response_model=CardOut)
def update_card(card_id: str, body: CardCreate, db: RealDictCursor = Depends(get_db), user=Depends(get_current_user)):
    db.execute("SELECT id FROM kanban_cards WHERE id = %s", (card_id,))
    if not db.fetchone():
        raise HTTPException(404, "Card não encontrado")
    db.execute(
        """UPDATE kanban_cards
           SET title=%s, description=%s, priority=%s, due_date=%s, position=%s,
               column_id=COALESCE(%s, column_id)
           WHERE id=%s RETURNING *""",
        (body.title, body.description, body.priority, body.due_date, body.position,
         str(body.column_id) if body.column_id else None, card_id),
    )
    return db.fetchone()


@router.delete("/cards/{card_id}", status_code=204)
def delete_card(card_id: str, db: RealDictCursor = Depends(get_db), user=Depends(get_current_user)):
    db.execute("DELETE FROM kanban_cards WHERE id = %s", (card_id,))
