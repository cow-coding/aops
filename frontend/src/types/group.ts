export interface Group {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
}

export interface Member {
  user_id: string;
  group_id: string;
  role: 'owner' | 'member';
}

export interface GroupCreateRequest {
  name: string;
  description?: string;
}

export interface MemberAddRequest {
  user_id: string;
  role?: 'owner' | 'member';
}

export interface MemberUpdateRequest {
  role: 'owner' | 'member';
}
