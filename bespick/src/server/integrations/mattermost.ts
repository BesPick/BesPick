type MattermostUser = {
  id: string;
  email?: string | null;
  username?: string | null;
};

type MattermostPost = {
  id: string;
  channel_id: string;
  message: string;
};

let cachedBotUserId: string | null = null;

const getMattermostBaseUrl = () => {
  const raw = process.env.MATTERMOST_URL;
  if (!raw) return null;
  return raw.replace(/\/+$/, '');
};

const getMattermostToken = () => process.env.MATTERMOST_BOT_TOKEN ?? null;

const getApiBaseUrl = () => {
  const base = getMattermostBaseUrl();
  return base ? `${base}/api/v4` : null;
};

const isConfigured = () => Boolean(getMattermostBaseUrl() && getMattermostToken());

const buildHeaders = () => {
  const token = getMattermostToken();
  if (!token) return null;
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
};

const mattermostRequest = async <T>(
  path: string,
  init: RequestInit,
): Promise<T | null> => {
  const apiBase = getApiBaseUrl();
  const headers = buildHeaders();
  if (!apiBase || !headers) return null;
  try {
    const response = await fetch(`${apiBase}${path}`, {
      ...init,
      headers: {
        ...headers,
        ...(init.headers ?? {}),
      },
      cache: 'no-store',
    });
    if (!response.ok) {
      const text = await response.text();
      console.error('Mattermost API error', response.status, text);
      return null;
    }
    if (response.status === 204) return null;
    return (await response.json()) as T;
  } catch (error) {
    console.error('Mattermost API request failed', error);
    return null;
  }
};

const fetchBotUserId = async () => {
  if (cachedBotUserId) return cachedBotUserId;
  const configured = isConfigured();
  if (!configured) return null;
  const response = await mattermostRequest<MattermostUser>('/users/me', {
    method: 'GET',
  });
  cachedBotUserId = response?.id ?? null;
  return cachedBotUserId;
};

export const isMattermostConfigured = () => isConfigured();

export const getMattermostEventChannelId = () =>
  process.env.MATTERMOST_EVENT_CHANNEL_ID ?? null;

export async function postMattermostMessage(
  channelId: string,
  message: string,
) {
  if (!isConfigured()) return null;
  return mattermostRequest<MattermostPost>('/posts', {
    method: 'POST',
    body: JSON.stringify({
      channel_id: channelId,
      message,
    }),
  });
}

export async function findMattermostUserIdByEmail(email: string) {
  if (!isConfigured()) return null;
  const encoded = encodeURIComponent(email);
  const user = await mattermostRequest<MattermostUser>(
    `/users/email/${encoded}`,
    { method: 'GET' },
  );
  return user?.id ?? null;
}

export async function postMattermostDirectMessage(
  targetUserId: string,
  message: string,
) {
  if (!isConfigured()) return null;
  const botUserId =
    process.env.MATTERMOST_BOT_USER_ID ?? (await fetchBotUserId());
  if (!botUserId) {
    console.error('Missing Mattermost bot user id for DM');
    return null;
  }
  const directChannel = await mattermostRequest<{ id: string }>(
    '/channels/direct',
    {
      method: 'POST',
      body: JSON.stringify([botUserId, targetUserId]),
    },
  );
  if (!directChannel?.id) {
    console.error('Failed to open Mattermost DM channel');
    return null;
  }
  return postMattermostMessage(directChannel.id, message);
}
