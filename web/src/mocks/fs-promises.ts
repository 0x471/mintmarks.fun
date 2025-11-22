// Mock for fs/promises to satisfy Vite build
export const readFile = async () => '';
export const writeFile = async () => { };
export const unlink = async () => { };
export const readdir = async () => [];
export const stat = async () => ({});
export const access = async () => { };
export const mkdir = async () => { };
export const rmdir = async () => { };
export default {
    readFile,
    writeFile,
    unlink,
    readdir,
    stat,
    access,
    mkdir,
    rmdir,
};
