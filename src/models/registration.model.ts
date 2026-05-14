export interface Registration {
    registrationId: string;
    sessionId: string;
    userId: string;
    crmMasterId?: string;
    isActive: boolean;
    registrationTime: string;
}

export interface RegisterParticipantDTO {
    userId: string;
    crmMasterId?: string;
    isActive: boolean;
}

export interface CancelRegistrationDTO {
    userId: string;
}
