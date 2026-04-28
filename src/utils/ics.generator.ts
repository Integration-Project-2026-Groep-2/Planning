type IcsData = {
  title:       string;
  date:        string;   
  startTime:   string;   
  endTime:     string; 
  location?:   string;
  description?: string;
  sessionId:   string;
};

const toIcsDateTime = (date: string, time: string): string => {
  const datePart = date.replace(/-/g, '');           
  const timePart = time.replace(/:/g, '').slice(0, 6).padEnd(6, '0'); 
  return `${datePart}T${timePart}`;
};

export const generateIcs = (data: IcsData): string => {
  const dtStart = toIcsDateTime(data.date, data.startTime);
  const dtEnd   = toIcsDateTime(data.date, data.endTime);
  const now     = toIcsDateTime(
    new Date().toISOString().split('T')[0],
    new Date().toTimeString().slice(0, 8)
  );

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Planning App//NL',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${data.sessionId}@planning-app`,
    `DTSTAMP:${now}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:${data.title}`,
    data.location    ? `LOCATION:${data.location}`       : '',
    data.description ? `DESCRIPTION:${data.description}` : '',
    'END:VEVENT',
    'END:VCALENDAR',
  ];

  return lines.filter(Boolean).join('\r\n');
};

export const generateIcsBase64 = (data: IcsData): string => {
  const icsString = generateIcs(data);
  return Buffer.from(icsString).toString('base64');
};