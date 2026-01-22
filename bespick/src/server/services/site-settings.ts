import { eq } from 'drizzle-orm';

import { db } from '@/server/db/client';
import { siteSettings } from '@/server/db/schema';

export type WarningBannerConfig = {
  enabled: boolean;
  message: string;
};

export type ProfileWarningConfig = {
  enabled: boolean;
};

const WARNING_BANNER_ID = 'warning-banner';
const PROFILE_WARNING_ID = 'profile-warning';
const DEFAULT_WARNING_BANNER: WarningBannerConfig = {
  enabled: false,
  message: '',
};
const DEFAULT_PROFILE_WARNING: ProfileWarningConfig = {
  enabled: true,
};

const parseJson = (raw: string) => {
  try {
    return JSON.parse(raw) as unknown;
  } catch (error) {
    console.error('Failed to parse site settings JSON', error);
    return null;
  }
};

const normalizeWarningBannerConfig = (
  value: unknown,
): WarningBannerConfig => {
  if (!value || typeof value !== 'object') {
    return DEFAULT_WARNING_BANNER;
  }
  const record = value as Record<string, unknown>;
  const message =
    typeof record.message === 'string' ? record.message.trim() : '';
  const enabled = Boolean(record.enabled) && message.length > 0;
  return { enabled, message };
};

const normalizeProfileWarningConfig = (
  value: unknown,
): ProfileWarningConfig => {
  if (!value || typeof value !== 'object') {
    return DEFAULT_PROFILE_WARNING;
  }
  const record = value as Record<string, unknown>;
  return {
    enabled: Boolean(record.enabled),
  };
};

export async function getWarningBannerConfig(): Promise<WarningBannerConfig> {
  const rows = await db
    .select()
    .from(siteSettings)
    .where(eq(siteSettings.id, WARNING_BANNER_ID))
    .limit(1);
  const row = rows[0];
  if (!row) return DEFAULT_WARNING_BANNER;
  const parsed = parseJson(row.configJson);
  return normalizeWarningBannerConfig(parsed);
}

export async function saveWarningBannerConfig({
  config,
  updatedBy,
}: {
  config: WarningBannerConfig;
  updatedBy?: string | null;
}): Promise<WarningBannerConfig> {
  const normalized = normalizeWarningBannerConfig(config);
  const payload = {
    id: WARNING_BANNER_ID,
    configJson: JSON.stringify(normalized),
    updatedAt: Date.now(),
    updatedBy: updatedBy ?? null,
  };

  await db
    .insert(siteSettings)
    .values(payload)
    .onConflictDoUpdate({
      target: siteSettings.id,
      set: {
        configJson: payload.configJson,
        updatedAt: payload.updatedAt,
        updatedBy: payload.updatedBy,
      },
    });

  return normalized;
}

export async function getProfileWarningConfig(): Promise<ProfileWarningConfig> {
  const rows = await db
    .select()
    .from(siteSettings)
    .where(eq(siteSettings.id, PROFILE_WARNING_ID))
    .limit(1);
  const row = rows[0];
  if (!row) return DEFAULT_PROFILE_WARNING;
  const parsed = parseJson(row.configJson);
  return normalizeProfileWarningConfig(parsed);
}

export async function saveProfileWarningConfig({
  config,
  updatedBy,
}: {
  config: ProfileWarningConfig;
  updatedBy?: string | null;
}): Promise<ProfileWarningConfig> {
  const normalized = normalizeProfileWarningConfig(config);
  const payload = {
    id: PROFILE_WARNING_ID,
    configJson: JSON.stringify(normalized),
    updatedAt: Date.now(),
    updatedBy: updatedBy ?? null,
  };

  await db
    .insert(siteSettings)
    .values(payload)
    .onConflictDoUpdate({
      target: siteSettings.id,
      set: {
        configJson: payload.configJson,
        updatedAt: payload.updatedAt,
        updatedBy: payload.updatedBy,
      },
    });

  return normalized;
}
