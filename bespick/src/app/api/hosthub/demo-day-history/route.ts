import { NextResponse } from 'next/server';

import { requireIdentity } from '@/server/auth';
import { listDemoDayHistory } from '@/server/services/hosthub-schedule';

const formatDemoDate = (value: string) => {
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return value;
  const date = new Date(year, month - 1, day);
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
};

const escapeCsv = (value: string) => {
  if (value.includes('"') || value.includes(',') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
};

export async function GET() {
  try {
    await requireIdentity();
    const history = await listDemoDayHistory();
    const header = ['date', 'assignee'];
    const rows = history.map((entry) => [
      formatDemoDate(entry.date),
      entry.userName,
    ]);
    const csv = [header, ...rows]
      .map((row) => row.map(escapeCsv).join(','))
      .join('\n');

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition':
          'attachment; filename="demo-day-history.csv"',
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unauthorized';
    const status = message === 'Unauthorized' ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
