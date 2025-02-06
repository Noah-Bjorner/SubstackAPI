export const validateSubstackPublicationURL = (url: string): string | null => {
    if (!url) return null
    const cleanUrl = url.trim().toLowerCase()
    if (cleanUrl.startsWith('https://')) return cleanUrl
    if (cleanUrl.startsWith('http://')) return cleanUrl.replace('http://', 'https://')
    return `https://${cleanUrl}`
}

export const validateSubstackSlug = (slug: string): string | null => {
    if (!slug) return null
    const cleanSlug = slug.trim().toLowerCase()
    return cleanSlug.startsWith('/') ? cleanSlug.slice(1) : cleanSlug
}

export const getResizedImage = (imageUrl: string, width: number) => {
    if (!imageUrl) return null;
    const resizableUrl = getResizableSubstackURL(imageUrl)
    if (!resizableUrl) return null;    
    if (resizableUrl.includes('/fetch/w_')) {
        return resizableUrl.replace(/\/fetch\/w_\d{2,4},/, `/fetch/w_${width},`);
    }
    return resizableUrl.replace('/fetch/', `/fetch/w_${width},`);
}

const getResizableSubstackURL = (imageUrl: string) => {
    if (!imageUrl) return null;
    if (imageUrl.includes('substackcdn.com')) return imageUrl;
    if (!imageUrl.includes('substack-post-media.s3.amazonaws.com')) return imageUrl;
    return `https://substackcdn.com/image/fetch/f_auto,q_auto:good,fl_progressive:steep/${imageUrl}`
}

export const getOGImageURL = (imageUrl: string) => {
    const width = 1200;
    const height = 630;
    const fill = 'fill';
    if (!imageUrl) return null;
    const resizableUrl = getResizableSubstackURL(imageUrl)
    if (!resizableUrl) return null;    
    if (resizableUrl.includes('/fetch/')) {
        const cleanedUrl = resizableUrl.replace(/\/fetch\/[w,h,c]_[^/]+,?/g, '/fetch/');
        return cleanedUrl.replace('/fetch/', `/fetch/w_${width},h_${height},c_${fill},`);
    }
    return resizableUrl;
}



export function getReadingTimeMinutes(words: number): number {
    if (words < 0) return 0;
    const wordsPerMinute = 240;    
    return Math.max(1, Math.ceil(words / wordsPerMinute));
}   



export function getRSSContentWordCount(htmlText: string): number {
    if (!htmlText) return 0;
    const words = htmlText.split(/\s+/).length;
    return Math.ceil(words * 0.85);
}


export function formatCoverImageColorPaletteColor(color: number[]): string | null {
    if (!color) return null;
    if (!Array.isArray(color) || color.length !== 3) return null;
    const [r, g, b] = color;
    return `rgb(${r}, ${g}, ${b})`;
}

