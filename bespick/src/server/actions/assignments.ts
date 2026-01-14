'use server';

import { auth, clerkClient } from '@clerk/nextjs/server';

import {
  type Group,
  type Portfolio,
  type Rank,
  type RankCategory,
  getPortfoliosForGroup,
  isValidGroup,
  isValidPortfolioForGroup,
  getRanksForCategory,
  isValidRankCategory,
  isValidRankForCategory,
} from '@/lib/org';

export type UpdateMyAssignmentsResult = {
  success: boolean;
  group: Group | null;
  portfolio: Portfolio | null;
  rankCategory: RankCategory | null;
  rank: Rank | null;
  message: string;
};

export async function updateMyAssignments({
  group,
  portfolio,
  rankCategory,
  rank,
}: {
  group: string | null;
  portfolio: string | null;
  rankCategory: string | null;
  rank: string | null;
}): Promise<UpdateMyAssignmentsResult> {
  const { userId } = await auth();

  if (!userId) {
    return {
      success: false,
      group: null,
      portfolio: null,
      rankCategory: null,
      rank: null,
      message: 'You must be signed in to update assignments.',
    };
  }

  try {
    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    const normalizedGroup = isValidGroup(group) ? group : null;
    const normalizedRankCategory = isValidRankCategory(rankCategory)
      ? rankCategory
      : null;

    let normalizedPortfolio: Portfolio | null;
    if (!normalizedGroup) {
      normalizedPortfolio = null;
    } else if (
      portfolio &&
      isValidPortfolioForGroup(normalizedGroup, portfolio)
    ) {
      normalizedPortfolio = portfolio;
    } else {
      normalizedPortfolio = null;
    }

    if (
      normalizedGroup &&
      getPortfoliosForGroup(normalizedGroup).length === 0
    ) {
      normalizedPortfolio = null;
    }

    let normalizedRank: Rank | null;
    if (!normalizedRankCategory) {
      normalizedRank = null;
    } else if (
      rank &&
      isValidRankForCategory(normalizedRankCategory, rank)
    ) {
      normalizedRank = rank;
    } else {
      normalizedRank = null;
    }

    if (getRanksForCategory(normalizedRankCategory).length === 0) {
      normalizedRank = null;
    }

    const nextMetadata = {
      ...user.publicMetadata,
      group: normalizedGroup,
      portfolio: normalizedPortfolio,
      rankCategory: normalizedRankCategory,
      rank: normalizedRank,
    } as Record<string, unknown>;

    const response = await client.users.updateUserMetadata(userId, {
      publicMetadata: nextMetadata,
    });

    const nextGroup = isValidGroup(response.publicMetadata.group)
      ? response.publicMetadata.group
      : null;
    const nextPortfolio =
      nextGroup &&
      isValidPortfolioForGroup(nextGroup, response.publicMetadata.portfolio)
        ? response.publicMetadata.portfolio
        : null;
    const nextRankCategory = isValidRankCategory(
      response.publicMetadata.rankCategory,
    )
      ? response.publicMetadata.rankCategory
      : null;
    const nextRank =
      nextRankCategory &&
      isValidRankForCategory(nextRankCategory, response.publicMetadata.rank)
        ? response.publicMetadata.rank
        : null;

    return {
      success: true,
      group: nextGroup,
      portfolio: nextPortfolio,
      rankCategory: nextRankCategory,
      rank: nextRank,
      message: 'Assignments updated successfully.',
    };
  } catch (error) {
    console.error('Failed to update assignments', error);
    return {
      success: false,
      group: null,
      portfolio: null,
      rankCategory: null,
      rank: null,
      message: 'Updating assignments failed. Please try again.',
    };
  }
}
