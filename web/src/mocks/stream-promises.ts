// Mock for stream/promises to satisfy Vite build
export const pipeline = async (..._streams: unknown[]) => { };
export const finished = async (_stream: unknown) => { };

export default {
    pipeline,
    finished,
};
