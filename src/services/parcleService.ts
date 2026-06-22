import { Memory } from '@/services/memoryService';
import { getParcleApiKey } from '@/utils/apiKeys';
import { settingsService } from '@/services/settingsService';

const API_BASE = 'https://api.parcle.ai';

/**
 * Shape of a Parcle API error response body:
 * { "error": { "code": string, "message": string, "request_id"?: string } }
 */
interface ParcleErrorBody {
  error?: {
    code?: string;
    message?: string;
    request_id?: string;
  };
}

/**
 * Parses a non-2xx Parcle response into a human-readable error message.
 * Falls back to status text if the body doesn't match the documented shape.
 */
async function errorFromResponse(res: Response): Promise<string> {
  try {
    const body: ParcleErrorBody = await res.clone().json();
    if (body?.error?.message) {
      return body.error.code
        ? `${body.error.message} (${body.error.code})`
        : body.error.message;
    }
  } catch (e) {
    // body wasn't JSON or didn't match the expected shape
  }
  try {
    const text = await res.text();
    if (text) return text;
  } catch (e) {
    // ignore
  }
  return `HTTP ${res.status}: ${res.statusText}`;
}

/**
 * Helper to retrieve the Parcle User ID from settings or environment variables.
 */
async function getParcleUserId(): Promise<string> {
  try {
    const settings = await settingsService.getAppSettings();
    const parcleUserSetting = settings.find(s => s.setting_name === 'ParcleUserID');
    if (parcleUserSetting && parcleUserSetting.setting_value) {
      return parcleUserSetting.setting_value;
    }
  } catch (e) {
    console.warn('Failed to fetch Parcle User ID from settings, falling back to env:', e);
  }
  return import.meta.env.VITE_PARCLE_USER_ID || 'default-user';
}

/**
 * Maps a /v1/memories/sources entry to our standard Memory interface.
 * A "source" is a dialog session or file, not a granular memory fact.
 */
function mapSourceToMemory(item: any): Memory {
  const tag = item.tag || {};
  return {
    id: item.id,
    memory_type: tag.memory_type || tag.type || (item.type === 'file' ? 'file' : 'lesson'),
    content: item.name || `[${item.type}] ${item.id}`,
    visibility: tag.visibility || 'public',
    source: 'parcle',
    storedIn: ['parcle'],
    parcleSynced: true,
    created_at: item.updated_at || new Date().toISOString(),
  };
}

/**
 * Reads a Server-Sent Events stream and returns the payload of the `final`
 * event, throwing on an `error` event. Ignores SSE comment/keepalive lines
 * (lines starting with `:`). Only /v1/memories/search uses this format.
 */
async function parseSearchSSE(response: Response): Promise<any> {
  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('Parcle search response had no readable body.');
  }

  const decoder = new TextDecoder();
  let buffer = '';
  let currentEvent = '';

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line || line.startsWith(':')) {
        // blank line or SSE keepalive comment
        continue;
      }
      if (line.startsWith('event:')) {
        currentEvent = line.slice(6).trim();
        continue;
      }
      if (line.startsWith('data:')) {
        const dataStr = line.slice(5).trim();
        let payload: any;
        try {
          payload = JSON.parse(dataStr);
        } catch (e) {
          continue; // ignore partial/non-JSON data
        }

        if (currentEvent === 'final') {
          return payload;
        }
        if (currentEvent === 'error') {
          const msg = payload?.message || 'Unknown error from Parcle search.';
          throw new Error(
            payload?.code ? `${msg} (${payload.code})` : msg
          );
        }
      }
    }
  }

  throw new Error('Parcle search stream ended without a final result.');
}

