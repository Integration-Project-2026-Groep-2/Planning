export interface Registration {
    registrationId: string;
    sessionId: string;
    userId: string;
    isActive: boolean;
    registrationTime: string;
}

export interface RegisterParticipantDTO {
    userId: string;
    isActive: boolean;
}

export interface CancelRegistrationDTO {
    userId: string;
}
