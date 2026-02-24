import { api } from './api';
import type { Group, Member, GroupCreateRequest, MemberAddRequest, MemberUpdateRequest } from '../types/group';

export const groupApi = {
  list: () => api.get<Group[]>('/groups/'),

  create: (data: GroupCreateRequest) => api.post<Group>('/groups/', data),

  addMember: (groupId: string, data: MemberAddRequest) =>
    api.post<Member>(`/groups/${groupId}/members`, data),

  updateMemberRole: (groupId: string, userId: string, data: MemberUpdateRequest) =>
    api.patch<Member>(`/groups/${groupId}/members/${userId}`, data),

  removeMember: (groupId: string, userId: string) =>
    api.delete<void>(`/groups/${groupId}/members/${userId}`),
};
