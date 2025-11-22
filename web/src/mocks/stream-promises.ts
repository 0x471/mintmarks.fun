// Mock for stream/promises to satisfy Vite build
export const pipeline = async (..._streams: any[]) => { };
export const finished = async (_stream: any) => { };

export default {
    pipeline,
    finished,
};
