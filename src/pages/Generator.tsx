import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Loader2,
  Target,
  ListChecks,
  Layout,
  Milestone,
  TrendingUp,
  Activity,
  Clock,
  ShieldAlert,
  AlertTriangle,
  FileJson,
  FileText,
  FileCode,
  Settings as SettingsIcon,
  Info
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  ResponsiveContainer
} from 'recharts';
import { projectService } from '@/services/projectService';
import { useToast } from '@/hooks/use-toast';
import { generateJSON, getActiveConnectedProvider, AIConnectionError } from '@/services/aiClient';
import { notificationService } from '@/services/notificationService';
import { jsPDF } from 'jspdf';

/**
 * Clamps a score field to [0, 100], defaulting to null (rendered as "—")
 * if the AI returned something missing or non-numeric.
 */
function clampScore(value: unknown): number | null {
  const num = typeof value === 'number' ? value : Number(value);
  if (value === undefined || value === null || Number.isNaN(num)) {
    return null;
  }
  return Math.min(100, Math.max(0, num));
}

/**
 * Validates and normalizes a raw AI-generated blueprint before it's rendered.
 * Score fields are clamped/defaulted instead of rendering "undefined/100".
 * Throws AIConnectionError if the result is missing core required fields,
 * consistent with how other AI failures are surfaced in the Generator.
 */
function validateBlueprint(raw: any): any {
  if (
    !raw ||
    typeof raw.vision !== 'string' ||
    !Array.isArray(raw.requirements) ||
    typeof raw.architecture !== 'string' ||
    !Array.isArray(raw.roadmap)
  ) {
    throw new AIConnectionError(
      'The AI returned an incomplete blueprint — please try again.'
    );
  }

  return {
    ...raw,
    businessValueScore: clampScore(raw.businessValueScore),
    innovationScore: clampScore(raw.innovationScore),
    technicalComplexityScore: clampScore(raw.technicalComplexityScore),
    effortEstimate:
      typeof raw.effortEstimate === 'string' && raw.effortEstimate.trim()
        ? raw.effortEstimate
        : 'Not estimated',
  };
}

// ==========================================
// INLINED SUB-COMPONENTS TO RESOLVE TS ERRORS
// ==========================================

interface ScoreCardsProps {
  businessValueScore: number | null;
  innovationScore: number | null;
  technicalComplexityScore: number | null;
  effortEstimate: string;
}

function ScoreLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1">
      {children}
      <Tooltip>
        <TooltipTrigger asChild>
          <Info className="w-3 h-3 text-muted-foreground/60 cursor-help" />
        </TooltipTrigger>
        <TooltipContent className="max-w-[220px] text-xs">
          AI-estimated based on the generated blueprint — not a deterministic calculation.
        </TooltipContent>
      </Tooltip>
    </span>
  );
}

