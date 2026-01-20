import type { Group, Portfolio, Rank, RankCategory } from '@/lib/org';

export {};

export type Roles = 'admin' | 'moderator' | '';

declare global {
  interface CustomJwtSessionClaims {
    metadata: {
      role?: Roles;
      group?: Group | null;
      portfolio?: Portfolio | null;
      rankCategory?: RankCategory | null;
      rank?: Rank | null;
    };
  }
}
