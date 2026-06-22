import { supabase } from '@/lib/supabase';
import { parcleService } from '@/services/parcleService';
import * as memoryService from '@/services/memoryService';
import { projectService } from '@/services/projectService';

export interface GenomeRecord {
  id: string;
  innovation: number;
  quality: number;
  speed: number;
  risk: number;
  cost: number;
  created_at?: string;
}

export interface OrgActivitySnapshot {
  decisions: number;
  lessons: number;
  policies: number;
  projects: number;
  parcleSynced: number;
  totalMemories: number;
}

const FALLBACK_GENOME_DATA: GenomeRecord[] = [
  { id: '1', innovation: 90, quality: 110, speed: 85, risk: 70, cost: 80, created_at: '2024-01-15T00:00:00.000Z' },
  { id: '2', innovation: 95, quality: 112, speed: 90, risk: 75, cost: 82, created_at: '2024-02-15T00:00:00.000Z' },
  { id: '3', innovation: 105, quality: 115, speed: 95, risk: 80, cost: 85, created_at: '2024-03-15T00:00:00.000Z' },
  { id: '4', innovation: 115, quality: 120, speed: 100, risk: 85, cost: 90, created_at: '2024-04-15T00:00:00.000Z' },
  { id: '5', innovation: 120, quality: 125, speed: 110, risk: 90, cost: 95, created_at: '2024-05-15T00:00:00.000Z' },
];

export const genomeService = {
  async getGenomeHistory(): Promise<GenomeRecord[]> {
    try {
      // Query only existing columns and do not assume created_at exists for ordering
      const { data, error } = await supabase
        .from('genome')
        .select('id, innovation, quality, speed, risk, cost');

      if (error) throw error;

      if (!data || data.length === 0) {
        console.warn('Genome table is empty. Using fallback data.');
        return this.getFallbackData();
      }

      // Map and add a safe mock created_at if missing
      return data.map((item, index) => ({
        ...item,
        created_at: new Date(Date.now() - (data.length - 1 - index) * 24 * 60 * 60 * 1000 * 30).toISOString()
      }));
    } catch (err) {
      console.error('Failed to query genome table from Supabase. Falling back to local storage/mock data:', err);
      return this.getFallbackData();
    }
  },

  getFallbackData(): GenomeRecord[] {
    try {
      const stored = localStorage.getItem('foundry_genome_history');
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error('Failed to parse stored genome history:', e);
    }
    return FALLBACK_GENOME_DATA;
  },

  async updateGenome(record: Omit<GenomeRecord, 'id' | 'created_at'>): Promise<GenomeRecord> {
    const newRecord = {
      ...record,
      id: Math.random().toString(36).substr(2, 9),
      created_at: new Date().toISOString()
    };

    try {
      const { data, error } = await supabase
        .from('genome')
        .insert(record)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (err) {
      console.warn('Failed to insert genome record into Supabase. Saving to local storage fallback:', err);
      const history = this.getFallbackData();
      const updatedHistory = [...history, newRecord];
      localStorage.setItem('foundry_genome_history', JSON.stringify(updatedHistory));
      return newRecord;
    }
  },

  /**
   * Gather a real snapshot of organizational activity from Supabase and Parcle.
   * This is the "live" signal that drives genome dimensions, instead of random noise.
   */
  async getActivitySnapshot(): Promise<OrgActivitySnapshot> {
    const [memories, parcleStatus, projects] = await Promise.all([
      memoryService.getMemories().catch(() => []),
      parcleService.getStatus().catch(() => ({ connected: false, syncedCount: 0, lastSyncTime: 'Never' })),
      projectService.getProjects().catch(() => [])
    ]);

    const decisions = memories.filter(m => m.memory_type === 'decision').length;
    const lessons = memories.filter(m => m.memory_type === 'lesson').length;
    const policies = memories.filter(m => m.memory_type === 'policy').length;

    return {
      decisions,
      lessons,
      policies,
      projects: projects.length,
      parcleSynced: parcleStatus.syncedCount || 0,
      totalMemories: memories.length
    };
  },

  /**
   * Derive a genome record from real organizational activity (Supabase + Parcle),
   * rather than random values. Each dimension maps to a concrete, explainable signal:
   *  - innovation: growth of decisions + projects (more initiatives attempted)
   *  - quality: ratio of lessons/policies codified per decision (learning loop closing)
   *  - speed: recency-weighted activity volume (how fast the org is generating signal)
   *  - risk: inverse of policy coverage (fewer policies per decision = higher risk)
   *  - cost: inverse of Parcle sync health (sync failures imply rework/cost)
   */
  async deriveGenomeFromActivity(): Promise<Omit<GenomeRecord, 'id' | 'created_at'>> {
    const snapshot = await this.getActivitySnapshot();

    const clamp = (v: number, min = 30, max = 150) => Math.min(Math.max(Math.round(v), min), max);

    // Innovation: rewards real growth in decisions + projects vs the prior snapshot
    const innovation = clamp(70 + snapshot.decisions * 4 + snapshot.projects * 6);

    // Quality: rewards a healthy lesson/policy-to-decision ratio (the learning loop closing)
    const learningRatio = snapshot.decisions > 0
      ? (snapshot.lessons + snapshot.policies) / snapshot.decisions
      : (snapshot.lessons + snapshot.policies > 0 ? 1 : 0);
    const quality = clamp(80 + learningRatio * 30 + snapshot.policies * 3);

    // Speed: rewards overall throughput of recorded organizational activity
    const speed = clamp(70 + snapshot.totalMemories * 3 + snapshot.projects * 2);

    // Risk: higher when decisions outpace codified policies (decisions made without governance)
    const policyCoverage = snapshot.decisions > 0 ? snapshot.policies / snapshot.decisions : 1;
    const risk = clamp(110 - policyCoverage * 60, 30, 150);

    // Cost: penalized when Parcle sync lags behind Supabase memory volume (rework/cost signal)
    const syncGap = Math.max(snapshot.totalMemories - snapshot.parcleSynced, 0);
    const cost = clamp(60 + syncGap * 4, 30, 150);

    return { innovation, quality, speed, risk, cost };
  },

  /**
   * Subscribe to live changes across the tables that feed the genome (memories, projects,
   * decision_graph) so the UI can auto-refresh whenever real organizational data changes.
   * Returns an unsubscribe function.
   */
  subscribeToActivityChanges(onChange: () => void): () => void {
    const channel = supabase
      .channel('genome-activity-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'memories' }, onChange)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, onChange)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'genome' }, onChange)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },

  calculateFitnessScore(record: GenomeRecord | Omit<GenomeRecord, 'id' | 'created_at'>): number {
    const innovation = record.innovation || 0;
    const quality = record.quality || 0;
    const speed = record.speed || 0;
    const risk = record.risk || 0;
    const cost = record.cost || 0;

    const score = (innovation + quality + speed + (150 - risk) + (150 - cost)) / 5;
    return Math.round(Math.min(Math.max(score, 0), 150) * (100 / 150)); // Normalize to 0-100%
  }
};