function ScoreCards({
  businessValueScore,
  innovationScore,
  technicalComplexityScore,
  effortEstimate
}: ScoreCardsProps) {
  return (
    <TooltipProvider>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="glass-card">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground font-medium">
                <ScoreLabel>Business Value</ScoreLabel>
              </p>
              <p className="text-2xl font-bold text-emerald-500">
                {businessValueScore !== null ? `${businessValueScore}/100` : '—'}
              </p>
            </div>
            <TrendingUp className="w-8 h-8 text-emerald-500/20" />
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground font-medium">
                <ScoreLabel>Innovation Score</ScoreLabel>
              </p>
              <p className="text-2xl font-bold text-primary">
                {innovationScore !== null ? `${innovationScore}/100` : '—'}
              </p>
            </div>
            <Sparkles className="w-8 h-8 text-primary/20" />
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground font-medium">
                <ScoreLabel>Technical Complexity</ScoreLabel>
              </p>
              <p className="text-2xl font-bold text-amber-500">
                {technicalComplexityScore !== null ? `${technicalComplexityScore}/100` : '—'}
              </p>
            </div>
            <Activity className="w-8 h-8 text-amber-500/20" />
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground font-medium">
                <ScoreLabel>Effort Estimate</ScoreLabel>
              </p>
              <p className="text-2xl font-bold text-blue-500">{effortEstimate}</p>
            </div>
            <Clock className="w-8 h-8 text-blue-500/20" />
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
}

interface VisionRequirementsProps {
  vision: string;
  requirements: string[];
  successMetrics: string[];
  resourceRequirements: string[];
}

function VisionRequirements({ vision, requirements, successMetrics, resourceRequirements }: VisionRequirementsProps) {
  return (
    <div className="space-y-6">
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Target className="w-5 h-5 text-primary" />
            Project Vision
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {vision}
          </p>
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <ListChecks className="w-5 h-5 text-primary" />
            Key Requirements
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3">
            {requirements.map((req, i) => (
              <li key={i} className="flex items-start gap-3 text-sm text-muted-foreground">
                <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-[10px] font-bold text-primary">{i + 1}</span>
                </div>
                {req}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <TrendingUp className="w-5 h-5 text-emerald-500" />
            Success Metrics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {successMetrics?.map((metric, i) => (
              <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                <span className="text-emerald-500">•</span>
                {metric}
              </li>
            )) || <li className="text-sm text-muted-foreground">No success metrics generated.</li>}
          </ul>
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Activity className="w-5 h-5 text-blue-500" />
            Resource Requirements
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {resourceRequirements?.map((res, i) => (
              <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                <span className="text-blue-500">•</span>
                {res}
              </li>
            )) || <li className="text-sm text-muted-foreground">No resource requirements generated.</li>}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

interface RoadmapStep {
  phase: string;
  task: string;
}

interface ArchitectureRoadmapProps {
  architecture: string;
  roadmap: RoadmapStep[];
}

function ArchitectureRoadmap({ architecture, roadmap }: ArchitectureRoadmapProps) {
  return (
    <div className="space-y-6">
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Layout className="w-5 h-5 text-primary" />
            Architecture
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {architecture}
          </p>
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Milestone className="w-5 h-5 text-primary" />
            Roadmap
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {roadmap.map((step, i) => (
              <div key={i} className="flex items-center gap-4">
                <Badge variant="outline" className="w-20 justify-center">{step.phase}</Badge>
                <div className="h-px flex-1 bg-border" />
                <span className="text-sm font-medium">{step.task}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

interface SWOTData {
  strengths: string[];
  weaknesses: string[];
  opportunities: string[];
  threats: string[];
}

interface RadarItem {
  subject: string;
  A: number;
}

interface AnalysisSectionProps {
  swot: SWOTData;
  radarData: RadarItem[];
  riskAssessment: string[];
}

function AnalysisSection({ swot, radarData, riskAssessment }: AnalysisSectionProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-base">SWOT Analysis</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <p className="text-[10px] font-bold text-emerald-500 uppercase">Strengths</p>
            {swot.strengths.map((s) => <p key={s} className="text-xs text-muted-foreground">• {s}</p>)}
          </div>
          <div className="space-y-2">
            <p className="text-[10px] font-bold text-amber-500 uppercase">Weaknesses</p>
            {swot.weaknesses.map((s) => <p key={s} className="text-xs text-muted-foreground">• {s}</p>)}
          </div>
          <div className="space-y-2">
            <p className="text-[10px] font-bold text-blue-500 uppercase">Opportunities</p>
            {swot.opportunities.map((s) => <p key={s} className="text-xs text-muted-foreground">• {s}</p>)}
          </div>
          <div className="space-y-2">
            <p className="text-[10px] font-bold text-destructive uppercase">Threats</p>
            {swot.threats.map((s) => <p key={s} className="text-xs text-muted-foreground">• {s}</p>)}
          </div>
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-base">Impact Radar Chart</CardTitle>
        </CardHeader>
        <CardContent className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
              <PolarGrid stroke="hsl(var(--border))" />
              <PolarAngleAxis dataKey="subject" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} />
              <Radar
                name="Impact"
                dataKey="A"
                stroke="hsl(var(--primary))"
                fill="hsl(var(--primary))"
                fillOpacity={0.5}
              />
            </RadarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-500" />
            Risk Assessment
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {riskAssessment.map((risk, idx) => (
            <div key={idx} className="flex items-start gap-2 text-xs text-muted-foreground">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
              <span>{risk}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

// ==========================================
// MAIN GENERATOR PAGE COMPONENT
// ==========================================

export default function GeneratorPage() {
  const [idea, setIdea] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [isAIConnected, setIsAIConnected] = useState<boolean | null>(null);
  const [connectedProviderName, setConnectedProviderName] = useState<string | null>(null);
  const { toast } = useToast();

  const checkAIConnection = async () => {
    try {
      const provider = await getActiveConnectedProvider();
      setIsAIConnected(!!provider);
      setConnectedProviderName(provider ? provider.provider_name : null);
    } catch (error) {
      console.error('Failed to check AI provider connection:', error);
      setIsAIConnected(false);
      setConnectedProviderName(null);
    }
  };

  useEffect(() => {
    checkAIConnection();
  }, []);

  const handleGenerate = async () => {
    if (!idea.trim()) return;

    // Re-check the connection right before generating, so a key removed in
    // another tab/session can't be used to slip past a stale "connected" state.
    const provider = await getActiveConnectedProvider();
    if (!provider) {
      setIsAIConnected(false);
      setConnectedProviderName(null);
      toast({
        title: "No AI Provider Connected",
        description: "Connect and verify a valid API key in Settings before generating a project blueprint.",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    setResult(null);

    try {
      // 1. Save project idea to Supabase
      await projectService.createProject(idea);

      // 2. Generate the blueprint using the connected AI provider only.
      //    No placeholder/default content is ever substituted here.
      const prompt = `
You are an expert enterprise architect and product strategist.
Generate a comprehensive, highly customized project blueprint based on this idea: "${idea}"

Return strictly a JSON object with the following structure (do not include any markdown formatting or backticks, just raw JSON):
{
  "vision": "A highly customized, inspiring vision statement for this project.",
  "requirements": [
    "Requirement 1 specific to this idea",
    "Requirement 2 specific to this idea",
    "Requirement 3 specific to this idea",
    "Requirement 4 specific to this idea"
  ],
  "architecture": "A detailed, customized architectural description (e.g., tech stack, patterns, data flow) tailored specifically to this idea.",
  "roadmap": [
    { "phase": "Phase 1", "task": "Custom task 1" },
    { "phase": "Phase 2", "task": "Custom task 2" },
    { "phase": "Phase 3", "task": "Custom task 3" }
  ],
  "swot": {
    "strengths": ["Strength 1", "Strength 2"],
    "weaknesses": ["Weakness 1", "Weakness 2"],
    "opportunities": ["Opportunity 1", "Opportunity 2"],
    "threats": ["Threat 1", "Threat 2"]
  },
  "radarData": [
    { "subject": "Innovation", "A": 110 },
    { "subject": "Feasibility", "A": 95 },
    { "subject": "Impact", "A": 120 },
    { "subject": "Risk", "A": 65 },
    { "subject": "Cost", "A": 80 }
  ],
  "riskAssessment": [
    "Risk 1 specific to this idea",
    "Risk 2 specific to this idea"
  ],
  "successMetrics": [
    "Metric 1: e.g., 30% reduction in latency",
    "Metric 2: e.g., 95% user adoption rate"
  ],
  "resourceRequirements": [
    "Resource 1: e.g., 2 Senior Frontend Engineers",
    "Resource 2: e.g., AWS Cloud Infrastructure budget"
  ],
  "effortEstimate": "3-6 Months",
  "businessValueScore": 85,
  "innovationScore": 90,
  "technicalComplexityScore": 75
}

Scoring guidance - derive these four fields FROM the vision, requirements, architecture, and roadmap above, do not invent independent numbers:
- businessValueScore (0-100): reflect the market demand and clarity of the value proposition implied by the vision and success metrics above.
- innovationScore (0-100): reflect how novel the approach in the architecture and requirements is relative to standard/common solutions for this kind of project.
- technicalComplexityScore (0-100): reflect the number and difficulty of architectural components, integrations, and roadmap phases listed above - more components/phases and harder integrations should score higher.
- effortEstimate: a short human-readable estimate (e.g. "3-6 Months") consistent with the technicalComplexityScore and roadmap length above - higher complexity and more phases should imply a longer estimate.
`;

      const generatedResult = validateBlueprint(await generateJSON(prompt));

      setResult(generatedResult);
      await notificationService.addNotification('Project Generated', `Successfully generated blueprint for "${idea.substring(0, 30)}..." using ${provider.provider_name}`, 'success');

      toast({
        title: "Project Generated",
        description: `Blueprint generated by ${provider.provider_name} and saved successfully.`,
      });
    } catch (error: any) {
      console.error('Error generating project blueprint:', error);

      if (error instanceof AIConnectionError) {
        // Connection/auth/parsing failure from the AI provider itself - surface it directly, no fallback text.
        setIsAIConnected(false);
        toast({
          title: "AI Generation Failed",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error Generating Project",
          description: "Failed to generate or save the project. Please try again.",
          variant: "destructive",
        });
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadJSON = () => {
    if (!result) return;
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(result, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `blueprint_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    toast({ title: "JSON Exported", description: "Project blueprint downloaded as JSON." });
  };

  const handleDownloadMarkdown = () => {
    if (!result) return;
    const mdContent = `
# Project Blueprint: ${idea}

## Vision
${result.vision}

## Key Requirements
${result.requirements.map((r: string) => `- ${r}`).join('\n')}

## Architecture
${result.architecture}

## Roadmap
${result.roadmap.map((step: any) => `- **${step.phase}**: ${step.task}`).join('\n')}

## SWOT Analysis
- **Strengths**: ${result.swot.strengths.join(', ')}
- **Weaknesses**: ${result.swot.weaknesses.join(', ')}
- **Opportunities**: ${result.swot.opportunities.join(', ')}
- **Threats**: ${result.swot.threats.join(', ')}
`;
    const dataStr = "data:text/markdown;charset=utf-8," + encodeURIComponent(mdContent.trim());
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `blueprint_${Date.now()}.md`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    toast({ title: "Markdown Exported", description: "Project blueprint downloaded as Markdown." });
  };

  const cleanText = (text: string) => {
    if (!text) return '';
    return text.replace(/\*\*/g, '').trim();
  };

  const formatScore = (score: number | null | undefined) =>
    score !== null && score !== undefined ? `${score}/100` : '—';

  const handleDownloadPDF = () => {
    if (!result) return;
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(22);
    doc.setTextColor(124, 58, 237); // Primary color
    doc.text('Project Blueprint Report', 14, 20);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 27);
    doc.line(14, 30, 196, 30);

    // Section 1: Vision
    doc.setFontSize(14);
    doc.setTextColor(124, 58, 237);
    doc.text('1. Project Vision', 14, 40);
    doc.setFontSize(10);
    doc.setTextColor(60);
    const splitVision = doc.splitTextToSize(cleanText(result.vision), 180);
    doc.text(splitVision, 14, 47);

    let yOffset = 47 + (splitVision.length * 5) + 10;

    // Section 2: Key Requirements
    doc.setFontSize(14);
    doc.setTextColor(124, 58, 237);
    doc.text('2. Key Requirements', 14, yOffset);
    yOffset += 7;
    doc.setFontSize(10);
    doc.setTextColor(60);
    result.requirements.forEach((req: string, idx: number) => {
      const splitReq = doc.splitTextToSize(`${idx + 1}. ${cleanText(req)}`, 180);
      doc.text(splitReq, 14, yOffset);
      yOffset += splitReq.length * 5;
    });

    yOffset += 10;

    // Section 3: Architecture
    if (yOffset > 240) {
      doc.addPage();
      yOffset = 20;
    }
    doc.setFontSize(14);
    doc.setTextColor(124, 58, 237);
    doc.text('3. Architecture', 14, yOffset);
    yOffset += 7;
    doc.setFontSize(10);
    doc.setTextColor(60);
    const splitArch = doc.splitTextToSize(cleanText(result.architecture), 180);
    doc.text(splitArch, 14, yOffset);
    yOffset += (splitArch.length * 5) + 10;

    // Section 4: Roadmap
    if (yOffset > 240) {
      doc.addPage();
      yOffset = 20;
    }
    doc.setFontSize(14);
    doc.setTextColor(124, 58, 237);
    doc.text('4. Implementation Roadmap', 14, yOffset);
    yOffset += 7;
    doc.setFontSize(10);
    doc.setTextColor(60);
    result.roadmap.forEach((step: any) => {
      doc.text(`• [${cleanText(step.phase)}]: ${cleanText(step.task)}`, 14, yOffset);
      yOffset += 6;
    });

    yOffset += 10;

    // Section 5: SWOT Analysis
    if (yOffset > 240) {
      doc.addPage();
      yOffset = 20;
    }
    doc.setFontSize(14);
    doc.setTextColor(124, 58, 237);
    doc.text('5. SWOT Analysis', 14, yOffset);
    yOffset += 7;
    doc.setFontSize(10);
    doc.setTextColor(60);
    doc.text(`Strengths: ${result.swot.strengths.map(cleanText).join(', ')}`, 14, yOffset);
    yOffset += 6;
    doc.text(`Weaknesses: ${result.swot.weaknesses.map(cleanText).join(', ')}`, 14, yOffset);
    yOffset += 6;
    doc.text(`Opportunities: ${result.swot.opportunities.map(cleanText).join(', ')}`, 14, yOffset);
    yOffset += 6;
    doc.text(`Threats: ${result.swot.threats.map(cleanText).join(', ')}`, 14, yOffset);

    yOffset += 15;

    // Section 6: Infographs / Metrics
    if (yOffset > 240) {
      doc.addPage();
      yOffset = 20;
    }
    doc.setFontSize(14);
    doc.setTextColor(124, 58, 237);
    doc.text('6. Executive Metrics & Scores', 14, yOffset);
    yOffset += 10;

    // Draw clean infograph boxes
    doc.setFillColor(240, 240, 255);
    doc.rect(14, yOffset, 50, 25, 'F');
    doc.setTextColor(124, 58, 237);
    doc.setFontSize(10);
    doc.text('Business Value', 18, yOffset + 8);
    doc.setFontSize(14);
    doc.text(formatScore(result.businessValueScore), 18, yOffset + 18);

    doc.setFillColor(240, 255, 240);
    doc.rect(74, yOffset, 50, 25, 'F');
    doc.setTextColor(16, 185, 129);
    doc.setFontSize(10);
    doc.text('Innovation Score', 78, yOffset + 8);
    doc.setFontSize(14);
    doc.text(formatScore(result.innovationScore), 78, yOffset + 18);

    doc.setFillColor(255, 247, 237);
    doc.rect(134, yOffset, 50, 25, 'F');
    doc.setTextColor(245, 158, 11);
    doc.setFontSize(10);
    doc.text('Complexity', 138, yOffset + 8);
    doc.setFontSize(14);
    doc.text(formatScore(result.technicalComplexityScore), 138, yOffset + 18);

    doc.save(`blueprint_${Date.now()}.pdf`);
    toast({ title: "PDF Exported", description: "Project blueprint downloaded as PDF." });
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Project Generator</h1>
          <p className="text-muted-foreground">Turn ideas into structured project blueprints using organizational intelligence.</p>
        </div>
      </div>

      {isAIConnected === false && (
        <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20 flex items-start gap-3 text-sm">
          <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold text-destructive">No AI Provider Connected</p>
            <p className="text-muted-foreground">
              The generator only produces real, AI-generated blueprints. Connect and verify a valid API key
              for a provider (Google, OpenAI, Anthropic, DeepSeek, OpenRouter, or Perplexity) in Settings to continue.
            </p>
            <Button asChild variant="outline" size="sm" className="mt-2 gap-2">
              <Link to="/settings">
                <SettingsIcon className="w-3.5 h-3.5" />
                Go to Settings
              </Link>
            </Button>
          </div>
        </div>
      )}

      {isAIConnected === true && connectedProviderName && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 gap-1.5">
            <Sparkles className="w-3 h-3" />
            {connectedProviderName} Connected
          </Badge>
          <span>Blueprints are generated live by {connectedProviderName}.</span>
        </div>
      )}

      <Card className="glass-card border-primary/20">
        <CardContent className="p-6 space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Project Idea</label>
            <Textarea 
              placeholder="Describe your project idea in detail..." 
              className="min-h-[120px] bg-secondary/30 border-none focus-visible:ring-primary"
              value={idea}
              onChange={(e) => setIdea(e.target.value)}
              disabled={isGenerating}
            />
          </div>
          <Button 
            className="w-full h-12 gap-2" 
            onClick={handleGenerate}
            disabled={isGenerating || !idea.trim() || isAIConnected === false}
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Generating Blueprint...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Generate Project Blueprint
              </>
            )}
          </Button>
          {isAIConnected === false && (
            <p className="text-xs text-center text-muted-foreground">
              Generation is disabled until an AI provider is connected in Settings.
            </p>
          )}
        </CardContent>
      </Card>

      <AnimatePresence>
        {result && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
          >
            {/* Score Cards */}
            <ScoreCards 
              businessValueScore={result.businessValueScore}
              innovationScore={result.innovationScore}
              technicalComplexityScore={result.technicalComplexityScore}
              effortEstimate={result.effortEstimate}
            />

            {/* Export Actions */}
            <div className="flex flex-wrap gap-3 justify-between items-center">
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleDownloadJSON} className="gap-2">
                  <FileJson className="w-4 h-4" />
                  JSON
                </Button>
                <Button variant="outline" size="sm" onClick={handleDownloadMarkdown} className="gap-2">
                  <FileCode className="w-4 h-4" />
                  Markdown
                </Button>
                <Button variant="outline" size="sm" onClick={handleDownloadPDF} className="gap-2">
                  <FileText className="w-4 h-4" />
                  PDF
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Vision & Requirements */}
              <VisionRequirements 
                vision={result.vision}
                requirements={result.requirements}
                successMetrics={result.successMetrics}
                resourceRequirements={result.resourceRequirements}
              />

              {/* Architecture & Roadmap */}
              <ArchitectureRoadmap 
                architecture={result.architecture}
                roadmap={result.roadmap}
              />
            </div>

            {/* Analysis Section */}
            <AnalysisSection 
              swot={result.swot}
              radarData={result.radarData}
              riskAssessment={result.riskAssessment}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}