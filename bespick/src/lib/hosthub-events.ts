export type HostHubEventType = 'standup' | 'demo';

export const HOSTHUB_EVENT_TYPES = ['standup', 'demo'] as const;

export const isHostHubEventType = (
  value: unknown,
): value is HostHubEventType =>
  HOSTHUB_EVENT_TYPES.includes(value as HostHubEventType);

export const isValidDateKey = (value: string) =>
  /^\d{4}-\d{2}-\d{2}$/.test(value);

export const isValidTimeValue = (value: string) => {
  if (!/^\d{2}:\d{2}$/.test(value)) return false;
  const [hours, minutes] = value.split(':').map(Number);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return false;
  return hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59;
};

export const getEventOverrideId = (
  date: string,
  eventType: HostHubEventType,
) => `${eventType}-${date}`;
