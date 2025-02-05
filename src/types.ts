export interface SubstackPost {
    slug: string
    url: string
    title: string
    description: string
    excerpt: string | null
    body_html: string | null
    reading_time_minutes: number | null
    audio_url: string | null
    date: string
    likes: number
    paywall: boolean
    cover_image: {
        original: string | null,
        og: string | null, // 1200x630
        small: string | null, // 150px
        medium: string | null, // 424px
        large: string | null, // 848px
    }
    cover_image_color_palette: {
        vibrant: string | null,
        light_vibrant: string | null,
        dark_vibrant: string | null,
        muted: string | null,
        light_muted: string | null,
        dark_muted: string | null,
    }
    author: string
    author_image: {
        original: string | null,
        small: string | null, // 32px
        medium: string | null, // 72px
        large: string | null, // 192px
    }
}


export interface JSONSuccessResponse<T> {
    data: T
    metadata: {
        timestamp: number
        source?: string
        substack_url?: string
        posts_count?: number
    }
}

