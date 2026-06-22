import { supabase } from '@/lib/supabase';
import { parcleService } from '@/services/parcleService';
import { generateText } from '@/services/aiClient';

export interface Decision {
  id: string;
  title: string;
  outcome: string;
  timestamp: string;
}

export interface Lesson {
  id: string;
  decisionId: string;
  content: string;
  generatedAt: string;
}

export interface Policy {
  id: string;
  lessonId: string;
  content: string;
  source: 'supabase' | 'parcle';
  createdAt: string;
}

export interface GenomeUpdate {
  key: string;
  value: number;
  policyId: string;
  timestamp: string;
}

/** Generate a lesson from a decision using whichever AI provider is connected in Settings */
export async function generateLesson(decision: Decision): Promise<Lesson> {
  const prompt = `Analyze this decision and outcome to create a structured lesson:\n\nDecision: ${decision.title}\nOutcome: ${decision.outcome}\n\nExtract key learnings, patterns, and actionable insights.`;
  const lessonContent = await generateText(prompt);
  const lesson: Lesson = {
    id: `${Date.now()}-lesson`,
    decisionId: decision.id,
    content: lessonContent,
    generatedAt: new Date().toISOString(),
  };
  await supabase.from('lessons').insert({
    id: lesson.id,
    decision_id: lesson.decisionId,
    content: lesson.content,
    created_at: lesson.generatedAt,
    memory_type: 'lesson',
  });
  await parcleService.storeLesson({
    id: lesson.id,
    memory_type: 'lesson',
    content: lesson.content,
    visibility: 'public',
    created_at: lesson.generatedAt,
  });
  return lesson;
}

/** Generate a policy from a lesson using whichever AI provider is connected in Settings */
export async function generatePolicy(lesson: Lesson): Promise<Policy> {
  const prompt = `Create an actionable policy based on this lesson:\n\n${lesson.content}`;
  const policyContent = await generateText(prompt);
  const policy: Policy = {
    id: `${Date.now()}-policy`,
    lessonId: lesson.id,
    content: policyContent,
    source: 'supabase',
    createdAt: new Date().toISOString(),
  };
  await supabase.from('policies').insert({
    id: policy.id,
    lesson_id: policy.lessonId,
    content: policy.content,
    source: policy.source,
    created_at: policy.createdAt,
  });
  await parcleService.storePolicy(policy);
  return policy;
}

/** Update genome values based on a new policy */
export async function updateGenome(policy: Policy): Promise<GenomeUpdate> {
  const genomeKey = 'adaptability';
  const valueChange = 0.5;
  const genomeUpdate: GenomeUpdate = {
    key: genomeKey,
    value: valueChange,
    policyId: policy.id,
    timestamp: new Date().toISOString(),
  };
  await supabase.from('genome_updates').insert(genomeUpdate);
  return genomeUpdate;
}