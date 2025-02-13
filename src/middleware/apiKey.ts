import { Context } from "hono";
import { HTTPError } from '../utils/errors';
import { getFromCache } from '../services/cache';
import { getKey, ApiKeyMetadata } from '../endpoints/apiKey/logic';
import { RateLimitConfig } from './rateLimit';
import { AppBindings } from '../index';
import { validateSubstackPublicationURL } from '../utils/helper';
interface ApiKeyInformation {
    apiKey: string;
    rateLimitConfig: RateLimitConfig;
}

export async function validateApiKey(c: Context<AppBindings>): Promise<ApiKeyInformation> {
    const apiKey = c.req.header('x-api-key');
    
    if (!apiKey) {
        throw new HTTPError('Missing API key', 401);
    }

    if (!apiKey.startsWith('sk_')) {
        throw new HTTPError('Invalid API key format', 401);
    }

    const path = c.req.path;
    const rateLimitConfig = getRateLimitConfig(path, apiKey);

    return {
        apiKey,
        rateLimitConfig
    }
}



export async function checkApiKey(c: Context<AppBindings>, apiKey: string): Promise<string> {

    const cacheKey = getKey(apiKey)
    const result = await getFromCache(cacheKey, c.env, false) as ApiKeyMetadata | null;

    if (!result) {
        throw new HTTPError(`Invalid API key (${apiKey})`, 401);
    }

    if (result.status === 'inactive') {
        throw new HTTPError(`Inactive API key (${apiKey})`, 403);
    }

    const allowedPublication = validateSubstackPublicationURL(result.allowedPublication);
    if (!allowedPublication) {
        throw new HTTPError(`API key does not have a valid allowed publication`, 403);
    }

    c.header('X-API-Key-Created-At', result.createdAt);
    c.header('X-API-Key-Status', result.status);
    c.header('X-API-Key-Allowed-Publication', allowedPublication);

    return allowedPublication  
}




export enum ALL_POSSIBLE_PATHS {
    POSTS_LATEST = '/posts/latest',
    POSTS_TOP = '/posts/top',
    POSTS_SEARCH = '/posts/search',
    POST = '/post',
    API_KEY_GENERATE = '/api_key/generate',
    API_KEY_VALIDATE = '/api_key/validate',
}

function getRateLimitConfig(path: string, apiKey: string): RateLimitConfig {
    const isLiveKey = apiKey.startsWith('sk_live')
    const fallbackRateLimitConfig = { requests: 3, window: 60 }; // 3 requests per minute
    switch (path) {
        case ALL_POSSIBLE_PATHS.POSTS_LATEST:
            return isLiveKey ? { requests: 10, window: 60 } : fallbackRateLimitConfig; // 10 requests per minute
        case ALL_POSSIBLE_PATHS.POSTS_TOP:
            return isLiveKey ? { requests: 10, window: 60 } : fallbackRateLimitConfig; // 10 requests per minute
        case ALL_POSSIBLE_PATHS.POSTS_SEARCH:
            return isLiveKey ? { requests: 20, window: 60 } : fallbackRateLimitConfig; // 20 requests per minute
        case ALL_POSSIBLE_PATHS.POST:
            return isLiveKey ? { requests: 15, window: 60 } : fallbackRateLimitConfig; // 15 requests per minute
        case ALL_POSSIBLE_PATHS.API_KEY_GENERATE:
            return { requests: 3, window: 86400 }; // 3 requests per day
        case ALL_POSSIBLE_PATHS.API_KEY_VALIDATE:
            return isLiveKey ? { requests: 5, window: 60 } : fallbackRateLimitConfig; // 5 request per minute
        default:
            return fallbackRateLimitConfig;
    }
}