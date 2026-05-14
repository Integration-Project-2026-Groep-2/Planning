export interface Registration {
    registrationId: string;
    sessionId: string;
    participantId: string;
    crmMasterId?: string;
    isActive: boolean;
    registrationTime: string;
}

export interface RegisterParticipantDTO {
    participantId: string;
    crmMasterId?: string;
    isActive: boolean;
}

export interface CancelRegistrationDTO {
    participantId: string;
}
