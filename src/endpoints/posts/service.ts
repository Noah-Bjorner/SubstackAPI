import { JSONSuccessResponse, SubstackPost } from '../../types'
import {
    getSubstackPostsViaAPI,
    getSubstackPostViaAPI,
    getSubstackPostsViaRSS,
    getSubstackPostViaRSS
} from '../../services/substack'
import { getFromCache, storeInCache } from '../../services/cache'
import { getErrorMessage, HTTPError } from '../../utils/errors';
import { validateSubstackSlug, validateSubstackUrl } from '../../utils/helper';
import { searchPosts } from '../../services/search';



export async function getSearchedPosts(substackUrl: string, query: string, env: Env, ctx: ExecutionContext) {
    try {
        const validatedSubstackUrl = validateSubstackUrl(substackUrl)
        if (!validatedSubstackUrl) {
            throw new HTTPError('Invalid substack url', 400)
        }
        if (query.length < 2) {
            throw new HTTPError('Query must be at least 2 characters long', 400)
        }
        const {posts, source: postsSource} = await getAllPosts(validatedSubstackUrl, env, ctx)
        const searchedPosts = searchPosts(posts, query)
        const response = createPostsListResponse(searchedPosts, postsSource, validatedSubstackUrl)
        return response
    } catch (error) {
        throw new HTTPError(`Unexpected error for "${substackUrl}" with query "${query}. Error: ${getErrorMessage(error)}"`, 500)
    }
}





export async function getPosts(substackUrl: string, sort: 'new' | 'top', env: Env, ctx: ExecutionContext): Promise<JSONSuccessResponse<SubstackPost[]>>  {
    try {
        const validatedSubstackUrl = validateSubstackUrl(substackUrl)
        if (!validatedSubstackUrl) {
            throw new HTTPError('Invalid substack url', 400)
        }

        const cacheKey = `results:${validatedSubstackUrl}:posts:${sort}`
        const cachedResults = await getFromCache(cacheKey, env) as SubstackPost[]
        if (cachedResults) {
            const response = createPostsListResponse(cachedResults, 'cache', validatedSubstackUrl)
            return response
        }

        const {posts, source: postsSource} = await getAllPosts(validatedSubstackUrl, env, ctx)

        const sortedPostsLimit = 25
        const sortedPosts = sortPosts(posts, sort, sortedPostsLimit)
        if (!sortedPosts) {
            throw new HTTPError(`Posts not found for "${validatedSubstackUrl}" after trying cache`, 404)
        }

        tryStoreInCache(cacheKey, sortedPosts, env, sort === 'new' ? '12h' : '7d', ctx)
        const response = createPostsListResponse(sortedPosts, postsSource, validatedSubstackUrl)
        return response
    } catch (error) {
        throw new HTTPError(`Unexpected error for "${substackUrl}" with sort "${sort}". Error: ${getErrorMessage(error)}`, 500)
    }
}





export async function getPost(substackUrl: string, slug: string, env: Env, ctx: ExecutionContext): Promise<JSONSuccessResponse<SubstackPost>> {
    try {
        const validatedSubstackUrl = validateSubstackUrl(substackUrl)
        const validatedSlug = validateSubstackSlug(slug)
        if (!validatedSubstackUrl || !validatedSlug) {
            throw new HTTPError('Invalid parameters', 400)
        }

        const cacheKey = `results:${validatedSubstackUrl}:post:${validatedSlug}`
        const cachedResult = await getFromCache(cacheKey, env) as SubstackPost
        if (cachedResult) {
            return createPostResponse(cachedResult, 'cache', validatedSubstackUrl)
        }

        const apiPost = await getSubstackPostViaAPI(validatedSubstackUrl, validatedSlug)
        if (apiPost) {
            tryStoreInCache(cacheKey, apiPost, env, '7d', ctx)
            return createPostResponse(apiPost, 'api', validatedSubstackUrl)
        }

        const rssPost = await getSubstackPostViaRSS(validatedSubstackUrl, validatedSlug)
        if (rssPost) {
            tryStoreInCache(cacheKey, rssPost, env, '7d', ctx)
            return createPostResponse(rssPost, 'rss', validatedSubstackUrl)
        }

        throw new HTTPError(`Post not found for "${validatedSubstackUrl}" with slug "${validatedSlug}" after trying cache, API, and RSS`, 404)
    } catch (error) {
        throw new HTTPError(`Unexpected error for "${substackUrl}" with slug "${slug}". Error: ${getErrorMessage(error)}`, 500)
    }
}









// HELPER FUNCTIONS

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
            storeInCache(cacheKey, cacheValue, env, expirationSeconds, true, true)
            .catch(error => console.error({event: 'try_store_in_cache_failed', error: getErrorMessage(error)}))
        )        
    } catch (error) {
        console.error({event: 'try_store_in_cache_failed', error: getErrorMessage(error)})
    }
}

function createPostResponse(
    data: SubstackPost,
    source: 'cache' | 'api' | 'rss',
    substackUrl: string
) : JSONSuccessResponse<SubstackPost> {
    return {
        data,
        metadata: {
            timestamp: Date.now(),
            source,
            substack_url: substackUrl
        }
    }
}

function createPostsListResponse(
    data: SubstackPost[],
    source: 'cache' | 'api' | 'rss',
    substackUrl: string
) : JSONSuccessResponse<SubstackPost[]> {
    return {
        data,
        metadata: {
            timestamp: Date.now(),
            source,
            substack_url: substackUrl,
            posts_count: data.length
        }
    }
}

async function getAllPosts(
    substackUrl: string,
    env: Env,
    ctx: ExecutionContext
) : Promise<{posts: SubstackPost[], source: 'cache' | 'api' | 'rss'}> {

    const cacheKey = `posts:${substackUrl}:all`
    const cachedResults = await getFromCache(cacheKey, env) as SubstackPost[]
    if (cachedResults) {
        return {posts: cachedResults, source: 'cache'}
    }

    const apiPosts = await getSubstackPostsViaAPI(substackUrl, 'top', 0, 50)
    if (apiPosts) {
        tryStoreInCache(cacheKey, apiPosts, env, '1d', ctx)
        return {posts: apiPosts, source: 'api'} 
    }

    const rssPosts = await getSubstackPostsViaRSS(substackUrl)
    if (rssPosts) {
        tryStoreInCache(cacheKey, rssPosts, env, '1d', ctx)
        return {posts: rssPosts, source: 'rss'}
    }

    throw new HTTPError(`Posts not found for "${substackUrl}" after trying cache, API, and RSS`, 404)
}


function sortPosts(posts: SubstackPost[], sort: 'new' | 'top', limit: number): SubstackPost[] {
    if (sort === 'new') {
        return posts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, limit)
    } else if (sort === 'top') {
        return posts.sort((a, b) => b.likes - a.likes).slice(0, limit)
    } else {
        throw new HTTPError('Invalid sort parameter', 400)
    }
}