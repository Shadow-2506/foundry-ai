import { supabase } from '@/lib/supabase';

export interface DecisionGraphRow {
  id: string;
  source_node: string;
  target_node: string;
  relationship: string;
  created_at?: string;
}

export const decisionGraphService = {
  async getRelationships(): Promise<DecisionGraphRow[]> {
    const { data, error } = await supabase
      .from('decision_graph')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  async addRelationship(sourceNode: string, targetNode: string, relationship: string): Promise<DecisionGraphRow> {
    const { data, error } = await supabase
      .from('decision_graph')
      .insert({
        source_node: sourceNode,
        target_node: targetNode,
        relationship: relationship
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Update an existing relationship's label, or repoint its source/target node.
   */
  async updateRelationship(id: string, updates: Partial<Pick<DecisionGraphRow, 'source_node' | 'target_node' | 'relationship'>>): Promise<DecisionGraphRow> {
    const { data, error } = await supabase
      .from('decision_graph')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Delete a single relationship (edge) by id.
   */
  async deleteRelationship(id: string): Promise<void> {
    const { error } = await supabase
      .from('decision_graph')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  /**
   * Delete a node entirely - removes every relationship where it appears
   * as either the source or the target (cascading edge cleanup).
   * Uses two separate .eq() deletes rather than .or() since node names
   * commonly contain colons/spaces that would break raw PostgREST filter syntax.
   */
  async deleteNode(nodeName: string): Promise<void> {
    const { error: sourceError } = await supabase
      .from('decision_graph')
      .delete()
      .eq('source_node', nodeName);
    if (sourceError) throw sourceError;

    const { error: targetError } = await supabase
      .from('decision_graph')
      .delete()
      .eq('target_node', nodeName);
    if (targetError) throw targetError;
  },

  /**
   * Rename a node across the whole graph - updates every relationship
   * where it appears as source or target so the graph stays consistent.
   */
  async renameNode(oldName: string, newName: string): Promise<void> {
    const trimmedNewName = newName.trim();
    if (!trimmedNewName || trimmedNewName === oldName) return;

    const { error: sourceError } = await supabase
      .from('decision_graph')
      .update({ source_node: trimmedNewName })
      .eq('source_node', oldName);
    if (sourceError) throw sourceError;

    const { error: targetError } = await supabase
      .from('decision_graph')
      .update({ target_node: trimmedNewName })
      .eq('target_node', oldName);
    if (targetError) throw targetError;
  }
};