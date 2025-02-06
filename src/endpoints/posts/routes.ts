import { Hono } from 'hono';
import { handleEndpointError } from '../../utils/errors';
import { getSearchedPosts, getPosts, getPost } from './service';
import { AppBindings } from '../../index';

const postsRoutes = new Hono<AppBindings>();

postsRoutes.get('/posts/search', async (c) => {
	const LOG_IDENTIFIER = 'search_posts_endpoint'
	try {
		const { publication_url, query } = c.req.query()
		const posts = await getSearchedPosts(c, publication_url, query)
		console.log({event: LOG_IDENTIFIER, status: 'succeeded', source: posts.metadata.source, publication_url: posts.metadata.publication_url, posts_count: posts.data.length})
		return c.json(posts)
	} catch (error) {
		const {message, statusCode} = handleEndpointError(error)
		console.error({event: LOG_IDENTIFIER, status: 'failed', error: message, errorCode: statusCode})
		return c.json({error: message}, statusCode)
	}
})

postsRoutes.get('/posts/top', async (c) => {
	const LOG_IDENTIFIER = 'top_posts_endpoint'
	try {
		const { publication_url } = c.req.query()
		const posts = await getPosts(c,publication_url, 'top')
		console.log({event: LOG_IDENTIFIER, status: 'succeeded', source: posts.metadata.source, publication_url: posts.metadata.publication_url, posts_count: posts.data.length})
		return c.json(posts)
	} catch (error) {
		const {message, statusCode} = handleEndpointError(error)
		console.error({event: LOG_IDENTIFIER, status: 'failed', error: message, errorCode: statusCode})
		return c.json({error: message}, statusCode)
	}
})

postsRoutes.get('/posts/latest', async (c) => {
	const LOG_IDENTIFIER = 'latest_posts_endpoint'
	try {
		const { publication_url } = c.req.query()
		const posts = await getPosts(c, publication_url, 'new')
		console.log({event: LOG_IDENTIFIER, status: 'succeeded', source: posts.metadata.source, publication_url: posts.metadata.publication_url, posts_count: posts.data.length})
		return c.json(posts)
	} catch (error) {
		const {message, statusCode} = handleEndpointError(error)
		console.error({event: LOG_IDENTIFIER, status: 'failed', error: message, errorCode: statusCode})
		return c.json({error: message}, statusCode)
	}
})


postsRoutes.get('/post', async (c) => {
	const LOG_IDENTIFIER = 'post_endpoint'
	try {
		const { publication_url, slug } = c.req.query()
		const post = await getPost(c, publication_url, slug)
		console.log({event: LOG_IDENTIFIER, status: 'succeeded', source: post.metadata.source, publication_url: post.metadata.publication_url})
		return c.json(post)
	} catch (error) {
		const {message, statusCode} = handleEndpointError(error)
		console.error({event: LOG_IDENTIFIER, status: 'failed', error: message, errorCode: statusCode})
		return c.json({error: message}, statusCode)
	}
})

export default postsRoutes