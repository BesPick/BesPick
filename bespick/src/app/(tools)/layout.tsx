import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { currentUser } from '@clerk/nextjs/server';
import { getAllowedDomains, getAllowedEmail } from '@/server/auth';

type ToolsLayoutProps = {
  children: ReactNode;
};

export default async function ToolsLayout({ children }: ToolsLayoutProps) {
  const user = await currentUser();
  if (!user) {
    redirect('/sign-in');
  }

  const email = getAllowedEmail(user);
  if (!email) {
    console.warn('Domain restriction triggered', {
      userId: user.id,
      primaryEmailAddressId: user.primaryEmailAddressId,
      allowedDomains: getAllowedDomains(),
      emails: user.emailAddresses.map((address) => address.emailAddress),
    });
    redirect('/domain-restricted');
  }

  return <>{children}</>;
}
