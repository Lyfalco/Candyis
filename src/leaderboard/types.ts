export interface LeaderboardEntry {
  rank: number;
  userId: string;
  displayName: string;
  photoURL?: string | null;
  score: number;
  isCurrentUser?: boolean;
}
