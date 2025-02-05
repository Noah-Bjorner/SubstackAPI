import { Context } from "hono";
import { HTTPError } from '../utils/errors';
import { getFromCache } from '../services/cache';
import { getKey, ApiKeyMetadata } from '../endpoints/apiKey/service';
import { RateLimitConfig } from './rateLimit';
import { AppBindings } from '../index';

interface ApiKeyInformation {
    rateLimitConfig: RateLimitConfig;
    accessibleSite: string;
}

export async function validateApiKey(c: Context<AppBindings>): Promise<ApiKeyInformation> {
    const apiKey = c.req.header('x-api-key');
    
    if (!apiKey) {
        throw new HTTPError('Missing API key', 401);
    }

    if (!apiKey.startsWith('sk_')) {
        throw new HTTPError('Invalid API key format', 401);
    }

    const cacheKey = getKey(apiKey)
    const result = await getFromCache(cacheKey, c.env, false) as ApiKeyMetadata | null;

    if (!result) {
        throw new HTTPError('Invalid API key', 401);
    }

    if (result.status === 'inactive') {
        throw new HTTPError('Inactive API key', 403);
    }

    const accessibleSite = result.accessibleSite;
    if (!accessibleSite) {
        throw new HTTPError('Inactive API key', 403);
    }

    c.header('X-API-Key-Created-At', result.createdAt);
    c.header('X-API-Key-Status', result.status);
    c.header('X-API-Key-Accessible-Site', accessibleSite);

    const path = c.req.path;
    const rateLimitConfig = getRateLimitConfig(path, apiKey);

    return {
        rateLimitConfig,
        accessibleSite
    }

}



export enum ALL_POSSIBLE_PATHS {
    POSTS_LATEST = '/posts/latest',
    POSTS_TOP = '/posts/top',
    POSTS_SEARCH = '/posts/search',
    POST = '/post',
    API_KEY_GENERATE = '/api_key/generate',
}

function getRateLimitConfig(path: string, apiKey: string): RateLimitConfig {
    if (apiKey.startsWith('sk_live')) {
        switch (path) {
            case ALL_POSSIBLE_PATHS.POSTS_LATEST:
                return { requests: 10, window: 60 }; // 10 requests per minute
            case ALL_POSSIBLE_PATHS.POSTS_TOP:
                return { requests: 10, window: 60 }; // 10 requests per minute
            case ALL_POSSIBLE_PATHS.POSTS_SEARCH:
                return { requests: 20, window: 60 }; // 20 requests per minute
            case ALL_POSSIBLE_PATHS.POST:
                return { requests: 15, window: 60 }; // 15 requests per minute
            case ALL_POSSIBLE_PATHS.API_KEY_GENERATE:
                return { requests: 3, window: 86400 }; // 3 requests per day
        }
    }

    return { requests: 3, window: 60 }; // 3 requests per minute
}