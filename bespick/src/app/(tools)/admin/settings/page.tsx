import { redirect } from 'next/navigation';

import { checkRole } from '@/server/auth/check-role';
import {
  getProfileWarningConfig,
  getWarningBannerConfig,
} from '@/server/services/site-settings';

import { ProfileWarningCard } from './_components/profile-warning-card';
import { WarningBannerCard } from './_components/warning-banner-card';

export default async function AdminSettingsPage() {
  if (!(await checkRole('admin'))) {
    redirect('/');
  }

  const warningBanner = await getWarningBannerConfig();
  const profileWarning = await getProfileWarningConfig();

  return (
    <div className='mx-auto w-full max-w-5xl space-y-8 px-4 py-10'>
      <header className='rounded-2xl border border-border bg-card p-6 shadow-sm'>
        <h1 className='text-3xl font-semibold text-foreground'>Settings</h1>
        <p className='mt-2 text-sm text-muted-foreground'>
          Manage global configuration that affects the landing page and other
          shared experiences.
        </p>
      </header>

      <div className='space-y-6'>
        <WarningBannerCard initialConfig={warningBanner} />
        <ProfileWarningCard initialConfig={profileWarning} />
      </div>
    </div>
  );
}
