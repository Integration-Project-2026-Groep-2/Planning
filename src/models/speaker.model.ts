export interface Speaker {
  speakerId:   string;
  crmMasterId?: string;
  firstName:   string;
  lastName:    string;
  email:       string;
  phoneNumber?: string;
  companyId?:    string;
  isActive:    boolean;
}

export interface CreateSpeakerDTO {
  firstName:    string;
  lastName:     string;
  email:        string;
  phoneNumber?: string;
  companyId?:     string;
}

export interface UpdateSpeakerDTO {
  firstName?:   string;
  lastName?:    string;
  email?:       string;
  phoneNumber?: string;
  companyId?:     string;
}
