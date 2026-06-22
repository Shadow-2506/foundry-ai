import React, { useState } from 'react';
import { 
  Play, 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  Sparkles, 
  ArrowRight, 
  RotateCcw,
  FolderPlus,
  Database,
  Lightbulb,
  ShieldAlert,
  Activity,
  History,
  FileText
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { projectService } from '@/services/projectService';
import { createMemory } from '@/services/memoryService';
import { generateLesson, generatePolicy, updateGenome } from '@/services/learningService';
import { askTimeMachine } from '@/services/timeMachineService';
import { demoGeneratorService } from '@/services/demoGeneratorService';
import { notificationService } from '@/services/notificationService';

interface DemoStep {
  id: number;
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  status: 'idle' | 'running' | 'completed' | 'failed';
  result?: string;
  action: () => Promise<string>;
}

export default function DemoMode() {
  const { toast } = useToast();
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);

  const [steps, setSteps] = useState<DemoStep[]>([
    {
      id: 1,
      title: 'Create Project',
      description: 'Initialize a new project initiative in the organizational database.',
      icon: FolderPlus,
      status: 'idle',
      action: async () => {
        const randomProj = demoGeneratorService.generateProject();
        const project = await projectService.createProject(randomProj.name);
        await notificationService.addNotification('Project Generated', `Initialized project: "${project.name}"`, 'success');
        return `Created project: "${project.name}" (ID: ${project.id})`;
      }
    },
    {
      id: 2,
      title: 'Create Decision',
      description: 'Record a critical engineering decision in the database.',
      icon: FileText,
      status: 'idle',
      action: async () => {
        const randomDec = demoGeneratorService.generateDecision();
        const decision = await createMemory({
          memory_type: 'decision',
          content: JSON.stringify(randomDec),
          visibility: 'public'
        });
        await notificationService.addNotification('Memory Added', `Recorded decision: "${randomDec.title}"`, 'success');
        return `Created decision: "${randomDec.title}" in memories and decisions tables.`;
      }
    },
    {
      id: 3,
      title: 'Store Memory',
      description: 'Record a general organizational memory in the Memory Vault.',
      icon: Database,
      status: 'idle',
      action: async () => {
        const randomLesson = demoGeneratorService.generateLesson();
        const memory = await createMemory({
          memory_type: 'lesson',
          content: randomLesson,
          visibility: 'public'
        });
        await notificationService.addNotification('Memory Added', 'Stored a new lesson in the Memory Vault.', 'success');
        return `Stored memory in Supabase & Parcle.`;
      }
    },
    {
      id: 4,
      title: 'Generate Lesson',
      description: 'Extract actionable intelligence and lessons learned from the decision outcome.',
      icon: Lightbulb,
      status: 'idle',
      action: async () => {
        const randomDec = demoGeneratorService.generateDecision();
        const lesson = await generateLesson({
          id: 'demo-decision-id',
          title: randomDec.title,
          outcome: randomDec.outcome,
          timestamp: new Date().toISOString()
        });
        await notificationService.addNotification('New Lesson Extracted', `Extracted lesson from "${randomDec.title}"`, 'info');
        return `Extracted Lesson: "${lesson.content.substring(0, 80)}..."`;
      }
    },
    {
      id: 5,
      title: 'Generate Policy',
      description: 'Codify the lesson learned into an official organizational policy.',
      icon: ShieldAlert,
      status: 'idle',
      action: async () => {
        const randomLesson = demoGeneratorService.generateLesson();
        const policy = await generatePolicy({
          id: 'demo-lesson-id',
          decisionId: 'demo-decision-id',
          content: randomLesson,
          generatedAt: new Date().toISOString()
        });
        await notificationService.addNotification('Policy Created', 'Codified a new organizational policy.', 'info');
        return `Codified Policy: "${policy.content.substring(0, 80)}..."`;
      }
    },
    {
      id: 6,
      title: 'Update Genome',
      description: 'Recalculate the organizational genome and fitness score based on the new policy.',
      icon: Activity,
      status: 'idle',
      action: async () => {
        const randomPolicy = demoGeneratorService.generatePolicy();
        const update = await updateGenome({
          id: 'demo-policy-id',
          lessonId: 'demo-lesson-id',
          content: randomPolicy,
          source: 'supabase',
          createdAt: new Date().toISOString()
        });
        await notificationService.addNotification('AI Analysis Finished', `Updated genome dimension: ${update.key}`, 'info');
        return `Updated Genome: Increased ${update.key} by +${update.value}`;
      }
    },
    {
      id: 7,
      title: 'Ask Time Machine',
      description: 'Query the organizational memory to retrieve historical context and lineage.',
      icon: History,
      status: 'idle',
      action: async () => {
        const tech = demoGeneratorService.getRandomItem(demoGeneratorService.technologies);
        const result = await askTimeMachine(`Why did we choose ${tech}?`);
        return `Time Machine Answer: "${result.answer.substring(0, 100)}..."`;
      }
    }
  ]);

  const runStep = async (index: number): Promise<boolean> => {
    if (index < 0 || index >= steps.length) return false;

    setSteps(prev => prev.map((step, i) => i === index ? { ...step, status: 'running' } : step));

    try {
      const resultText = await steps[index].action();
      setSteps(prev => prev.map((step, i) => i === index ? { 
        ...step, 
        status: 'completed', 
        result: resultText 
      } : step));
      
      toast({
        title: `Step ${index + 1} Completed`,
        description: steps[index].title,
      });
      return true;
    } catch (error: any) {
      setSteps(prev => prev.map((step, i) => i === index ? { 
        ...step, 
        status: 'failed', 
        result: error.message || 'An error occurred.' 
      } : step));
      
      toast({
        title: `Step ${index + 1} Failed`,
        description: error.message || 'An error occurred.',
        variant: 'destructive'
      });
      return false;
    }
  };

  const handleNextStep = async () => {
    if (currentStepIndex >= steps.length) return;
    const success = await runStep(currentStepIndex);
    if (success && currentStepIndex < steps.length - 1) {
      setCurrentStepIndex(prev => prev + 1);
    }
  };

  const handleAutoPlay = async () => {
    setIsAutoPlaying(true);
    let currentIndex = currentStepIndex;

    // If we are at the end, reset first
    if (currentIndex >= steps.length - 1 && steps[currentIndex].status === 'completed') {
      handleReset();
      currentIndex = 0;
    }

    for (let i = currentIndex; i < steps.length; i++) {
      setCurrentStepIndex(i);
      const success = await runStep(i);
      if (!success) break;
      // Small delay between steps for visual effect
      await new Promise(resolve => setTimeout(resolve, 1500));
    }
    setIsAutoPlaying(false);
  };

  const handleReset = () => {
    setSteps(prev => prev.map(step => ({ ...step, status: 'idle', result: undefined })));
    setCurrentStepIndex(0);
    setIsAutoPlaying(false);
    toast({
      title: 'Demo Reset',
      description: 'Walkthrough has been reset to the beginning.',
    });
  };

  const completedCount = steps.filter(s => s.status === 'completed').length;
  const progressPercentage = (completedCount / steps.length) * 100;

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Sparkles className="w-8 h-8 text-primary animate-pulse" />
            Demo Mode Walkthrough
          </h1>
          <p className="text-muted-foreground">
            Experience the complete lifecycle of organizational intelligence from project creation to genome evolution.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={handleReset} disabled={isAutoPlaying} className="gap-2">
            <RotateCcw className="w-4 h-4" />
            Reset
          </Button>
          <Button onClick={handleAutoPlay} disabled={isAutoPlaying} className="gap-2">
            {isAutoPlaying ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Running Demo...
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                Run Auto-Play
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Progress Tracker */}
      <Card className="glass-card">
        <CardContent className="p-6 space-y-4">
          <div className="flex justify-between items-center text-sm">
            <span className="font-medium text-muted-foreground">Overall Progress</span>
            <span className="font-bold text-primary">{completedCount} of {steps.length} Steps Completed</span>
          </div>
          <Progress value={progressPercentage} className="h-2" />
        </CardContent>
      </Card>

      {/* Steps Walkthrough */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Side: Steps List */}
        <div className="lg:col-span-2 space-y-4">
          {steps.map((step, index) => {
            const StepIcon = step.icon;
            const isActive = index === currentStepIndex;
            const isCompleted = step.status === 'completed';
            const isRunning = step.status === 'running';
            const isFailed = step.status === 'failed';

            return (
              <Card 
                key={step.id} 
                className={`glass-card transition-all duration-300 ${
                  isActive ? 'border-primary ring-1 ring-primary/30 bg-primary/5' : 'opacity-80'
                }`}
              >
                <CardContent className="p-5 flex items-start gap-4">
                  {/* Step Number / Icon */}
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    isCompleted ? 'bg-emerald-500/10 text-emerald-500' :
                    isFailed ? 'bg-destructive/10 text-destructive' :
                    isActive ? 'bg-primary/20 text-primary' : 'bg-secondary text-muted-foreground'
                  }`}>
                    {isRunning ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : isCompleted ? (
                      <CheckCircle2 className="w-5 h-5" />
                    ) : isFailed ? (
                      <XCircle className="w-5 h-5" />
                    ) : (
                      <StepIcon className="w-5 h-5" />
                    )}
                  </div>

                  {/* Step Details */}
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-semibold text-sm flex items-center gap-2">
                        <span>Step {step.id}: {step.title}</span>
                        {isActive && <Badge className="text-[10px] h-4">Active</Badge>}
                      </h3>
                      <Badge variant="outline" className={`text-[10px] capitalize ${
                        isCompleted ? 'border-emerald-500/20 bg-emerald-500/5 text-emerald-500' :
                        isFailed ? 'border-destructive/20 bg-destructive/5 text-destructive' :
                        isRunning ? 'border-primary/20 bg-primary/5 text-primary' : 'border-border'
                      }`}>
                        {step.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {step.description}
                    </p>

                    {/* Step Result Output */}
                    {step.result && (
                      <div className="mt-3 p-3 rounded-lg bg-secondary/50 border border-border/50 font-mono text-[11px] text-foreground/90 break-all">
                        {step.result}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Right Side: Interactive Controller */}
        <div className="space-y-6">
          <Card className="glass-card sticky top-24">
            <CardHeader>
              <CardTitle className="text-lg">Interactive Controller</CardTitle>
              <CardDescription>Control the walkthrough step-by-step.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {currentStepIndex < steps.length ? (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-secondary/30 border border-border/50 space-y-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-primary">Next Action</span>
                    <h4 className="font-bold text-sm">{steps[currentStepIndex].title}</h4>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {steps[currentStepIndex].description}
                    </p>
                  </div>

                  <Button 
                    className="w-full h-11 gap-2" 
                    onClick={handleNextStep}
                    disabled={isAutoPlaying || steps[currentStepIndex].status === 'running'}
                  >
                    {steps[currentStepIndex].status === 'running' ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Executing...
                      </>
                    ) : (
                      <>
                        Execute Step {currentStepIndex + 1}
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </Button>
                </div>
              ) : (
                <div className="text-center py-6 space-y-4">
                  <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-bold text-sm">Walkthrough Complete!</h4>
                    <p className="text-xs text-muted-foreground">
                      You have successfully explored the entire organizational intelligence lifecycle.
                    </p>
                  </div>
                  <Button variant="outline" className="w-full gap-2" onClick={handleReset}>
                    <RotateCcw className="w-4 h-4" />
                    Restart Walkthrough
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}