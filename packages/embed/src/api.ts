import type { GalleryResponse, MediaPageResponse } from './types';

// Detect API base URL from the script tag src
function getApiBase(): string {
  const scripts = document.querySelectorAll('script[src*="embed"]');
  for (const script of scripts) {
    const src = script.getAttribute('src');
    if (src) {
      try {
        const url = new URL(src, window.location.href);
        // API is on the same origin as the embed script
        return `${url.origin}/api/v1`;
      } catch {
        // Ignore invalid URLs
      }
    }
  }
  // Fallback: assume API is on the current origin
  return '/api/v1';
}

const API_BASE = getApiBase();

export async function fetchGallery(slug: string): Promise<GalleryResponse> {
  const response = await fetch(`${API_BASE}/public/galleries/${slug}`);
  if (!response.ok) {
    throw new Error(`Gallery not found: ${slug}`);
  }
  return response.json();
}

export async function fetchMediaPage(slug: string, page: number, limit = 50): Promise<MediaPageResponse> {
  const response = await fetch(`${API_BASE}/public/galleries/${slug}/media?page=${page}&limit=${limit}`);
  if (!response.ok) {
    throw new Error('Failed to load media');
  }
  return response.json();
}
