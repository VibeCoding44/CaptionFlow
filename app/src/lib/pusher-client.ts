import PusherClient from "pusher-js";

let pusherClient: PusherClient | null = null;

export function getPusherClient(): PusherClient {
    if (!pusherClient) {
        pusherClient = new PusherClient(
            process.env.NEXT_PUBLIC_PUSHER_KEY!,
            {
                cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
            }
        );
    }
    return pusherClient;
}

// Channel naming convention
export function getSessionChannel(sessionId: string) {
    return `session-${sessionId}`;
}

// Event types
export const CAPTION_EVENT = "caption-update";
export const STATUS_EVENT = "status-update";
