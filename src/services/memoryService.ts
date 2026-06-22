import { supabase } from '@/lib/supabase';
import { parcleService } from '@/services/parcleService';

export interface Memory {
  id: string;
  memory_type: string;
  content: string;
  visibility?: 'public' | 'private';
  source?: 'supabase' | 'parcle'; // kept for backward compat; prefer storedIn
  storedIn?: ('supabase' | 'parcle')[]; // which backends actually have this record
  parcleSynced?: boolean;
  created_at?: string;
}

/**
 * Store a memory (or lesson) in Supabase and Parcle.
 * @param memory - Memory object to store
 * @returns The stored memory record
 */
export async function createMemory(memory: Omit<Memory, 'id' | 'created_at'>): Promise<Memory> {
  // 1. Insert into memories table
  const { data, error } = await supabase
    .from('memories')
    .insert({
      ...memory,
      visibility: memory.visibility ?? 'public'
    })
    .select()
    .single();

  if (error) throw error;

  // 2. If it's a decision, also insert into decisions table
  if (memory.memory_type === 'decision') {
    try {
      let parsedTitle = 'Decision';
      let parsedOutcome = '';
      try {
        if (memory.content.startsWith('{')) {
          const parsed = JSON.parse(memory.content);
          parsedTitle = parsed.title || parsedTitle;
          parsedOutcome = parsed.outcome || '';
        } else {
          parsedTitle = memory.content.substring(0, 50);
        }
      } catch (e) {
        parsedTitle = memory.content.substring(0, 50);
      }

      await supabase
        .from('decisions')
        .insert({
          id: data.id,
          title: parsedTitle,
          outcome: parsedOutcome,
          content: memory.content,
          visibility: memory.visibility ?? 'public',
          created_at: data.created_at
        });
    } catch (err) {
      console.warn('Could not insert into decisions table (it might not exist yet), skipping:', err);
    }
  }

  // Also store in Parcle, capturing whether the sync actually succeeded.
  let parcleSynced = false;
  try {
    parcleSynced = await parcleService.storeMemory({ ...data, source: 'parcle' });
  } catch (err) {
    console.warn('Parcle store failed, keeping Supabase record:', err);
  }

  const storedIn: ('supabase' | 'parcle')[] = ['supabase'];
  if (parcleSynced) storedIn.push('parcle');

  return { ...data, source: 'supabase', storedIn, parcleSynced };
}

/**
 * Retrieve all memories from Supabase and Parcle, merging them.
 * @returns Array of merged memory records
 */
export async function getMemories(): Promise<Memory[]> {
  let supabaseMemories: Memory[] = [];
  try {
    const { data, error } = await supabase
      .from('memories')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error && data) {
      supabaseMemories = data.map(memory => ({ ...memory, source: 'supabase' as const }));
    }
  } catch (e) {
    console.warn('Failed to fetch memories from Supabase:', e);
  }

  let parcleMemories: Memory[] = [];
  try {
    parcleMemories = await parcleService.getMemories();
  } catch (e) {
    console.warn('Failed to fetch memories from Parcle:', e);
  }

  // Supabase is the single source of truth for which memories exist.
  // Parcle is used ONLY to annotate sync status on Supabase records.
  // We never surface Parcle-only entries (e.g. session artifacts) as cards.
  const parcleIds = new Set(parcleMemories.map(m => m.id));

  const merged = supabaseMemories.map(m => ({
    ...m,
    source: 'supabase' as const,
    storedIn: (parcleIds.has(m.id)
      ? ['supabase', 'parcle']
      : ['supabase']) as ('supabase' | 'parcle')[],
    parcleSynced: parcleIds.has(m.id),
  }));

  return merged.sort((a, b) => {
    const dateA = new Date(a.created_at || 0).getTime();
    const dateB = new Date(b.created_at || 0).getTime();
    return dateB - dateA;
  });
}

/**
 * Re-attempt the Parcle write for a memory that already exists in Supabase
 * but failed to sync (or was created before a Parcle key was configured).
 * Does not touch Supabase - it only retries the Parcle half of the write.
 * @param memory - The Supabase-side memory record to resync
 * @returns Whether the retry succeeded
 */
export async function retrySyncToParcle(memory: Memory): Promise<boolean> {
  return parcleService.storeMemory({ ...memory, source: 'parcle' });
}

/**
 * Search memories in Supabase by query string
 * @param query - Search query
 * @returns Array of memory records from Supabase matching the query
 */
export async function searchMemories(query: string): Promise<Memory[]> {
  if (!query.trim()) return [];
  const { data, error } = await supabase
    .from('memories')
    .select('*')
    .ilike('content', `%${query}%`)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []).map(memory => ({ ...memory, source: 'supabase' }));
}

/**
 * Update an existing memory in Supabase
 * @param id - Memory ID to update
 * @param updates - Fields to update
 * @returns Updated memory record
 */
export async function updateMemory(id: string, updates: Partial<Omit<Memory, 'id' | 'created_at'>>): Promise<Memory> {
  const { data, error } = await supabase
    .from('memories')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return { ...data, source: 'supabase' };
}

/**
 * Delete a memory from Supabase
 * @param id - Memory ID to delete
 * @returns Deletion confirmation
 */
export async function deleteMemory(id: string): Promise<void> {
  // Delete from Supabase first (authoritative store)
  const { error } = await supabase.from('memories').delete().eq('id', id);
  if (error) throw error;

  // Best-effort delete from Parcle — don't fail if Parcle is unavailable
  try {
    await parcleService.deleteMemory(id);
  } catch (err) {
    console.warn('Parcle deleteMemory failed (Supabase deletion succeeded):', err);
  }
}