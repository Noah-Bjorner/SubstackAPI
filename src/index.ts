import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { middleware } from './middleware/middleware';

import apiKeyRoutes from './endpoints/apiKey/routes';
import postsRoutes from './endpoints/posts/routes';

export interface AppBindings {
    Bindings: Env;
    Variables: {
        allowedPublication?: string;
    }
}
const app = new Hono<AppBindings>();

app.use('/*', cors({
	origin: '*',
	allowMethods: ['GET', 'POST'],
	allowHeaders: ['Content-Type'],
	exposeHeaders: [
		'Content-Type', 
		'X-Cache-Status', 
		'X-RateLimit-Limit', 
		'X-RateLimit-Remaining', 
		'X-RateLimit-Reset', 
		'X-RateLimit-Database',
		'X-RateLimit-Policy',
		'Retry-After',
		'X-API-Key-Created-At',
		'X-API-Key-Status',
		'X-API-Key-Allowed-Publication',
	],
	credentials: false,
}));

app.use('/*', middleware());
app.route('/api_key', apiKeyRoutes);
app.route('/', postsRoutes);

export default app