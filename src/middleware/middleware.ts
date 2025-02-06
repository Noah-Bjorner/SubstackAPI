import { Context } from "hono";
import { validateRateLimit } from "./rateLimit";
import { validateApiKey } from "./apiKey";
import { handleEndpointError } from "../utils/errors";
import { AppBindings } from "../index";

export const middleware = () => {
    return async (c: Context<AppBindings>, next: () => Promise<void>) => {
        try {
            const apiKeyInformation = await validateApiKey(c);
            await validateRateLimit(c, apiKeyInformation.rateLimitConfig);
            c.set('allowedPublication', apiKeyInformation.allowedPublication);
            await next();
        } catch (error) {
            const {message, statusCode, headers } = handleEndpointError(error)
            console.error({event: 'middleware_denied', error: message, errorCode: statusCode})
            return c.json({error: message}, statusCode, headers)
        }
    };
};
