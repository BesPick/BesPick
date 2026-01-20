'use client';

import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import {
  ClerkLoaded,
  ClerkLoading,
  SignedIn,
  UserButton,
  useUser,
} from '@clerk/nextjs';
import {
  BadgeCheck,
  Gamepad2,
  HeartPulse,
  Layers,
  Menu,
  Server,
  Users,
  X,
} from 'lucide-react';

import { HeaderButton } from '@/components/header/header-button';
import {
  GROUP_OPTIONS,
  getPortfoliosForGroup,
  getRanksForCategory,
  isValidGroup,
  isValidPortfolioForGroup,
  isValidRankCategory,
  isValidRankForCategory,
  type Group,
  type Portfolio,
  type Rank,
  type RankCategory,
  RANK_CATEGORY_OPTIONS,
} from '@/lib/org';
import { updateMyAssignments } from '@/server/actions/assignments';

type AssignmentInfoProps = {
  groupLabel: string;
  portfolioLabel: string;
  rankCategoryLabel: string;
  rankLabel: string;
  onEditGroup: () => void;
  onEditPortfolio: () => void;
  onEditRankCategory: () => void;
  onEditRank: () => void;
};

function UserAssignmentMenu({
  groupLabel,
  portfolioLabel,
  rankCategoryLabel,
  rankLabel,
  onEditGroup,
  onEditPortfolio,
  onEditRankCategory,
  onEditRank,
}: AssignmentInfoProps) {
  return (
    <UserButton>
      <UserButton.MenuItems>
        <UserButton.Action
          label={`Rank Type: ${rankCategoryLabel}`}
          labelIcon={<BadgeCheck className='h-4 w-4' aria-hidden={true} />}
          onClick={onEditRankCategory}
        />
        <UserButton.Action
          label={`Rank: ${rankLabel}`}
          labelIcon={<BadgeCheck className='h-4 w-4' aria-hidden={true} />}
          onClick={onEditRank}
        />
        <UserButton.Action
          label={`Group: ${groupLabel}`}
          labelIcon={<Users className='h-4 w-4' aria-hidden={true} />}
          onClick={onEditGroup}
        />
        <UserButton.Action
          label={`Portfolio: ${portfolioLabel}`}
          labelIcon={<Layers className='h-4 w-4' aria-hidden={true} />}
          onClick={onEditPortfolio}
        />
      </UserButton.MenuItems>
    </UserButton>
  );
}

