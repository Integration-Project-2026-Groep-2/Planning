export interface Session {
    sessionId: string;
    title: string;
    description?: string;
    date: string;
    startTime: string;
    endTime: string;
    status: "actief" | "geannuleerd" | "volzet" | "concept";
    locationId?: string;
    capacity: number;
    syncStatus: "synced" | "pending" | "failed";
    outlookEventId?: string;
}

export interface CreateSessionDTO {
    sessionId?: string;
    title: string;
    description?: string;
    date: string;
    startTime: string;
    endTime: string;
    status?: "actief" | "geannuleerd" | "volzet" | "concept";
    locationId?: string;
    capacity: number;
    validated?: boolean;
}

export interface UpdateSessionDTO {
    title?: string;
    description?: string;
    date?: string;
    startTime?: string;
    endTime?: string;
    status?: "actief" | "geannuleerd" | "volzet" | "concept";
    locationId?: string;
    capacity?: number;
    speakerId?: string;
}
export interface RescheduleSessionDTO {
    date: string;
    startTime: string;
    endTime: string;
    reason: string;
}
