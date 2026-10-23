"""CircuitLab Calc HTTP routes: auth, calculators, saved calculations."""
from __future__ import annotations

import json
import uuid

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from pydantic import BaseModel, Field, field_validator
from sqlalchemy.orm import Session

from . import circuit_math as cm
from . import config, security
from .database import get_db
from .models import SavedCalculation, User

router = APIRouter()


def current_user(request: Request, db: Session = Depends(get_db)) -> User:
    token = request.cookies.get(config.SESSION_COOKIE)
    return security.require_user(db, token)


# ---------------------------------------------------------------- auth ----


class RegisterBody(BaseModel):
    email: str = Field(min_length=3)
    password: str = Field(min_length=8)
    display_name: str = ""

    @field_validator("email")
    @classmethod
    def _email_shape(cls, value: str) -> str:
        if "@" not in value or value.startswith("@") or value.endswith("@") or "." not in value.split("@")[-1]:
            raise ValueError("Enter a valid email address.")
        return value.lower()


class LoginBody(BaseModel):
    email: str
    password: str


@router.post("/api/auth/register")
def register(body: RegisterBody, response: Response, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == body.email.lower()).first():
        raise HTTPException(status_code=409, detail="An account with this email already exists.")
    user = User(
        email=body.email.lower(),
        display_name=body.display_name or body.email.split("@")[0],
        password_hash=security.hash_password(body.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    token = security.create_session(db, user)
    response.set_cookie(config.SESSION_COOKIE, token, httponly=True, samesite="lax", max_age=config.SESSION_MAX_AGE_SECONDS)
    return {"id": user.id, "email": user.email, "display_name": user.display_name}


@router.post("/api/auth/login")
def login(body: LoginBody, response: Response, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == body.email.lower()).first()
    if not user or not security.verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Incorrect email or password.")
    token = security.create_session(db, user)
    response.set_cookie(config.SESSION_COOKIE, token, httponly=True, samesite="lax", max_age=config.SESSION_MAX_AGE_SECONDS)
    return {"id": user.id, "email": user.email, "display_name": user.display_name}


@router.post("/api/auth/logout")
def logout(request: Request, response: Response, db: Session = Depends(get_db)):
    token = request.cookies.get(config.SESSION_COOKIE)
    if token:
        security.destroy_session(db, token)
    response.delete_cookie(config.SESSION_COOKIE)
    return {"ok": True}


@router.get("/api/auth/me")
def me(user: User = Depends(current_user)):
    return {"id": user.id, "email": user.email, "display_name": user.display_name}


# --------------------------------------------------------- calculators ----


def _circuit_http(exc: cm.CircuitError) -> HTTPException:
    return HTTPException(status_code=400, detail=str(exc))


class OhmBody(BaseModel):
    known: str = Field(pattern="^(v|i|r)$")  # which quantity to solve for
    voltage_v: float | None = None
    current_a: float | None = None
    resistance_ohm: float | None = None


@router.post("/api/calc/ohm")
def calc_ohm(body: OhmBody):
    try:
        if body.known == "v":
            value, steps = cm.ohm_voltage(body.current_a, body.resistance_ohm)
            return {"quantity": "voltage_v", "value": value, "unit": "V", "steps": steps}
        if body.known == "i":
            value, steps = cm.ohm_current(body.voltage_v, body.resistance_ohm)
            return {"quantity": "current_a", "value": value, "unit": "A", "steps": steps}
        value, steps = cm.ohm_resistance(body.voltage_v, body.current_a)
        return {"quantity": "resistance_ohm", "value": value, "unit": "ohm", "steps": steps}
    except cm.CircuitError as exc:
        raise _circuit_http(exc)


class PowerBody(BaseModel):
    known: str = Field(pattern="^(vi|ir|vr)$")
    voltage_v: float | None = None
    current_a: float | None = None
    resistance_ohm: float | None = None


@router.post("/api/calc/power")
def calc_power(body: PowerBody):
    try:
        if body.known == "vi":
            value, steps = cm.power_vi(body.voltage_v, body.current_a)
        elif body.known == "ir":
            value, steps = cm.power_ir(body.current_a, body.resistance_ohm)
        else:
            value, steps = cm.power_vr(body.voltage_v, body.resistance_ohm)
        return {"quantity": "power_w", "value": value, "unit": "W", "steps": steps}
    except cm.CircuitError as exc:
        raise _circuit_http(exc)


class NetworkBody(BaseModel):
    kind: str = Field(pattern="^(series|parallel)$")
    resistors: list[float] = Field(min_length=2, max_length=12)


@router.post("/api/calc/network")
def calc_network(body: NetworkBody):
    try:
        if body.kind == "series":
            value, steps = cm.series(*body.resistors)
        else:
            value, steps = cm.parallel(*body.resistors)
        return {"quantity": "resistance_ohm", "value": value, "unit": "ohm", "steps": steps}
    except cm.CircuitError as exc:
        raise _circuit_http(exc)


class DividerBody(BaseModel):
    supply_v: float
    r1: float
    r2: float


@router.post("/api/calc/divider")
def calc_divider(body: DividerBody):
    try:
        value, steps = cm.divider(body.supply_v, body.r1, body.r2)
        return {"quantity": "voltage_v", "value": value, "unit": "V", "steps": steps,
                "assumption": "Unloaded divider (no load current) — approximation, not exact."}
    except cm.CircuitError as exc:
        raise _circuit_http(exc)


class TwoMeshBody(BaseModel):
    v1: float
    v2: float
    r1: float
    r2: float
    r3: float


@router.post("/api/calc/two-mesh")
def calc_two_mesh(body: TwoMeshBody):
    try:
        currents, steps = cm.two_mesh(body.v1, body.v2, body.r1, body.r2, body.r3)
        return {"quantity": "currents", "value": currents, "unit": "A", "steps": steps}
    except cm.CircuitError as exc:
        raise _circuit_http(exc)


class ConvertBody(BaseModel):
    value: float
    kind: str
    from_unit: str
    to_unit: str


@router.post("/api/calc/convert")
def calc_convert(body: ConvertBody):
    try:
        value = cm.convert(body.value, body.kind, body.from_unit, body.to_unit)
        return {"quantity": "converted", "value": value, "unit": body.to_unit,
                "steps": [f"{body.value} {body.from_unit} = {value} {body.to_unit}"]}
    except cm.CircuitError as exc:
        raise _circuit_http(exc)


# -------------------------------------------------- saved calculations ----


class SaveBody(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    kind: str = Field(min_length=1, max_length=64)
    inputs: dict
    result: dict


@router.get("/api/calculations")
def list_calculations(user: User = Depends(current_user), db: Session = Depends(get_db)):
    rows = db.query(SavedCalculation).filter(SavedCalculation.user_id == user.id).order_by(SavedCalculation.id.desc()).all()
    return [
        {
            "id": r.id,
            "uid": r.uid,
            "name": r.name,
            "kind": r.kind,
            "inputs": json.loads(r.inputs_json),
            "result": json.loads(r.result_json),
            "created_at": r.created_at.isoformat() if r.created_at else None,
        }
        for r in rows
    ]


@router.post("/api/calculations")
def save_calculation(body: SaveBody, user: User = Depends(current_user), db: Session = Depends(get_db)):
    row = SavedCalculation(
        uid=uuid.uuid4().hex,
        user_id=user.id,
        name=body.name,
        kind=body.kind,
        inputs_json=json.dumps(body.inputs),
        result_json=json.dumps(body.result),
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return {"id": row.id, "uid": row.uid}


@router.delete("/api/calculations/{calc_id}")
def delete_calculation(calc_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    row = db.get(SavedCalculation, calc_id)
    if not row or row.user_id != user.id:
        raise HTTPException(status_code=404, detail="Saved calculation not found.")
    db.delete(row)
    db.commit()
    return {"ok": True}
