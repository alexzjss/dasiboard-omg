export declare class AppError extends Error {
    readonly statusCode: number;
    readonly code?: string | undefined;
    constructor(statusCode: number, message: string, code?: string | undefined);
}
export declare const Errors: {
    badRequest: (msg?: string, code?: string) => AppError;
    unauthorized: (msg?: string) => AppError;
    forbidden: (msg?: string) => AppError;
    notFound: (resource?: string) => AppError;
    conflict: (msg: string) => AppError;
    internal: (msg?: string) => AppError;
};
//# sourceMappingURL=errors.d.ts.map