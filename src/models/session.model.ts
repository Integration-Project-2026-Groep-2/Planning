export interface Session {
  sessionId:      string;
  title:          string;
  description?:   string;
  date:           string;
  startTime:      string;
  endTime:        string;
  status:         'actief' | 'geannuleerd' | 'volzet' | 'concept';
  locationId?:    string;
  capacity:       number;
  syncStatus:     'synced' | 'pending' | 'failed';
  outlookEventId?: string;
}

export interface CreateSessionDTO {
  title:          string;
  description?:   string;
  date:           string;
  startTime:      string;
  endTime:        string;
  status?:        'actief' | 'geannuleerd' | 'volzet' | 'concept';
  locationId?:    string;
  capacity:       number;
}

export interface UpdateSessionDTO {
  title?:         string;
  description?:   string;
  date?:          string;
  startTime?:     string;
  endTime?:       string;
  status?:        'actief' | 'geannuleerd' | 'volzet' | 'concept';
  locationId?:    string;
  capacity?:      number;
}