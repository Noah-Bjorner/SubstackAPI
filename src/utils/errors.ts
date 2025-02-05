import type { ContentfulStatusCode } from 'hono/utils/http-status'

export class HTTPError extends Error {
    constructor(
        public message: string,
        public statusCode: ContentfulStatusCode,
        public headers?: Record<string, string>
    ) {
        super(message);
        this.name = 'HTTPError';
    }
}


export function getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    if (typeof error === 'string') {
      return error;
    }
    if (error && typeof error === 'object' && 'message' in error) {
      return String(error.message);
    }
    return String(error);
}


export function handleEndpointError(error: unknown): {message: string, statusCode: ContentfulStatusCode, headers?: Record<string, string>} {
    const isHTTPError = error instanceof HTTPError
    const message = isHTTPError ? error.message : getErrorMessage(error)
    const statusCode: ContentfulStatusCode = isHTTPError ? error.statusCode : 500
    return {message, statusCode, headers: isHTTPError ? error.headers : undefined}
}