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
    blobUrl: string;
    timestamp: number;
}