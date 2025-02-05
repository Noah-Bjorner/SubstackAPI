import { Hono } from 'hono';
import { handleEndpointError } from '../../utils/errors';
import { getNewApiKey } from './service';
import { AppBindings } from '../../index';

const apiKeyRoutes = new Hono<AppBindings>();

// 3 per day rate limit + use public api key

apiKeyRoutes.get('/generate', async (c) => {
	const LOG_IDENTIFIER = 'generate_api_key_endpoint'
	try {
		const { email, accessible_site } = c.req.query()
		const apiKey = await getNewApiKey(c.env, email, accessible_site)
        console.log({event: LOG_IDENTIFIER, status: 'success', issuedTo: apiKey.metadata.issuedTo})
        return c.text(apiKey.key)
	} catch (error) {
		const {message, statusCode} = handleEndpointError(error)
        console.error({event: LOG_IDENTIFIER, status: 'failed', error: message, errorCode: statusCode})
		return c.json({error: message}, statusCode)
	}
})

apiKeyRoutes.get('/accessible_site', async (c) => {
	const accessibleSite = c.get('accessibleSite')
    return c.json({message: `Accessible site: ${accessibleSite}`})
})


export default apiKeyRoutes