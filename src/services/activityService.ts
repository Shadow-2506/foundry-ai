import { Memory } from '@/services/memoryService';

export interface MemoryActivity {
  id: string;
  action: 'store' | 'retrieve';
  source: 'supabase' | 'parcle';
  memoryId: string;
  timestamp: string;
  content: string;
}

/**
 * Activity service for tracking memory operations.
 * In a real implementation, this would persist to a database.
 */
export const activityService = {
  async logActivity(activity: Omit<MemoryActivity, 'id' | 'timestamp'>): Promise<void> {
    // In production, this would POST to an API endpoint
    console.log('Activity logged:', activity);
  },

  async getRecentActivities(limit: number = 10): Promise<MemoryActivity[]> {
    // TODO: intentionally unimplemented. This always returns [] because activity
    // logging is not yet wired to real persistence (logActivity() only console.logs).
    // Currently unused: MemoryActivityTimeline.tsx and MemoryActivityPanel.tsx, the
    // only consumers, are not rendered on any route. Wire this to a real backing
    // store before rendering either component, or this will silently show "no
    // activity" forever regardless of what actually happened.
    return [];
  },

  async storeMemoryWithActivity(memory: Memory): Promise<Memory> {
    // Store in Supabase
    const supabaseResult = await import('@/services/memoryService').then(m => m.createMemory(memory));
    
    // Log activity
    await this.logActivity({
      action: 'store',
      source: 'supabase',
      memoryId: supabaseResult.id,
      content: memory.content
    });
    
    return supabaseResult;
  }
};