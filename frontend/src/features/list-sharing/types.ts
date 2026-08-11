export interface ShareCandidate {
  hubUserId: string;
  email: string;
  name: string | null;
  image: string | null;
}

export interface PendingInvite {
  id: string;
  invitedAt: string;
  list: {
    id: string;
    title: string;
  };
}

export interface Collaborator {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
}
