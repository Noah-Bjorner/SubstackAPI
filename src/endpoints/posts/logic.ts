import { Context } from 'hono';
import { AppBindings } from '../../index';
import { JSONSuccessResponse, SubstackPost } from '../../types'
import {
    getSubstackPostsViaAPI,
    getSubstackPostViaAPI,
    getSubstackPostsViaRSS,
    getSubstackPostViaRSS
} from '../../services/substack'
import { getFromCache, storeInCache } from '../../services/cache'
import { getErrorMessage, HTTPError } from '../../utils/errors';
import { validateSubstackSlug, validateSubstackPublicationURL } from '../../utils/helper';
import { searchPosts } from '../../services/search';



export async function getSearchedPosts(c: Context<AppBindings>, publicationURL: string, query: string, limit: number, offset: number) {
    
    if (!hasAccessToPublication(c, publicationURL)) {
        throw new HTTPError('API key does not have access to this substack publication.', 403)
    }

    const validatedPublicationURL = validateSubstackPublicationURL(publicationURL)
    if (!validatedPublicationURL) {
        throw new HTTPError('Invalid publication url', 400)
    }
    
    if (query.length < 2) {
        throw new HTTPError('Query must be at least 2 characters long', 400)
    }
    
    const env = c.env
    const ctx = c.executionCtx as ExecutionContext
    
    const {posts, source: postsSource} = await getAllPosts(validatedPublicationURL, env, ctx)
    const searchedPosts = searchPosts(posts, query)
    const sortedPosts = sortPosts(searchedPosts, 'search', limit, offset)
    const response = createPostsListResponse(sortedPosts, postsSource, validatedPublicationURL, limit, offset)
    return response
}





export async function getPosts(c: Context<AppBindings>, publicationURL: string, sort: 'new' | 'top', limit: number, offset: number): Promise<JSONSuccessResponse<SubstackPost[]>>  {
    if (!hasAccessToPublication(c, publicationURL)) {
        throw new HTTPError('API key does not have access to this substack publication.', 403)
    }

    const validatedPublicationURL = validateSubstackPublicationURL(publicationURL)
    if (!validatedPublicationURL) {
        throw new HTTPError('Invalid publication url', 400)
    }

    const env = c.env
    const ctx = c.executionCtx as ExecutionContext

    const cacheKey = `results:${validatedPublicationURL}:posts:${sort}-${limit}-${offset}`
    const cachedResults = await getFromCache(cacheKey, env) as SubstackPost[]
    if (cachedResults) {
        const response = createPostsListResponse(cachedResults, 'cache', validatedPublicationURL, limit, offset)
        return response
    }

    const {posts, source: postsSource} = await getAllPosts(validatedPublicationURL, env, ctx)

    const sortedPosts = sortPosts(posts, sort, limit, offset)
    if (!sortedPosts) {
        throw new HTTPError(`Posts not found for "${validatedPublicationURL}" after trying cache`, 404)
    }

    tryStoreInCache(cacheKey, sortedPosts, env, sort === 'new' ? '12h' : '7d', ctx)
    const response = createPostsListResponse(sortedPosts, postsSource, validatedPublicationURL, limit, offset)
    return response
    
}





export async function getPost(c: Context<AppBindings>, publicationURL: string, slug: string): Promise<JSONSuccessResponse<SubstackPost>> {
    
    if (!hasAccessToPublication(c, publicationURL)) {
        throw new HTTPError('API key does not have access to this substack publication.', 403)
    }

    const validatedPublicationURL = validateSubstackPublicationURL(publicationURL)
    const validatedSlug = validateSubstackSlug(slug)

    if (!validatedPublicationURL || !validatedSlug) {
        throw new HTTPError('Invalid parameters.', 400)
    }

    const env = c.env
    const ctx = c.executionCtx as ExecutionContext

    const cacheKey = `results:${validatedPublicationURL}:post:${validatedSlug}`
    const cachedResult = await getFromCache(cacheKey, env) as SubstackPost
    if (cachedResult) {
        return createPostResponse(cachedResult, 'cache', validatedPublicationURL)
    }

    const apiPost = await getSubstackPostViaAPI(validatedPublicationURL, validatedSlug)
    if (apiPost) {
        tryStoreInCache(cacheKey, apiPost, env, '7d', ctx)
        return createPostResponse(apiPost, 'api', validatedPublicationURL)
    }

    const rssPost = await getSubstackPostViaRSS(validatedPublicationURL, validatedSlug)
    if (rssPost) {
        tryStoreInCache(cacheKey, rssPost, env, '7d', ctx)
        return createPostResponse(rssPost, 'rss', validatedPublicationURL)
    }

    throw new HTTPError(`Post not found for "${validatedPublicationURL}" with slug "${validatedSlug}" after trying cache, API, and RSS`, 404)
}









