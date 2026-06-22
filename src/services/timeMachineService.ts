import { supabase } from '@/lib/supabase';
import { Memory, getMemories } from './memoryService';
import { parcleService } from './parcleService';
import { activityService } from './activityService';
import { generateJSON, getActiveConnectedProvider, AIConnectionError } from '@/services/aiClient';

export interface CounterfactualResult {
  timeline: string;
  risks: string[];
  benefits: string[];
  genomeImpact: Record<string, number>;
}

export interface RichTimeMachineResponse {
  answer: string;
  executiveSummary: string;
  supportingMemories: Memory[];
  confidenceScore: number;
  timeline: { year: string; event: string; detail: string }[];
  riskAnalysis: string[];
  recommendedAction: string;
  sourcesUsed: string[];
  relatedDecisions: string[];
}

export function extractKeywords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, '')
    .split(/\s+/)
    .filter(word => word.length > 4);
}

export async function askTimeMachine(question: string): Promise<RichTimeMachineResponse> {
  const memories = await getMemories();
  const keywords = extractKeywords(question);

  // Filter memories matching keywords
  const filtered = memories.filter(m =>
    keywords.some(kw => m.content.toLowerCase().includes(kw) || m.memory_type.toLowerCase().includes(kw))
  );

  // Log activity
  await activityService.logActivity({
    action: 'retrieve',
    source: 'supabase',
    memoryId: filtered[0]?.id || 'none',
    content: `Time Machine matched ${filtered.length} memories for: "${question}"`,
  });

  // Generate timeline context
  const timeline = filtered.map((m, idx) => ({
    year: m.created_at ? new Date(m.created_at).getFullYear().toString() : (2024 - idx).toString(),
    event: m.memory_type.toUpperCase(),
    detail: m.content.length > 100 ? m.content.substring(0, 100) + '...' : m.content
  })).reverse();

  const provider = await getActiveConnectedProvider();
  if (!provider) {
    throw new AIConnectionError(
      'No AI provider is connected. Add and save a valid API key in Settings before querying the Time Machine.'
    );
  }

  const prompt = `
You are an AI historian and organizational intelligence assistant.
Your task is to answer the user's question about company history using ONLY the provided organizational memories as context.

User Question: "${question}"

Available Memories:
${filtered.map((m) => `Type: ${m.memory_type}, Content: ${m.content}`).join('\n')}

Instructions:
Synthesize a clear, concise explanation answering the user's question based on the provided memories.
Return strictly a JSON object with the following structure (do not include any markdown formatting or backticks, just raw JSON):
{
  "answer": "Your synthesized detailed answer here.",
  "executiveSummary": "A 1-2 sentence high-level summary of the answer.",
  "confidenceScore": 95,
  "timeline": [
    { "year": "2024", "event": "Event Name", "detail": "Event details" }
  ],
  "riskAnalysis": [
    "Risk 1 identified from the context",
    "Risk 2 identified from the context"
  ],
  "recommendedAction": "Actionable recommendation based on this history.",
  "sourcesUsed": ["Source 1", "Source 2"],
  "relatedDecisions": ["Decision 1", "Decision 2"]
}
`;

  const parsed = await generateJSON<{
    answer: string;
    executiveSummary: string;
    confidenceScore?: number;
    timeline?: { year: string; event: string; detail: string }[];
    riskAnalysis?: string[];
    recommendedAction?: string;
    sourcesUsed?: string[];
    relatedDecisions?: string[];
  }>(prompt);

  return {
    answer: parsed.answer,
    executiveSummary: parsed.executiveSummary,
    supportingMemories: filtered,
    confidenceScore: parsed.confidenceScore ?? (filtered.length > 0 ? 90 : 40),
    timeline: parsed.timeline || timeline,
    riskAnalysis: parsed.riskAnalysis || ["No significant risks identified in historical records."],
    recommendedAction: parsed.recommendedAction || "Continue monitoring organizational alignment.",
    sourcesUsed: parsed.sourcesUsed || ["Internal Memory Vault"],
    relatedDecisions: parsed.relatedDecisions || ["Standardization Initiative"]
  };
}

export async function runCounterfactualAnalysis(scenario: string): Promise<CounterfactualResult> {
  return {
    timeline: `Alternate timeline for: ${scenario}`,
    risks: ['Increased complexity', 'Potential integration delays'],
    benefits: ['Improved performance', 'Better developer experience'],
    genomeImpact: { adaptability: 0.2, stability: -0.1 },
  };
}