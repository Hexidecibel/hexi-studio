const API_BASE = '/api/v1';

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('hexi_session_token');

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({ error: 'Request failed' }));
    if (response.status === 401) {
      localStorage.removeItem('hexi_session_token');
      window.location.href = '/login';
    }
    throw new ApiError(response.status, body.error || 'Request failed');
  }

  return response.json();
}

// Auth
export const api = {
  auth: {
    sendMagicLink: (email: string) =>
      request<{ message: string }>('/auth/magic-link', {
        method: 'POST',
        body: JSON.stringify({ email }),
      }),
    verify: (token: string, email: string) =>
      request<{ token: string; expiresAt: string }>(
        `/auth/verify?token=${token}&email=${encodeURIComponent(email)}`
      ),
    me: () => request<{ id: string; email: string; name: string | null; plan: string; storageUsedBytes: number; storageLimitBytes: number }>('/auth/me'),
    logout: () => request<{ message: string }>('/auth/logout', { method: 'POST' }),
    autoLogin: (token: string) =>
      request<{ token: string; expiresAt: string }>(
        `/auth/auto?token=${encodeURIComponent(token)}`
      ),
    createAutoLoginToken: (label: string, expiresInDays = 365) =>
      request<{ data: { id: string; label: string; token: string; expiresAt: string | null; createdAt: string } }>(
        '/auth/auto-login-tokens',
        { method: 'POST', body: JSON.stringify({ label, expiresInDays }) }
      ),
    listAutoLoginTokens: () =>
      request<{ data: Array<{ id: string; label: string; expires_at: string | null; last_used_at: string | null; created_at: string }> }>(
        '/auth/auto-login-tokens'
      ),
    revokeAutoLoginToken: (id: string) =>
      request<{ message: string }>(
        `/auth/auto-login-tokens/${id}`,
        { method: 'DELETE' }
      ),
  },

  galleries: {
    list: (page = 1, limit = 20) =>
      request<{
        data: Gallery[];
        pagination: { page: number; limit: number; total: number; hasMore: boolean };
      }>(`/galleries?page=${page}&limit=${limit}`),
    get: (id: string) => request<{ data: Gallery }>(`/galleries/${id}`),
    create: (data: { name: string; slug?: string }) =>
      request<{ data: Gallery }>('/galleries', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: string, data: Partial<{ name: string; slug: string; config: Record<string, unknown>; published: boolean }>) =>
      request<{ data: Gallery }>(`/galleries/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      request<{ message: string }>(`/galleries/${id}`, { method: 'DELETE' }),
    preview: (id: string) =>
      request<{
        gallery: { name: string; slug: string; config: Record<string, unknown> };
        media: { items: Array<{ id: string; src: string; alt: string; type: string; width?: number; height?: number; thumbnail?: string; srcSet?: string; blurDataUrl?: string; title?: string; description?: string; poster?: string; duration?: number }>; total: number; hasMore: boolean };
      }>(`/public/preview/galleries/${id}`),
  },

  media: {
    list: (galleryId: string, page = 1, limit = 50) =>
      request<{
        data: MediaItem[];
        pagination: { page: number; limit: number; total: number; hasMore: boolean };
      }>(`/galleries/${galleryId}/media?page=${page}&limit=${limit}`),

    getUploadUrl: (galleryId: string, file: { filename: string; contentType: string; fileSize: number }) =>
      request<{ data: { mediaId: string; r2Key: string; uploadUrl: string; contentType: string; maxSize: number } }>(
        `/galleries/${galleryId}/media/upload-url`,
        { method: 'POST', body: JSON.stringify(file) }
      ),

    upload: (galleryId: string, mediaId: string, file: File) => {
      const token = localStorage.getItem('hexi_session_token');
      return fetch(`/api/v1/galleries/${galleryId}/media/${mediaId}/upload`, {
        method: 'PUT',
        headers: {
          'Content-Type': file.type,
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: file,
      }).then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({ error: 'Upload failed' }));
          throw new Error(body.error || 'Upload failed');
        }
        return res.json() as Promise<{ data: MediaItem }>;
      });
    },

    confirm: (galleryId: string, data: { mediaId: string; width?: number; height?: number; alt?: string; title?: string }) =>
      request<{ data: MediaItem }>(`/galleries/${galleryId}/media/confirm`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    update: (galleryId: string, mediaId: string, data: { alt?: string; title?: string; description?: string }) =>
      request<{ data: MediaItem }>(`/galleries/${galleryId}/media/${mediaId}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),

    delete: (galleryId: string, mediaId: string) =>
      request<{ message: string }>(`/galleries/${galleryId}/media/${mediaId}`, {
        method: 'DELETE',
      }),

    reorder: (galleryId: string, order: string[]) =>
      request<{ message: string; count: number }>(`/galleries/${galleryId}/media/reorder`, {
        method: 'POST',
        body: JSON.stringify({ order }),
      }),
  },

  library: {
    list: (page = 1, limit = 50, tag?: string) => {
      let url = `/library?page=${page}&limit=${limit}`;
      if (tag) url += `&tag=${encodeURIComponent(tag)}`;
      return request<{
        data: LibraryItem[];
        pagination: { page: number; limit: number; total: number; hasMore: boolean };
      }>(url);
    },
    get: (id: string) =>
      request<{ data: LibraryItem }>(`/library/${id}`),
    getUploadUrl: (file: { filename: string; contentType: string; fileSize: number }) =>
      request<{ data: { mediaId: string; r2Key: string; contentType: string; maxSize: number } }>(
        '/library/upload',
        { method: 'POST', body: JSON.stringify(file) }
      ),
    upload: (mediaId: string, file: File) => {
      const token = localStorage.getItem('hexi_session_token');
      return fetch(`/api/v1/library/${mediaId}/upload`, {
        method: 'PUT',
        headers: {
          'Content-Type': file.type,
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: file,
      }).then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({ error: 'Upload failed' }));
          throw new Error(body.error || 'Upload failed');
        }
        return res.json();
      });
    },
    confirm: (data: { mediaId: string; width?: number; height?: number; alt?: string; title?: string; tags?: string[] }) =>
      request<{ data: LibraryItem }>('/library/confirm', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: string, data: { alt?: string; title?: string; description?: string; tags?: string[] }) =>
      request<{ data: LibraryItem }>(`/library/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      request<{ message: string }>(`/library/${id}`, { method: 'DELETE' }),
  },
};

export interface Gallery {
  id: string;
  name: string;
  slug: string;
  config: Record<string, unknown>;
  published: number;
  media_count: number;
  created_at: string;
  updated_at: string;
}

export interface MediaItem {
  id: string;
  gallery_id: string;
  user_id: string;
  filename: string;
  content_type: string;
  file_size: number;
  r2_key: string;
  media_type: 'image' | 'video';
  width: number | null;
  height: number | null;
  alt: string;
  title: string | null;
  description: string | null;
  duration: number | null;
  poster_r2_key: string | null;
  sort_order: number;
  status: string;
  blur_data_url: string | null;
  metadata: string;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface LibraryItem {
  id: string;
  user_id: string;
  filename: string;
  content_type: string;
  file_size: number;
  r2_key: string;
  media_type: string;
  width: number | null;
  height: number | null;
  alt: string;
  title: string | null;
  description: string | null;
  tags: string;
  status: string;
  blur_data_url: string | null;
  metadata: string;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}
