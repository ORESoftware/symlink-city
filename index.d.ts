export interface SCResult {
    cpExitCode: number;
    originalPath: string;
    stderr: string;
    linkPath: string;
    isSymbolicLink: boolean;
    isDirectory: boolean;
}
