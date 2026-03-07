export type Role = 'owner' | 'admin' | 'operator' | 'viewer';

export interface User {
    id: string; // Firebase Auth UID
    name: string | null;
    email: string | null;
    photoURL: string | null;
    createdAt: number; // Timestamp
}

export interface TranscriptionSettings {
    keywords: string[];          // Custom keywords for Deepgram boosting
    profanityFilter: boolean;    // Deepgram profanity_filter param
    punctuation: boolean;        // Deepgram punctuate param
}

export interface Organization {
    id: string;
    name: string;
    slug?: string;
    createdAt: number;
    settings: {
        defaultSourceLanguage: string;
        defaultTargetLanguages: string[];
    };
    transcriptionSettings?: TranscriptionSettings;
}

export interface OrganizationMember {
    id: string; // Document ID
    userId: string;
    organizationId: string;
    role: Role;
    joinedAt: number;
    user?: User;
}

export type SessionStatus = 'scheduled' | 'live' | 'completed';

export interface Session {
    id: string;
    organizationId: string;
    name: string;
    status: SessionStatus;
    startTime: number | null;
    endTime: number | null;
    sourceLanguage: string;
    targetLanguages: string[];
    createdAt: number;
    createdBy: string; // User ID
}

export interface TranscriptLine {
    id?: string;
    sessionId: string;
    text: string;
    translations: Record<string, string>;
    timestamp: number;
}

export type DisplayType = 'propresenter' | 'obs' | 'qr' | 'stage';

export interface Display {
    id: string;
    organizationId: string;
    name: string;
    type: DisplayType;
    customSettings: {
        fontSize: number;
        fontFamily: string;
        textColor: string;
        backgroundColor: string; // Supports transparency/rgba
        alignment: 'left' | 'center' | 'right';
    };
    createdAt: number;
}