// HELPER FUNCTIONS

function hasAccessToPublication(c: Context<AppBindings>, publicationURL: string): boolean {
    const allowedPublication = c.get('allowedPublication')
    if (allowedPublication === '*') {
        return true
    }
    const validatedAllowedPublication = validateSubstackPublicationURL(allowedPublication || '')
    if (!validatedAllowedPublication) {
        return false
    }
    const validatedProvidedPublicationURL = validateSubstackPublicationURL(publicationURL)
    if (!validatedProvidedPublicationURL) {
        return false
    }
    return validatedAllowedPublication === validatedProvidedPublicationURL
}   

function tryStoreInCache(
    cacheKey: string,
    cacheValue: any,
    env: Env,
    expiration: '12h' | '1d' | '7d',
    ctx: ExecutionContext
){
    const expirationSeconds = {
        '12h':  43200,
        '1d':   86400,
        '7d':   604800
    }[expiration]

    try {
        ctx.waitUntil(
            storeInCache(cacheKey, cacheValue, env, expirationSeconds, true)
            .catch(error => console.error({event: 'try_store_in_cache_failed', error: getErrorMessage(error)}))
        )        
    } catch (error) {
        console.error({event: 'try_store_in_cache_failed', error: getErrorMessage(error)})
    }
}

function createPostResponse(
    data: SubstackPost,
    source: 'cache' | 'api' | 'rss',
    publicationURL: string
) : JSONSuccessResponse<SubstackPost> {
    return {
        data,
        metadata: {
            timestamp: Date.now(),
            source,
            publication_url: publicationURL
        }
    }
}

function createPostsListResponse(
    data: SubstackPost[],
    source: 'cache' | 'api' | 'rss',
    publicationURL: string,
    limit: number,
    offset: number
) : JSONSuccessResponse<SubstackPost[]> {
    return {
        data,
        metadata: {
            timestamp: Date.now(),
            source,
            publication_url: publicationURL,
            posts_count: data.length,
            offset,
            limit
        }
    }
}

async function getAllPosts(
    publicationURL: string,
    env: Env,
    ctx: ExecutionContext
) : Promise<{posts: SubstackPost[], source: 'cache' | 'api' | 'rss'}> {

    const cacheKey = `posts:${publicationURL}:all`
    const cachedResults = await getFromCache(cacheKey, env) as SubstackPost[]
    if (cachedResults) {
        return {posts: cachedResults, source: 'cache'}
    }

    const apiPosts = await getSubstackPostsViaAPI(publicationURL, 'top', 0, 50)
    if (apiPosts) {
        tryStoreInCache(cacheKey, apiPosts, env, '1d', ctx)
        return {posts: apiPosts, source: 'api'} 
    }

    const rssPosts = await getSubstackPostsViaRSS(publicationURL)
    if (rssPosts) {
        tryStoreInCache(cacheKey, rssPosts, env, '1d', ctx)
        return {posts: rssPosts, source: 'rss'}
    }

    throw new HTTPError(`Posts not found for "${publicationURL}" after trying cache, API, and RSS`, 404)
}


function sortPosts(posts: SubstackPost[], sort: 'new' | 'top' | 'search', limit: number, offset: number): SubstackPost[] {
    if (sort === 'new') {
        return posts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(offset, offset + limit)
    } else if (sort === 'top') {
        return posts.sort((a, b) => b.likes - a.likes).slice(offset, offset + limit)
    } else if (sort === 'search') {
        return posts.slice(offset, offset + limit)
    } else {
        throw new HTTPError('Invalid sort parameter', 400)
    }
}