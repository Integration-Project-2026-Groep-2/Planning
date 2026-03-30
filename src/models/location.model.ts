export interface Location {
  locationId: string;
  roomName:   string;
  address?:   string;
  capacity:   number;
  status:     'beschikbaar' | 'gereserveerd' | 'niet beschikbaar';
}

export interface CreateLocationDTO {
  roomName:  string;
  address?:  string;
  capacity:  number;
  status?:   'beschikbaar' | 'gereserveerd' | 'niet beschikbaar';
}

export interface UpdateLocationDTO {
  roomName?: string;
  address?:  string;
  capacity?: number;
  status?:   'beschikbaar' | 'gereserveerd' | 'niet beschikbaar';
}
