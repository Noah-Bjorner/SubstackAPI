import { Hono } from 'hono';
import { handleEndpointError } from '../../utils/errors';
import { getNewApiKey } from './logic';
import { AppBindings } from '../../index';

const apiKeyRoutes = new Hono<AppBindings>();

apiKeyRoutes.post('/generate', async (c) => {
	const LOG_IDENTIFIER = 'generate_api_key_endpoint'
	try {
		const { email, allowed_publication } = await c.req.json()
		const apiKey = await getNewApiKey(c.env, email, allowed_publication)
        console.log({event: LOG_IDENTIFIER, status: 'succeeded', issuedTo: apiKey.metadata.issuedTo})
        return c.text(apiKey.key)
	} catch (error) {
		const {message, statusCode} = handleEndpointError(error)
        console.error({event: LOG_IDENTIFIER, status: 'failed', error: message, errorCode: statusCode})
		return c.json({code: statusCode, message: message}, statusCode)
	}
})

apiKeyRoutes.get('/validate', async (c) => {
	return c.json({message: 'API key validated. Check the headers for the API key information.'})
})


export default apiKeyRoutes