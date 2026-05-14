export interface Location {
    locationId: string;
    roomName: string;
    address?: string;
    capacity: number;
    status: "beschikbaar" | "gereserveerd" | "niet beschikbaar";
}

export interface CreateLocationDTO {
    locationId?: string;
    roomName: string;
    address?: string;
    capacity: number;
    status?: "beschikbaar" | "gereserveerd" | "niet beschikbaar";
    validated?: boolean;
}

export interface UpdateLocationDTO {
    roomName?: string;
    address?: string;
    capacity?: number;
    status?: "beschikbaar" | "gereserveerd" | "niet beschikbaar";
}