export function HeaderActions() {
  const { user } = useUser();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [isAssignmentOpen, setIsAssignmentOpen] = useState(false);
  const [assignmentFocus, setAssignmentFocus] = useState<
    'group' | 'portfolio' | 'rankCategory' | 'rank'
  >('group');
  const [assignmentGroup, setAssignmentGroup] = useState<Group | ''>('');
  const [assignmentPortfolio, setAssignmentPortfolio] = useState<
    Portfolio | ''
  >('');
  const [assignmentRankCategory, setAssignmentRankCategory] = useState<
    RankCategory | ''
  >('');
  const [assignmentRank, setAssignmentRank] = useState<Rank | ''>('');
  const [assignmentError, setAssignmentError] = useState<string | null>(null);
  const [isAssignmentPending, startAssignmentTransition] = useTransition();

  const isAdmin =
    (user?.publicMetadata?.role as string | null | undefined) === 'admin';
  const rawGroup = user?.publicMetadata?.group;
  const normalizedGroup = isValidGroup(rawGroup) ? rawGroup : null;
  const rawPortfolio = user?.publicMetadata?.portfolio;
  const normalizedPortfolio =
    normalizedGroup &&
    isValidPortfolioForGroup(normalizedGroup, rawPortfolio)
      ? rawPortfolio
      : null;
  const rawRankCategory = user?.publicMetadata?.rankCategory;
  const normalizedRankCategory = isValidRankCategory(rawRankCategory)
    ? rawRankCategory
    : null;
  const rawRank = user?.publicMetadata?.rank;
  const normalizedRank =
    normalizedRankCategory &&
    isValidRankForCategory(normalizedRankCategory, rawRank)
      ? rawRank
      : null;
  const groupLabel = normalizedGroup ?? 'No group assigned';
  const portfolioLabel = normalizedPortfolio ?? 'No portfolio assigned';
  const rankCategoryLabel = normalizedRankCategory ?? 'No rank category';
  const rankLabel =
    normalizedRank ??
    (normalizedRankCategory === 'Civilian'
      ? 'N/A'
      : 'No rank assigned');

  const openAssignmentModal = (
    focus: 'group' | 'portfolio' | 'rankCategory' | 'rank',
  ) => {
    setAssignmentGroup(normalizedGroup ?? '');
    setAssignmentPortfolio(normalizedPortfolio ?? '');
    setAssignmentRankCategory(normalizedRankCategory ?? '');
    setAssignmentRank(normalizedRank ?? '');
    setAssignmentFocus(focus);
    setAssignmentError(null);
    setIsAssignmentOpen(true);
  };

  const closeAssignmentModal = () => {
    if (isAssignmentPending) return;
    setIsAssignmentOpen(false);
    setAssignmentError(null);
  };

  const navItems = useMemo(() => {
    const items = [
      { href: '/hosthub', label: 'HostHub', icon: Server },
      { href: '/morale', label: 'Morale', icon: HeartPulse },
      { href: '/games', label: 'Games', icon: Gamepad2 },
    ];

    if (isAdmin) {
      items.push({
        href: '/morale/admin/roster',
        label: 'Roster',
        icon: Users,
      });
    }

    return items;
  }, [isAdmin]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handleClick = (event: MouseEvent) => {
      if (
        menuRef.current &&
        event.target instanceof Node &&
        !menuRef.current.contains(event.target)
      ) {
        setOpen(false);
      }
    };

    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);

    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  const toggleMenu = () => setOpen((prev) => !prev);
  const closeMenu = () => setOpen(false);
  const availablePortfolios = assignmentGroup
    ? getPortfoliosForGroup(assignmentGroup)
    : [];
  const portfolioSelectDisabled =
    !assignmentGroup || availablePortfolios.length === 0 || isAssignmentPending;
  const availableRanks = assignmentRankCategory
    ? getRanksForCategory(assignmentRankCategory)
    : [];
  const rankSelectDisabled =
    !assignmentRankCategory ||
    availableRanks.length === 0 ||
    isAssignmentPending;

  const handleAssignmentGroupChange = (value: string) => {
    const nextGroup = value ? (value as Group) : '';
    const nextPortfolios = nextGroup ? getPortfoliosForGroup(nextGroup) : [];
    setAssignmentGroup(nextGroup);
    setAssignmentPortfolio((current) =>
      current && nextPortfolios.includes(current as Portfolio) ? current : '',
    );
  };

  const handleAssignmentPortfolioChange = (value: string) => {
    setAssignmentPortfolio(value ? (value as Portfolio) : '');
  };

  const handleAssignmentRankCategoryChange = (value: string) => {
    const nextCategory = value ? (value as RankCategory) : '';
    setAssignmentRankCategory(nextCategory);
    setAssignmentRank((current) =>
      current && isValidRankForCategory(nextCategory || null, current)
        ? current
        : '',
    );
  };

  const handleAssignmentRankChange = (value: string) => {
    setAssignmentRank(value ? (value as Rank) : '');
  };

  const handleAssignmentSave = () => {
    startAssignmentTransition(async () => {
      setAssignmentError(null);
      const result = await updateMyAssignments({
        group: assignmentGroup ? assignmentGroup : null,
        portfolio: assignmentPortfolio ? assignmentPortfolio : null,
        rankCategory: assignmentRankCategory ? assignmentRankCategory : null,
        rank: assignmentRank ? assignmentRank : null,
      });
      if (!result.success) {
        setAssignmentError(result.message);
        return;
      }
      await user?.reload();
      setIsAssignmentOpen(false);
    });
  };

  return (
    <>
      <div className='hidden items-center gap-3 md:flex'>
        <ClerkLoaded>
          <div className='flex items-center gap-3'>
            <SignedIn>
              <div className='flex items-center gap-3'>
                {navItems.map(({ href, label, icon }) => (
                  <HeaderButton
                    key={href}
                    href={href}
                    label={label}
                    icon={icon}
                  />
                ))}
                <UserAssignmentMenu
                  groupLabel={groupLabel}
                  portfolioLabel={portfolioLabel}
                  rankCategoryLabel={rankCategoryLabel}
                  rankLabel={rankLabel}
                  onEditGroup={() => openAssignmentModal('group')}
                  onEditPortfolio={() => openAssignmentModal('portfolio')}
                  onEditRankCategory={() => openAssignmentModal('rankCategory')}
                  onEditRank={() => openAssignmentModal('rank')}
                />
              </div>
            </SignedIn>
          </div>
        </ClerkLoaded>
        <ClerkLoading>
          <div className='h-14 w-14 rounded-full bg-muted animate-pulse' />
        </ClerkLoading>
      </div>

      <div className='flex items-center gap-2 md:hidden'>
        <ClerkLoaded>
          <button
            type='button'
            onClick={toggleMenu}
            aria-expanded={open}
            aria-controls='mobile-header-menu'
            className='inline-flex items-center justify-center rounded-md border border-border bg-secondary/80 p-2 text-foreground transition hover:bg-primary/10 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background'
          >
            {open ? (
              <X className='h-5 w-5' aria-hidden={true} />
            ) : (
              <Menu className='h-5 w-5' aria-hidden={true} />
            )}
            <span className='sr-only'>Toggle navigation</span>
          </button>
          <SignedIn>
            <UserAssignmentMenu
              groupLabel={groupLabel}
              portfolioLabel={portfolioLabel}
              rankCategoryLabel={rankCategoryLabel}
              rankLabel={rankLabel}
              onEditGroup={() => openAssignmentModal('group')}
              onEditPortfolio={() => openAssignmentModal('portfolio')}
              onEditRankCategory={() => openAssignmentModal('rankCategory')}
              onEditRank={() => openAssignmentModal('rank')}
            />
          </SignedIn>
        </ClerkLoaded>
        <ClerkLoading>
          <div className='h-10 w-10 rounded-md bg-muted animate-pulse' />
        </ClerkLoading>
      </div>

      {open && (
        <div
          ref={menuRef}
          id='mobile-header-menu'
          className='absolute right-0 top-16 z-50 w-60 space-y-3 rounded-lg border border-border bg-popover p-4 shadow-lg md:hidden'
        >
          <ClerkLoaded>
            <div className='flex flex-col gap-3'>
              <SignedIn>
                {navItems.map(({ href, label, icon }) => (
                  <HeaderButton
                    key={href}
                    href={href}
                    label={label}
                    icon={icon}
                    className='w-full'
                    onClick={closeMenu}
                  />
                ))}
              </SignedIn>
            </div>
          </ClerkLoaded>
          <ClerkLoading>
            <div className='h-14 w-full rounded-md bg-muted animate-pulse' />
          </ClerkLoading>
        </div>
      )}

      {isAssignmentOpen ? (
        <div
          className='fixed inset-0 z-60 grid place-items-center bg-black/50 p-4'
          role='dialog'
          aria-modal='true'
          aria-label='Update assignments'
          onClick={closeAssignmentModal}
        >
          <div
            className='w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl'
            onClick={(event) => event.stopPropagation()}
          >
            <h2 className='text-lg font-semibold text-foreground'>
              Update assignments
            </h2>
            <p className='mt-1 text-sm text-muted-foreground'>
              Choose a rank, group, and portfolio for your profile.
            </p>

            <div className='mt-5 space-y-4'>
              <label className='flex flex-col gap-2 text-sm text-foreground'>
                Rank Category
                <select
                  value={assignmentRankCategory}
                  onChange={(event) =>
                    handleAssignmentRankCategoryChange(event.target.value)
                  }
                  autoFocus={assignmentFocus === 'rankCategory'}
                  className='rounded-md border border-border bg-background px-3 py-2 text-sm shadow-sm transition focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-60'
                >
                  <option value=''>No rank category</option>
                  {RANK_CATEGORY_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className='flex flex-col gap-2 text-sm text-foreground'>
                Rank
                <select
                  value={assignmentRank}
                  onChange={(event) =>
                    handleAssignmentRankChange(event.target.value)
                  }
                  disabled={rankSelectDisabled}
                  autoFocus={assignmentFocus === 'rank'}
                  className='rounded-md border border-border bg-background px-3 py-2 text-sm shadow-sm transition focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-60'
                >
                  <option value=''>No rank assigned</option>
                  {availableRanks.map((rankOption) => (
                    <option key={rankOption} value={rankOption}>
                      {rankOption}
                    </option>
                  ))}
                </select>
                <span className='text-xs text-muted-foreground'>
                  {rankSelectDisabled
                    ? 'Select a rank category with levels to enable this field.'
                    : ''}
                </span>
              </label>

              <label className='flex flex-col gap-2 text-sm text-foreground'>
                Group
                <select
                  value={assignmentGroup}
                  onChange={(event) =>
                    handleAssignmentGroupChange(event.target.value)
                  }
                  autoFocus={assignmentFocus === 'group'}
                  className='rounded-md border border-border bg-background px-3 py-2 text-sm shadow-sm transition focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-60'
                >
                  <option value=''>No group assigned</option>
                  {GROUP_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className='flex flex-col gap-2 text-sm text-foreground'>
                Portfolio
                <select
                  value={assignmentPortfolio}
                  onChange={(event) =>
                    handleAssignmentPortfolioChange(event.target.value)
                  }
                  disabled={portfolioSelectDisabled}
                  autoFocus={assignmentFocus === 'portfolio'}
                  className='rounded-md border border-border bg-background px-3 py-2 text-sm shadow-sm transition focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-60'
                >
                  <option value=''>No portfolio assigned</option>
                  {availablePortfolios.map((portfolioOption) => (
                    <option key={portfolioOption} value={portfolioOption}>
                      {portfolioOption}
                    </option>
                  ))}
                </select>
                <span className='text-xs text-muted-foreground'>
                  {portfolioSelectDisabled
                    ? 'Select a group with portfolios to enable this field.'
                    : ''}
                </span>
              </label>
            </div>

            {assignmentError ? (
              <p className='mt-4 text-sm text-destructive'>
                {assignmentError}
              </p>
            ) : null}

            <div className='mt-6 flex items-center justify-end gap-3'>
              <button
                type='button'
                onClick={closeAssignmentModal}
                className='rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground transition hover:bg-secondary/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background'
                disabled={isAssignmentPending}
              >
                Cancel
              </button>
              <button
                type='button'
                onClick={handleAssignmentSave}
                className='rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-60'
                disabled={isAssignmentPending}
              >
                {isAssignmentPending ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
