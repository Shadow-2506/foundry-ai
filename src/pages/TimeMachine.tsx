import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Memory } from '@/services/memoryService';
import { askTimeMachine } from '@/services/timeMachineService';
import { getActiveConnectedProvider, AIConnectionError } from '@/services/aiClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, History, Sparkles, ShieldAlert, CheckCircle2, AlertTriangle, ArrowRight, FileText, TrendingUp, Lightbulb, HelpCircle, Settings as SettingsIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function TimeMachinePage() {
  const { toast } = useToast();
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState<string | null>(null);
  const [executiveSummary, setExecutiveSummary] = useState<string>('');
  const [sources, setSources] = useState<Memory[]>([]);
  const [confidenceScore, setConfidenceScore] = useState<number>(0);
  const [timeline, setTimeline] = useState<any[]>([]);
  const [riskAnalysis, setRiskAnalysis] = useState<string[]>([]);
  const [recommendedAction, setRecommendedAction] = useState<string>('');
  const [sourcesUsed, setSourcesUsed] = useState<string[]>([]);
  const [relatedDecisions, setRelatedDecisions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAIConnected, setIsAIConnected] = useState<boolean | null>(null);

  useEffect(() => {
    getActiveConnectedProvider()
      .then(provider => setIsAIConnected(!!provider))
      .catch(() => setIsAIConnected(false));
  }, []);

  const handleAsk = async () => {
    if (!question.trim()) return;
    setIsLoading(true);
    setAnswer(null);
    try {
      const result = await askTimeMachine(question);
      setAnswer(result.answer);
      setExecutiveSummary(result.executiveSummary);
      setSources(result.supportingMemories);
      setConfidenceScore(result.confidenceScore);
      setTimeline(result.timeline);
      setRiskAnalysis(result.riskAnalysis);
      setRecommendedAction(result.recommendedAction);
      setSourcesUsed(result.sourcesUsed);
      setRelatedDecisions(result.relatedDecisions);
    } catch (err: any) {
      console.error(err);
      if (err instanceof AIConnectionError) {
        setIsAIConnected(false);
      }
      toast({
        title: err instanceof AIConnectionError ? 'No AI Provider Connected' : 'Error',
        description: err?.message || 'Failed to retrieve answer from the Time Machine.',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <History className="w-8 h-8 text-primary" />
          Corporate Time Machine
        </h1>
        <p className="text-muted-foreground">Query the organizational memory to retrieve historical context and lineage.</p>
      </div>

      {isAIConnected === false && (
        <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20 flex items-start gap-3 text-sm">
          <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold text-destructive">No AI Provider Connected</p>
            <p className="text-muted-foreground">
              The Time Machine synthesizes answers using whichever AI provider you've connected in Settings.
              Connect and verify a valid API key to ask questions.
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

      <Card className="glass-card border-primary/20">
        <CardHeader>
          <CardTitle>Ask a question about organizational history</CardTitle>
          <CardDescription>Enter a query and the system will retrieve relevant memories and synthesize an answer.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3">
            <Input
              type="text"
              placeholder="e.g., Why did we choose React?"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAsk()}
              className="flex-1 bg-secondary/30 border-none focus-visible:ring-primary"
              disabled={isLoading}
            />
            <Button onClick={handleAsk} disabled={isLoading || !question.trim() || isAIConnected === false} className="gap-2">
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              Ask Time Machine
            </Button>
          </div>

          {isLoading && (
            <div className="flex flex-col items-center justify-center py-12 space-y-3">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Consulting the organizational brain...</p>
            </div>
          )}

          {answer && (
            <div className="space-y-8 pt-6 border-t border-border">
              {/* Executive Summary Card */}
              <Card className="bg-primary/5 border-primary/20">
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-primary uppercase tracking-wider flex items-center gap-2">
                      <Sparkles className="w-4 h-4" />
                      Executive Summary
                    </h4>
                    <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                      Confidence Score: {confidenceScore}%
                    </Badge>
                  </div>
                  <p className="text-sm text-foreground/90 leading-relaxed">
                    {executiveSummary}
                  </p>
                </CardContent>
              </Card>

              {/* Professional Layout Sections */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Historical Context */}
                <Card className="glass-card border-l-4 border-l-blue-500">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-bold flex items-center gap-2 text-blue-500">
                      <HelpCircle className="w-4 h-4" />
                      Historical Context
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {answer}
                    </p>
                  </CardContent>
                </Card>

                {/* Impact Analysis */}
                <Card className="glass-card border-l-4 border-l-emerald-500">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-bold flex items-center gap-2 text-emerald-500">
                      <TrendingUp className="w-4 h-4" />
                      Impact Analysis
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {riskAnalysis.map((risk, idx) => (
                        <li key={idx} className="text-xs text-muted-foreground flex items-start gap-2">
                          <span className="text-emerald-500">•</span>
                          {risk}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>

                {/* Recommendation */}
                <Card className="glass-card border-l-4 border-l-purple-500">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-bold flex items-center gap-2 text-purple-500">
                      <Lightbulb className="w-4 h-4" />
                      Recommendation
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {recommendedAction}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Timeline Context */}
              <div className="space-y-3">
                <h4 className="font-semibold text-sm flex items-center gap-2">
                  <History className="w-4 h-4 text-primary" />
                  Timeline View
                </h4>
                <div className="space-y-4 pl-4 border-l-2 border-primary/30">
                  {timeline.map((item, idx) => (
                    <div key={idx} className="relative">
                      <div className="absolute -left-[21px] top-1.5 w-2 h-2 rounded-full bg-primary" />
                      <div className="space-y-1">
                        <span className="text-xs font-bold text-primary">{item.year} - {item.event}</span>
                        <p className="text-xs text-muted-foreground">{item.detail}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Related Decisions & Sources Used */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm">Related Decisions</h4>
                  <div className="flex flex-wrap gap-2">
                    {relatedDecisions.map((dec, idx) => (
                      <Badge key={idx} variant="secondary" className="text-xs">
                        {dec}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="font-semibold text-sm">Sources Used</h4>
                  <div className="flex flex-wrap gap-2">
                    {sourcesUsed.map((src, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs">
                        {src}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>

              {/* Supporting Memories */}
              {sources.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-semibold text-sm">Supporting Memories Used</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {sources.map((src) => (
                      <Card key={src.id} className="bg-secondary/10 border-border/50">
                        <CardContent className="p-3 space-y-2">
                          <Badge variant="outline" className="capitalize text-[10px]">
                            {src.memory_type}
                          </Badge>
                          <p className="text-xs text-muted-foreground line-clamp-3">{src.content}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}