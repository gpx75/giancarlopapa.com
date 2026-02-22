import { createError } from 'h3';
import type {
  CalSlot,
  CalBookingPayload,
  CalBookingResponse
} from '~/types/cal';

interface CalRequestOptions {
  path: string;
  method?: 'GET' | 'POST';
  query?: Record<string, string | number | boolean | undefined>;
  body?: unknown;
  headers?: Record<string, string>;
}

interface EventTypeV1 {
  id: number;
  title: string;
  slug: string;
  length: number;
  hidden?: boolean;
  description?: string | null;
  userId: number;
  timeZone?: string | null;
  owner?: {
    username?: string;
    name?: string;
  };
}

interface EventTypesV1Response {
  event_types: EventTypeV1[];
}

interface SlotsV2Response {
  status: string;
  data: Record<string, Array<{ start: string }>>;
}

type BookingResponse = {
  data: CalBookingResponse;
};

function useCalConfig() {
  const config = useRuntimeConfig();
  const apiKey = config.cal?.apiKey;
  const baseUrl = config.cal?.baseUrl || 'https://api.cal.com';

  if (!apiKey) {
    throw new Error(
      'CAL_API_KEY is not configured. Set it in your environment variables.'
    );
  }

  return {
    apiKey,
    baseUrl,
    username: config.cal?.username
  };
}

async function calRequest<T>({
  path,
  method = 'GET',
  query,
  body,
  headers
}: CalRequestOptions): Promise<T> {
  const { apiKey, baseUrl } = useCalConfig();

  try {
    return (await $fetch<T>(path, {
      baseURL: baseUrl,
      method,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...headers
      },
      query,
      body: body as Record<string, unknown> | null
    })) as T;
  } catch (error: unknown) {
    const err = error as {
      response?: { status?: number; _data?: Record<string, unknown> };
      statusCode?: number;
      message?: string;
      data?: unknown;
    };
    const statusCode = err?.response?.status ?? err?.statusCode ?? 500;
    const statusMessage =
      typeof err?.response?._data?.message === 'string'
        ? (err.response?._data?.message as string)
        : err?.message || 'Unknown Cal API error';
    console.error('[calRequest] Cal API request failed', {
      path,
      method,
      statusCode,
      statusMessage,
      data: err?.response?._data ?? err?.data
    });
    throw createError({ statusCode, statusMessage });
  }
}

export async function fetchCalEventTypes() {
  const { apiKey } = useCalConfig();
  return calRequest<EventTypesV1Response>({
    path: '/v1/event-types',
    query: { apiKey }
  });
}

interface FetchSlotsRequest {
  eventTypeId: number;
  start: string;
  end: string;
  durationMinutes: number;
  timezone?: string;
}

export async function fetchCalSlots({
  eventTypeId,
  start,
  end,
  durationMinutes,
  timezone
}: FetchSlotsRequest): Promise<CalSlot[]> {
  const response = await calRequest<SlotsV2Response>({
    path: '/v2/slots',
    headers: {
      'cal-api-version': '2024-09-04'
    },
    query: {
      eventTypeId,
      start: `${start}T00:00:00.000Z`,
      end: `${end}T23:59:59.999Z`,
      timeZone: timezone
    }
  });

  const stepMs = durationMinutes * 60_000;
  const slots: CalSlot[] = [];

  for (const daySlots of Object.values(response.data ?? {})) {
    for (const slot of daySlots) {
      const slotStart = new Date(slot.start);
      const slotEnd = new Date(slotStart.getTime() + stepMs);
      slots.push({
        start: slotStart.toISOString(),
        end: slotEnd.toISOString(),
        timeZone: timezone
      } as CalSlot);
    }
  }

  return slots;
}

export async function createCalBooking(
  payload: CalBookingPayload
): Promise<CalBookingResponse> {
  const response: BookingResponse = await calRequest<BookingResponse>({
    path: '/v2/bookings',
    method: 'POST',
    headers: {
      'cal-api-version': '2024-08-13'
    },
    body: payload
  });

  return response.data;
}
