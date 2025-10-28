export interface Pixel {
    x: number;
    y: number;
    color: string;
}

export interface PixelUpdateEvent {
    event_id: string;
    x: number;
    y: number;
    color: string;
    ts: number;
    user_id?: string;
}

export interface Snapshot {
    id: number;
    url: string;
    // Timestamp of the last update in the snapshot
    createdAt: number;
}