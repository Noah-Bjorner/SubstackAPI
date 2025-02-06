import { XMLParser } from 'fast-xml-parser' 
import { SubstackPost } from '../types'
import { 
    getReadingTimeMinutes,
    getResizedImage,
    getRSSContentWordCount,
    getOGImageURL,
    formatCoverImageColorPaletteColor,
} from '../utils/helper'
import { getErrorMessage } from '../utils/errors'



// Substack Unofficial API

export async function getSubstackPostsViaAPI(
    publicationURL: string,
    sortBy: 'new' | 'top' = 'new',
    offset: number = 0,
    limit: number = 12
): Promise<SubstackPost[] | null> {
    try {
        const url = `${publicationURL}/api/v1/archive?sort=${sortBy}&offset=${offset}&limit=${limit}`
        const response = await fetch(url)
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json()
        const dataArray = data as any[]
        const posts = dataArray.map((post: any): SubstackPost => ({
            slug: post.slug,
            url: post.canonical_url,
            title: post.title,
            description: post.description || post.subtitle || '',
            excerpt: post.truncated_body_text || null,
            body_html: null,
            reading_time_minutes: getReadingTimeMinutes(post.wordcount || 0),
            audio_url: post.audio_items?.[0]?.audio_url || null,
            date: post.post_date,
            likes: post.reactions?.['❤'] || 0,
            paywall: post.audience !== 'everyone',
            cover_image: {
                original: post.cover_image || null,
                og: getOGImageURL(post.cover_image || null),
                small: getResizedImage(post.cover_image, 150),
                medium: getResizedImage(post.cover_image, 424),
                large: getResizedImage(post.cover_image, 848),
            },
            cover_image_color_palette: {
                vibrant: formatCoverImageColorPaletteColor(post.coverImagePalette?.Vibrant?.rgb),
                light_vibrant: formatCoverImageColorPaletteColor(post.coverImagePalette?.LightVibrant?.rgb),
                dark_vibrant: formatCoverImageColorPaletteColor(post.coverImagePalette?.DarkVibrant?.rgb),
                muted: formatCoverImageColorPaletteColor(post.coverImagePalette?.Muted?.rgb),
                light_muted: formatCoverImageColorPaletteColor(post.coverImagePalette?.LightMuted?.rgb),
                dark_muted: formatCoverImageColorPaletteColor(post.coverImagePalette?.DarkMuted?.rgb),
            },
            author: post.publishedBylines?.[0]?.name || '',
            author_image: {
                original: post.publishedBylines?.[0]?.photo_url || null,
                small: getResizedImage(post.publishedBylines?.[0]?.photo_url, 32),
                medium: getResizedImage(post.publishedBylines?.[0]?.photo_url, 72),
                large: getResizedImage(post.publishedBylines?.[0]?.photo_url, 192),
            }
        }))
        return posts
    } catch (error) {
        console.error({ event: `failed_to_process_posts_via_api`, error: getErrorMessage(error) });
        return null
    }
}

export async function getSubstackPostViaAPI(publicationURL: string, slug: string): Promise<SubstackPost | null> {
    try {
        const url = `${publicationURL}/api/v1/posts/${slug}`
        const response = await fetch(url)
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json() as any
        const post: SubstackPost = {
            slug: data.slug,
            url: data.canonical_url,
            title: data.title,
            description: data.description || data.subtitle || '',
            excerpt: data.truncated_body_text || null,
            body_html: data.body_html || null,
            reading_time_minutes: getReadingTimeMinutes(data.wordcount || 0),
            audio_url: data.audio_items?.[0]?.audio_url || null,
            date: data.post_date,
            likes: data.reactions?.['❤'] || 0,
            paywall: data.audience !== 'everyone',
            cover_image: {
                original: data.cover_image || null,
                og: getOGImageURL(data.cover_image || null),
                small: getResizedImage(data.cover_image, 150),
                medium: getResizedImage(data.cover_image, 424),
                large: getResizedImage(data.cover_image, 848),
            },
            cover_image_color_palette: {
                vibrant: formatCoverImageColorPaletteColor(data.coverImagePalette?.Vibrant?.rgb),
                light_vibrant: formatCoverImageColorPaletteColor(data.coverImagePalette?.LightVibrant?.rgb),
                dark_vibrant: formatCoverImageColorPaletteColor(data.coverImagePalette?.DarkVibrant?.rgb),
                muted: formatCoverImageColorPaletteColor(data.coverImagePalette?.Muted?.rgb),
                light_muted: formatCoverImageColorPaletteColor(data.coverImagePalette?.LightMuted?.rgb),
                dark_muted: formatCoverImageColorPaletteColor(data.coverImagePalette?.DarkMuted?.rgb),
            },
            author: data.publishedBylines?.[0]?.name || '',
            author_image: {
                original: data.publishedBylines?.[0]?.photo_url || null,
                small: getResizedImage(data.publishedBylines?.[0]?.photo_url, 32),
                medium: getResizedImage(data.publishedBylines?.[0]?.photo_url, 72),
                large: getResizedImage(data.publishedBylines?.[0]?.photo_url, 192),
            }
        }
        return post    
    } catch (error) {
        console.error({ event: `failed_to_process_post_via_api`, error: getErrorMessage(error) });
        return null
    }
}








// Substack RSS Feed

export async function getSubstackPostsViaRSS(publicationURL: string): Promise<SubstackPost[] | null> {
    try {
        const url = `${publicationURL}/feed`
        const response = await fetch(url)
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const xmlText = await response.text()
        
        const parser = new XMLParser({
            ignoreAttributes: false,
            attributeNamePrefix: "@_",
            processEntities: true
        })
        
        const result = parser.parse(xmlText)
        const items = result.rss.channel.item
        const siteImageURL = result.rss.channel.image.url || null

        const posts = items.map((item: any): SubstackPost => ({
            slug: item.link?.split('/').pop() || '',
            url: item.link || '',
            title: item.title || '',
            description: item.description || '',
            excerpt: null,
            body_html: item['content:encoded'] || null,
            reading_time_minutes: getReadingTimeMinutes(getRSSContentWordCount(item['content:encoded'] || 0)),
            audio_url: null,
            date: new Date(item.pubDate).toISOString(),
            likes: 0,
            paywall: false,
            cover_image: {
                original: item.enclosure?.['@_url'] || null,
                og: getOGImageURL(item.enclosure?.['@_url'] || null),
                small: getResizedImage(item.enclosure?.['@_url'], 150),
                medium: getResizedImage(item.enclosure?.['@_url'], 424),
                large: getResizedImage(item.enclosure?.['@_url'], 848),
            },
            cover_image_color_palette: {
                vibrant: null,
                light_vibrant: null,
                dark_vibrant: null,
                muted: null,
                light_muted: null,
                dark_muted: null,
            },
            author: item['dc:creator'] || item.creator || item.author || '',
            author_image: {
                original: siteImageURL,
                small: getResizedImage(siteImageURL, 32),
                medium: getResizedImage(siteImageURL, 72),
                large: getResizedImage(siteImageURL, 192),
            }
        }))
        
        return posts
    } catch (error) {
        console.error({ event: `failed_to_process_posts_via_rss`, error: getErrorMessage(error) });
        return null
    }
}

export async function getSubstackPostViaRSS(publicationURL: string, slug: string): Promise<SubstackPost | null> {
    try {
        const data = await getSubstackPostsViaRSS(publicationURL)
        return data?.find((post: SubstackPost) => post.slug === slug) || null
    } catch (error) {
        console.error({ event: `failed_to_process_post_via_rss`, error: getErrorMessage(error) });
        return null
    }
}


