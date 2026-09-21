export type GoogleCalendarAttendee = {
  self?: boolean;
  responseStatus?: string;
};

export type GoogleCalendarEvent = {
  id?: string;
  status?: string;
  summary?: string;
  start?: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  end?: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  attendees?: GoogleCalendarAttendee[];
  transparency?: string;
  eventType?: string;
};

export type GoogleCalendarListResponse = {
  items?: GoogleCalendarEvent[];
  nextPageToken?: string;
};

export type MappedCalendarEvent = {
  googleEventId: string;
  title: string;
  startsAt: Date | null;
  endsAt: Date | null;
  allDay: boolean;
};
