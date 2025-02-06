import { Context } from "hono";
import { checkRateLimit } from "./rateLimit";
import { checkApiKey, validateApiKey } from "./apiKey";
import { handleEndpointError } from "../utils/errors";
import { AppBindings } from "../index";


//does rate limit work?

export const middleware = () => {
    return async (c: Context<AppBindings>, next: () => Promise<void>) => {
        try {
            const { apiKey, rateLimitConfig } = await validateApiKey(c);
            const [allowedPublication, _] = await Promise.all([
                checkApiKey(c, apiKey),
                checkRateLimit(c, rateLimitConfig)
            ]);
            c.set('allowedPublication', allowedPublication);
            await next();
        } catch (error) {
            const {message, statusCode, headers } = handleEndpointError(error)
            console.error({event: 'middleware_denied', error: message, errorCode: statusCode})
            return c.json({error: message}, statusCode, headers)
        }
    };
};
