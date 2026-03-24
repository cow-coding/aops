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

export interface MemberWithUser {
  user_id: string;
  group_id: string;
  role: 'owner' | 'member';
  user: { id: string; email: string; name: string };
}

export interface GroupCreateRequest {
  name: string;
  description?: string;
}

export interface MemberAddRequest {
  email: string;
  role?: 'member';
}

export interface MemberUpdateRequest {
  role: 'owner' | 'member';
}
