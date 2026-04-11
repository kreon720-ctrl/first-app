// Team types

export type TeamRole = 'LEADER' | 'MEMBER';

export interface Team {
  id: string;
  name: string;
  description: string | null;
  leaderId: string;
  myRole: TeamRole;
  createdAt: string;
}

export interface PublicTeam {
  id: string;
  name: string;
  description: string | null;
  leaderId: string;
  leaderName: string;
  memberCount: number;
  createdAt: string;
}

export interface TeamDetail extends Team {
  members: TeamMember[];
}

export interface TeamMember {
  userId: string;
  name: string;
  email: string;
  role: TeamRole;
  joinedAt: string;
}

export interface TeamCreateInput {
  name: string;
  description?: string;
}

// Join Request types

export type JoinRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface JoinRequest {
  id: string;
  teamId: string;
  teamName: string;
  requesterId: string;
  requesterName?: string;
  requesterEmail?: string;
  status: JoinRequestStatus;
  requestedAt: string;
  respondedAt: string | null;
}

export interface JoinRequestAction {
  action: 'APPROVE' | 'REJECT';
}
