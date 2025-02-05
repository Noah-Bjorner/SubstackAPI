import Fuse from 'fuse.js';
import type { SubstackPost } from '../types'; 

const fuseOptions = {
  keys: [
    { name: 'title', weight: 4 },
    { name: 'description', weight: 2, getFn: (post: SubstackPost) => post.description || '' },
    { name: 'excerpt', weight: 1, getFn: (post: SubstackPost) => post.excerpt || '' }
  ],
  threshold: 0.3,
  includeScore: true
};

export function searchPosts(posts: SubstackPost[], searchQuery: string): SubstackPost[]  {
  if (!searchQuery) return posts;  
  const fuse = new Fuse(posts, fuseOptions);
  const results = fuse.search(searchQuery);
  return results.map(result => result.item);
}