import { Hono } from 'hono';
import { handleEndpointError } from '../../utils/errors';
import { getSearchedPosts, getPosts, getPost } from './service';
import { AppBindings } from '../../index';

const postsRoutes = new Hono<AppBindings>();

postsRoutes.get('/posts/search', async (c) => {
	const LOG_IDENTIFIER = 'search_posts_endpoint'
	try {
		const {substack_url, query} = c.req.query()
		const posts = await getSearchedPosts(substack_url, query, c.env, c.executionCtx as ExecutionContext)
		console.log({event: LOG_IDENTIFIER, status: 'succeeded', source: posts.metadata.source, substack_url: posts.metadata.substack_url, posts_count: posts.data.length})
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
		const {substack_url} = c.req.query()
		const posts = await getPosts(substack_url, 'top', c.env, c.executionCtx as ExecutionContext)
		console.log({event: LOG_IDENTIFIER, status: 'succeeded', source: posts.metadata.source, substack_url: posts.metadata.substack_url, posts_count: posts.data.length})
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
		const {substack_url} = c.req.query()
		const posts = await getPosts(substack_url, 'new', c.env, c.executionCtx as ExecutionContext)
		console.log({event: LOG_IDENTIFIER, status: 'succeeded', source: posts.metadata.source, substack_url: posts.metadata.substack_url, posts_count: posts.data.length})
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
		const {substack_url, slug} = c.req.query()
		const post = await getPost(substack_url, slug, c.env,c.executionCtx as ExecutionContext)
		console.log({event: LOG_IDENTIFIER, status: 'succeeded', source: post.metadata.source, substack_url: post.metadata.substack_url})
		return c.json(post)
	} catch (error) {
		const {message, statusCode} = handleEndpointError(error)
		console.error({event: LOG_IDENTIFIER, status: 'failed', error: message, errorCode: statusCode})
		return c.json({error: message}, statusCode)
	}
})

export default postsRoutes