export const parcleService = {
  /**
   * Validate connection to Parcle API using POST /v1/users
   */
  async connect(): Promise<{ success: boolean; error?: string }> {
    const apiKey = await getParcleApiKey();
    const userId = await getParcleUserId();

    if (!apiKey) {
      return { success: false, error: 'Parcle API Key is missing in environment variables and settings.' };
    }

    try {
      const res = await fetch(`${API_BASE}/v1/users`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          user_id: userId
        })
      });

      if (res.ok) {
        return { success: true };
      } else if (res.status === 401 || res.status === 403) {
        return { success: false, error: 'Unauthorized: Invalid Parcle API Key.' };
      } else {
        const message = await errorFromResponse(res);
        return { success: false, error: `Parcle API Error: ${message}` };
      }
    } catch (err: any) {
      const errorMsg = err.message || String(err);
      return { success: false, error: `Network error: Failed to fetch Parcle API. ${errorMsg}` };
    }
  },

  /**
   * Store a memory, lesson, or policy in Parcle using POST /v1/memories/ingest_dialog.
   * This is a plain JSON response, not an SSE stream.
   * Returns true only if the write actually succeeded.
   */
  async storeMemory(memory: Memory): Promise<boolean> {
    const apiKey = await getParcleApiKey();
    const userId = await getParcleUserId();
    if (!apiKey) return false;

    try {
      const res = await fetch(`${API_BASE}/v1/memories/ingest_dialog`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          user_id: userId,
          messages: [
            {
              role: 'user',
              content: memory.content
            }
          ],
          tag: {
            id: memory.id,
            memory_type: memory.memory_type,
            visibility: memory.visibility || 'public'
          }
        })
      });

      if (!res.ok) {
        const message = await errorFromResponse(res);
        throw new Error(message);
      }

      const result: { session_id: string; event_id: string } = await res.json();
      console.log('[Parcle storeMemory] Ingestion result:', result);
      return true;
    } catch (err) {
      console.error('Parcle storeMemory failed:', err);
      return false;
    }
  },

  /**
   * Store a lesson in Parcle
   */
  async storeLesson(lesson: any): Promise<boolean> {
    return this.storeMemory({
      id: lesson.id,
      memory_type: 'lesson',
      content: lesson.content,
      visibility: 'public',
      created_at: lesson.generatedAt
    });
  },

  /**
   * Store a policy in Parcle
   */
  async storePolicy(policy: any): Promise<boolean> {
    return this.storeMemory({
      id: policy.id,
      memory_type: 'policy',
      content: policy.content,
      visibility: 'public',
      created_at: policy.createdAt
    });
  },

  /**
   * Check whether a previously-ingested dialog/file has finished indexing
   * using POST /v1/memories/events.
   */
  async getEventStatus(eventId: string): Promise<{ status: 'pending' | 'ready' | 'failed'; error?: string }> {
    const apiKey = await getParcleApiKey();
    const userId = await getParcleUserId();
    if (!apiKey) return { status: 'failed', error: 'Parcle API Key is missing.' };

    const res = await fetch(`${API_BASE}/v1/memories/events`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ user_id: userId, event_id: eventId })
    });

    if (!res.ok) {
      const message = await errorFromResponse(res);
      throw new Error(message);
    }

    return res.json();
  },

  /**
   * List actual stored memories (dialog sessions / files) using
   * POST /v1/memories/sources, paginating through all pages.
   */
  async getMemories(): Promise<Memory[]> {
    const apiKey = await getParcleApiKey();
    const userId = await getParcleUserId();
    if (!apiKey) return [];

    const allMemories: Memory[] = [];
    let page = 1;
    let totalPages = 1;

    try {
      do {
        const res = await fetch(`${API_BASE}/v1/memories/sources`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            user_id: userId,
            page,
            limit: 50,
            order: 'desc'
          })
        });

        if (!res.ok) {
          const message = await errorFromResponse(res);
          throw new Error(message);
        }

        const data: {
          sources: any[];
          page: number;
          total_pages: number;
          total: number;
        } = await res.json();

        allMemories.push(...(data.sources || []).map(mapSourceToMemory));
        totalPages = data.total_pages || 1;
        page += 1;
      } while (page <= totalPages);

      return allMemories;
    } catch (err) {
      console.error('Parcle getMemories failed:', err);
      return [];
    }
  },

  /**
   * Ask a natural-language question over memory using POST /v1/memories/search.
   * This is delivered as an SSE stream and returns one synthesized answer with
   * citations - it does NOT return a list of stored memory records. Use
   * getMemories() for listing.
   */
  async askQuestion(query: string): Promise<{
    answer: string;
    confidence: number;
    citations: { type: 'session' | 'file'; id: string }[];
  }> {
    const apiKey = await getParcleApiKey();
    const userId = await getParcleUserId();
    if (!apiKey) {
      throw new Error('Parcle API Key is missing.');
    }

    const res = await fetch(`${API_BASE}/v1/memories/search`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        user_id: userId,
        query
      })
    });

    if (!res.ok) {
      const message = await errorFromResponse(res);
      throw new Error(message);
    }

    return parseSearchSSE(res);
  },

  /**
   * Delete all memories for a given session.
   */
  async deleteBySession(sessionId: string): Promise<{ deleted: boolean; deleted_count: number }> {
    const apiKey = await getParcleApiKey();
    const userId = await getParcleUserId();
    if (!apiKey) throw new Error('Parcle API Key is missing.');

    const res = await fetch(`${API_BASE}/v1/memories/by_session`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ user_id: userId, session_id: sessionId })
    });

    if (!res.ok) {
      const message = await errorFromResponse(res);
      throw new Error(message);
    }

    return res.json();
  },

  /**
   * Delete all memories for a given file.
   */
  async deleteByFile(fileId: string): Promise<{ deleted: boolean; deleted_count: number }> {
    const apiKey = await getParcleApiKey();
    const userId = await getParcleUserId();
    if (!apiKey) throw new Error('Parcle API Key is missing.');

    const res = await fetch(`${API_BASE}/v1/memories/by_file`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ user_id: userId, file_id: fileId })
    });

    if (!res.ok) {
      const message = await errorFromResponse(res);
      throw new Error(message);
    }

    return res.json();
  },

  /**
   * Delete all memories matching a (non-empty) tag filter.
   */
  async deleteByTag(tagFilter: Record<string, any>): Promise<{ deleted: boolean; deleted_count: number }> {
    if (!tagFilter || Object.keys(tagFilter).length === 0) {
      throw new Error('tag_filter must be non-empty when deleting by tag.');
    }

    const apiKey = await getParcleApiKey();
    const userId = await getParcleUserId();
    if (!apiKey) throw new Error('Parcle API Key is missing.');

    const res = await fetch(`${API_BASE}/v1/memories/by_tag`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ user_id: userId, tag_filter: tagFilter })
    });

    if (!res.ok) {
      const message = await errorFromResponse(res);
      throw new Error(message);
    }

    return res.json();
  },

  /**
   * Delete a single memory by its ID (uses deleteByTag with a memory_id tag filter).
   * Returns true if deletion succeeded, false otherwise.
   */
  async deleteMemory(id: string): Promise<boolean> {
    try {
      const result = await this.deleteByTag({ memory_id: id });
      return result.deleted;
    } catch (err) {
      // Parcle may not have this record — treat as success (already gone)
      console.warn('Parcle deleteMemory error (may be benign):', err);
      return false;
    }
  },

  /**
   * Get current connection status and sync statistics using real API responses.
   */
  async getStatus(): Promise<{ connected: boolean; syncedCount: number; lastSyncTime: string; error?: string }> {
    const apiKey = await getParcleApiKey();
    if (!apiKey) {
      return { connected: false, syncedCount: 0, lastSyncTime: 'Never', error: 'Parcle API Key is missing.' };
    }

    const conn = await this.connect();
    if (!conn.success) {
      return { connected: false, syncedCount: 0, lastSyncTime: 'Never', error: conn.error };
    }

    try {
      const memories = await this.getMemories();
      return {
        connected: true,
        syncedCount: memories.length,
        lastSyncTime: memories.length > 0 && memories[0].created_at
          ? new Date(memories[0].created_at).toLocaleTimeString()
          : new Date().toLocaleTimeString()
      };
    } catch (e: any) {
      console.warn('Failed to fetch Parcle stats, using fallback values:', e);
      return {
        connected: true,
        syncedCount: 0,
        lastSyncTime: new Date().toLocaleTimeString(),
        error: e.message || String(e)
      };
    }
  }
};
