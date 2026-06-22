import { supabase } from '@/lib/supabase';

export interface Project {
  id: string;
  name: string;
  description: string;
  created_at?: string;
}

export const projectService = {
  async createProject(idea: string): Promise<Project> {
    const { data, error } = await supabase
      .from('projects')
      .insert({
        name: idea,
        description: idea
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getProjects(): Promise<Project[]> {
    const { data, error } = await supabase
      .from('projects')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async getProjectById(id: string): Promise<Project | null> {
    const { data, error } = await supabase
      .from('projects')
        .select('*')
        .eq('id', id)
        .single();

    if (error) throw error;
    return data;
  },
};