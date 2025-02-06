import { Redis } from "@upstash/redis/cloudflare";
import { Ratelimit } from "@upstash/ratelimit";
import { Context } from "hono";
import { getErrorMessage, HTTPError } from "../utils/errors";
import { getClosestRateLimitDatabase } from "../utils/location";
import { AppBindings } from "../index";

export enum REDIS_RATE_LIMIT_DATABASES {
    VIRGINIA = 'Virginia',
    CALIFORNIA = 'California',
    GERMANY = 'Germany',
    JAPAN = 'Japan',
    AUSTRALIA = 'Australia',
    BRAZIL = 'Brazil',
    INDIA = 'India',
    SINGAPORE = 'Singapore'
}

const getRedisDatabaseConfig = (env: Env, database: REDIS_RATE_LIMIT_DATABASES) => {
    switch (database) {
        case REDIS_RATE_LIMIT_DATABASES.VIRGINIA:
            return {
                url: env.UPSTASH_REDIS_RATE_LIMIT_VIRGINIA_REST_URL,
                token: env.UPSTASH_REDIS_RATE_LIMIT_VIRGINIA_REST_TOKEN
            }
        case REDIS_RATE_LIMIT_DATABASES.CALIFORNIA:
            return {
                url: env.UPSTASH_REDIS_RATE_LIMIT_CALIFORNIA_REST_URL,
                token: env.UPSTASH_REDIS_RATE_LIMIT_CALIFORNIA_REST_TOKEN
            }
        case REDIS_RATE_LIMIT_DATABASES.GERMANY:
            return {
                url: env.UPSTASH_REDIS_RATE_LIMIT_GERMANY_REST_URL,
                token: env.UPSTASH_REDIS_RATE_LIMIT_GERMANY_REST_TOKEN
            }
        case REDIS_RATE_LIMIT_DATABASES.AUSTRALIA: 
            return {
                url: env.UPSTASH_REDIS_RATE_LIMIT_AUSTRALIA_REST_URL,
                token: env.UPSTASH_REDIS_RATE_LIMIT_AUSTRALIA_REST_TOKEN
            }
        case REDIS_RATE_LIMIT_DATABASES.BRAZIL:
            return {
                url: env.UPSTASH_REDIS_RATE_LIMIT_BRAZIL_REST_URL,
                token: env.UPSTASH_REDIS_RATE_LIMIT_BRAZIL_REST_TOKEN
            }
        case REDIS_RATE_LIMIT_DATABASES.JAPAN:
            return {
                url: env.UPSTASH_REDIS_RATE_LIMIT_JAPAN_REST_URL,
                token: env.UPSTASH_REDIS_RATE_LIMIT_JAPAN_REST_TOKEN
            }
        case REDIS_RATE_LIMIT_DATABASES.INDIA:
            return {
                url: env.UPSTASH_REDIS_RATE_LIMIT_INDIA_REST_URL,
                token: env.UPSTASH_REDIS_RATE_LIMIT_INDIA_REST_TOKEN
            }
        case REDIS_RATE_LIMIT_DATABASES.SINGAPORE:
            return {
                url: env.UPSTASH_REDIS_RATE_LIMIT_SINGAPORE_REST_URL,
                token: env.UPSTASH_REDIS_RATE_LIMIT_SINGAPORE_REST_TOKEN
            }
        default:
            return {
                url: env.UPSTASH_REDIS_RATE_LIMIT_VIRGINIA_REST_URL,
                token: env.UPSTASH_REDIS_RATE_LIMIT_VIRGINIA_REST_TOKEN
            }
    }
};




export interface RateLimitConfig {
    requests: number;  // Number of requests allowed
    window: number;    // Time window in seconds
}

const cache = new Map();

export async function checkRateLimit(c: Context<AppBindings>, config: RateLimitConfig = { requests: 10, window: 60 }) {
    const ip = c.req.header('cf-connecting-ip');

    if (!ip) {
        throw new HTTPError('IP address not found', 400);
    }
    
    const cfData = (c.req.raw as Request & { cf: { timezone: string, country: string } }).cf;
    const timezone = cfData?.timezone || 'America/New_York';
    const country = cfData?.country || 'US';
    const redisDatabase = getClosestRateLimitDatabase(timezone, country);
    
    const redisConfig = getRedisDatabaseConfig(c.env, redisDatabase);
    const redis = new Redis({
        url: redisConfig.url,
        token: redisConfig.token,
    });

    const ratelimit = new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(config.requests, `${config.window}s`),
        analytics: false,
        prefix: "ratelimit",
        ephemeralCache: cache,
    });

    const { success, limit, remaining, reset } = await ratelimit.limit(ip);
    
    c.header('X-RateLimit-Limit', limit.toString());
    c.header('X-RateLimit-Remaining', remaining.toString());
    c.header('X-RateLimit-Reset', reset.toString());
    c.header('X-RateLimit-Database', redisDatabase);

    if (!success) {
        throw new HTTPError('Rate limit exceeded', 429, {
            'Retry-After': reset.toString(),
            'X-RateLimit-Policy': `${config.requests} requests per ${config.window}s`,
        });
    }
}