import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import get_current_user
from app.core.database import get_db
from app.models.user import User
from app.schemas.group import (
    GroupCreate,
    GroupResponse,
    MemberAdd,
    MemberResponse,
    MemberUpdate,
)
from app.services import group as group_service
from app.services import user as user_service

router = APIRouter(prefix="/groups", tags=["groups"])


@router.post("/", response_model=GroupResponse, status_code=201)
async def create_group(
    data: GroupCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await group_service.create_group(db, data, current_user.id)


@router.get("/", response_model=list[GroupResponse])
async def list_groups(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await group_service.get_user_groups(db, current_user.id)


@router.get("/{group_id}/members", response_model=list[MemberResponse])
async def list_members(
    group_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    group = await group_service.get_group(db, group_id)
    if not group:
        raise HTTPException(status_code=404, detail="Group not found.")

    if not await group_service.get_membership(db, group_id, current_user.id):
        raise HTTPException(status_code=403, detail="Access denied.")

    return await group_service.get_group_members(db, group_id)


@router.post("/{group_id}/members", response_model=MemberResponse, status_code=201)
async def add_member(
    group_id: uuid.UUID,
    data: MemberAdd,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    group = await group_service.get_group(db, group_id)
    if not group:
        raise HTTPException(status_code=404, detail="Group not found.")

    if not await group_service.is_group_owner(db, group_id, current_user.id):
        raise HTTPException(status_code=403, detail="Only group owners can add members.")

    # Resolve email → user
    target = await user_service.get_user_by_email(db, data.email)
    if not target:
        raise HTTPException(status_code=404, detail="User not found.")

    existing = await group_service.get_membership(db, group_id, target.id)
    if existing:
        raise HTTPException(status_code=409, detail="User is already a member.")

    return await group_service.add_member(db, group_id, target.id, data.role)


@router.delete("/{group_id}", status_code=204)
async def delete_group(
    group_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    group = await group_service.get_group(db, group_id)
    if not group:
        raise HTTPException(status_code=404, detail="Group not found.")

    if not await group_service.is_group_owner(db, group_id, current_user.id):
        raise HTTPException(status_code=403, detail="Only group owners can delete the group.")

    await group_service.delete_group(db, group)


@router.delete("/{group_id}/members/{user_id}", status_code=204)
async def remove_member(
    group_id: uuid.UUID,
    user_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    group = await group_service.get_group(db, group_id)
    if not group:
        raise HTTPException(status_code=404, detail="Group not found.")

    if not await group_service.is_group_owner(db, group_id, current_user.id):
        raise HTTPException(status_code=403, detail="Only group owners can remove members.")

    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot modify your own membership.")

    membership = await group_service.get_membership(db, group_id, user_id)
    if not membership:
        raise HTTPException(status_code=404, detail="Member not found.")

    await group_service.remove_member(db, membership)


@router.patch("/{group_id}/members/{user_id}", response_model=MemberResponse)
async def update_member_role(
    group_id: uuid.UUID,
    user_id: uuid.UUID,
    data: MemberUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    group = await group_service.get_group(db, group_id)
    if not group:
        raise HTTPException(status_code=404, detail="Group not found.")

    if not await group_service.is_group_owner(db, group_id, current_user.id):
        raise HTTPException(status_code=403, detail="Only group owners can change roles.")

    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot modify your own membership.")

    membership = await group_service.get_membership(db, group_id, user_id)
    if not membership:
        raise HTTPException(status_code=404, detail="Member not found.")

    return await group_service.update_member_role(db, membership, data.role)
