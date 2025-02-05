import { Redis } from "@upstash/redis/cloudflare";
import { getErrorMessage } from "../utils/errors";

const redis = (env: Env) => Redis.fromEnv(env);

export const storeInCache = async (
    key: string, 
    value: any, 
    env: Env,
    expirationSeconds: number = 30,
    hasExpiration: boolean = true,
    compress: boolean = true    
) => {
    try {
        const valueToStore = compress ? await compressData(value) : value;
        if (hasExpiration) {
            await redis(env).set(key, valueToStore, { ex: expirationSeconds });
        } else {
            await redis(env).set(key, valueToStore);
        }
    } catch (error) {
        console.error({event: 'store_in_cache_failed', error: getErrorMessage(error)});
        throw error;
    }
};

export const getFromCache = async (key: string, env: Env, decompress: boolean = true) => {
    try {
        const value = await redis(env).get<string>(key);
        if (!value) return null;
        return decompress ? await decompressData(value) : value;
    } catch (error) {
        console.error({event: 'get_from_cache_failed', error: getErrorMessage(error)});
        return null;
    }
};
  
export const deleteFromCache = async (key: string, env: Env) => {
    try {
        await redis(env).del(key);
    } catch (error) {
        console.error({event: 'delete_from_cache_failed', error: getErrorMessage(error)});
        throw error;
    }
};




// HELPER FUNCTIONS

const compressData = async (data: unknown): Promise<string> => {
    const jsonString = JSON.stringify(data);
    const maxLength = 1000000; // 1MB
    if (jsonString.length > maxLength) {
        throw new Error(`Data too long: ${jsonString.length}`);
    }
    const encoder = new TextEncoder();
    const bytes = encoder.encode(jsonString);
    const compressed = await new Response(
        new Blob([bytes]).stream().pipeThrough(new CompressionStream('deflate'))
    ).arrayBuffer();
    
    return btoa(String.fromCharCode(...new Uint8Array(compressed)));
};

const decompressData = async (base64: string): Promise<unknown> => {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    
    const decompressed = await new Response(
        new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate'))
    ).text();
    
    return JSON.parse(decompressed);
};

