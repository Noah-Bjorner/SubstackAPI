import { storeInCache } from '../../services/cache';
import { validateSubstackPublicationURL } from '../../utils/helper';
import { HTTPError } from '../../utils/errors';

interface ApiKey {
    key: string
    metadata: ApiKeyMetadata
}

export type ApiKeyMetadata = {
    type: 'test' | 'live' | 'public'
    status: 'active' | 'inactive' | 'unverified'
    createdAt: string
    issuedTo: string
    allowedPublication: string
}

export async function getNewApiKey(env: Env, issuedTo: string, allowedPublication: string) {
    const validatedPublication = validateSubstackPublicationURL(allowedPublication)
    if (!validatedPublication) {
        throw new HTTPError('Invalid publication url', 400)
    }
    const apiKey = generateApiKey('live', issuedTo, true, validatedPublication)
    await storeApiKeyInCache(apiKey, env)
    return apiKey
}

export function getKey(apiKey: string) {
    return `apikey:${apiKey}`
}

async function storeApiKeyInCache(apiKey: ApiKey, env: Env) {
    const key = getKey(apiKey.key)
    const value = apiKey.metadata
    await storeInCache(key, value, env, undefined, false)
}

function generateApiKey(keyType: ApiKey['metadata']['type'], issuedTo: string, needsVerification: boolean = true, allowedPublication: string): ApiKey {    
    const prefix = `sk_${keyType}`;
    const randomPart = crypto.randomUUID().replace(/-/g, '');
    const key = `${prefix}_${randomPart}`;
    const status = (keyType === 'test' || !needsVerification) ? 'active' : 'unverified';
    return {
        key,
        metadata: {
            allowedPublication,
            type: keyType,
            status,
            createdAt: new Date().toISOString(),
            issuedTo: issuedTo
        }
    };
}











