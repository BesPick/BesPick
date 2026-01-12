'use server';

import { auth, clerkClient } from '@clerk/nextjs/server';

import {
  type Group,
  type Portfolio,
  getPortfoliosForGroup,
  isValidGroup,
  isValidPortfolioForGroup,
} from '@/lib/org';

export type UpdateMyAssignmentsResult = {
  success: boolean;
  group: Group | null;
  portfolio: Portfolio | null;
  message: string;
};

export async function updateMyAssignments({
  group,
  portfolio,
}: {
  group: string | null;
  portfolio: string | null;
}): Promise<UpdateMyAssignmentsResult> {
  const { userId } = await auth();

  if (!userId) {
    return {
      success: false,
      group: null,
      portfolio: null,
      message: 'You must be signed in to update assignments.',
    };
  }

  try {
    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    const normalizedGroup = isValidGroup(group) ? group : null;

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

    const nextMetadata = {
      ...user.publicMetadata,
      group: normalizedGroup,
      portfolio: normalizedPortfolio,
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

    return {
      success: true,
      group: nextGroup,
      portfolio: nextPortfolio,
      message: 'Assignments updated successfully.',
    };
  } catch (error) {
    console.error('Failed to update assignments', error);
    return {
      success: false,
      group: null,
      portfolio: null,
      message: 'Updating assignments failed. Please try again.',
    };
  }
}
