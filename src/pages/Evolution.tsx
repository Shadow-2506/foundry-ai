import React, { useState, useEffect, useRef } from 'react';
import { 
  TrendingUp, 
  Activity, 
  Zap, 
  Shield, 
  Rocket,
  Loader2,
  RefreshCw,
  Wifi
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar
} from 'recharts';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { genomeService, GenomeRecord } from '@/services/genomeService';
import * as memoryService from '@/services/memoryService';
import { useToast } from '@/hooks/use-toast';

export default function EvolutionPage() {
  const [genomeHistory, setGenomeHistory] = useState<GenomeRecord[]>([]);
  const [policies, setPolicies] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const { toast } = useToast();
  const unsubscribeRef = useRef<(() => void) | null>(null);

  const fetchEvolutionData = async (showToastOnError = true) => {
    setIsLoading(true);
    try {
      const data = await genomeService.getGenomeHistory();
      setGenomeHistory(data);

      // Load policies from memories table
      const memories = await memoryService.getMemories();
      const policyMemories = memories.filter(m => m.memory_type === 'policy');
      setPolicies(policyMemories);
      setLastSyncedAt(new Date());
    } catch (error) {
      console.error('Error fetching evolution data:', error);
      if (showToastOnError) {
        toast({
          title: "Error loading evolution data",
          description: "Failed to fetch genome data from Supabase.",
          variant: "destructive"
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEvolutionData();

    // Live sync: re-fetch whenever real org data changes (new memories, projects, genome records)
    unsubscribeRef.current = genomeService.subscribeToActivityChanges(() => {
      fetchEvolutionData(false);
    });

    return () => {
      unsubscribeRef.current?.();
    };
  }, []);

  const handleUpdateGenome = async () => {
    setIsUpdating(true);
    try {
      // Derive the new genome record from real Supabase + Parcle activity,
      // not random noise - mirrors the same live calculation used on the Org Brain page.
      const newRecord = await genomeService.deriveGenomeFromActivity();

      await genomeService.updateGenome(newRecord);
      toast({
        title: "Genome synced from live data",
        description: "Recalculated from real decisions, lessons, policies, and projects.",
      });
      await fetchEvolutionData();
    } catch (error) {
      console.error('Error updating genome:', error);
      toast({
        title: "Update failed",
        description: "Failed to save new genome record to Supabase.",
        variant: "destructive"
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const latestRecord = genomeHistory[genomeHistory.length - 1] || {
    innovation: 100,
    quality: 100,
    speed: 100,
    risk: 80,
    cost: 80
  };

  const currentFitness = genomeService.calculateFitnessScore(latestRecord);
  const previousFitness = genomeHistory.length > 1 
    ? genomeService.calculateFitnessScore(genomeHistory[genomeHistory.length - 2])
    : currentFitness;
  const fitnessDiff = currentFitness - previousFitness;

  // Format data for charts with robust fallback to mock data
  const chartData = genomeHistory.length > 0 
    ? genomeHistory.map((record, index) => {
        const date = record.created_at ? new Date(record.created_at) : new Date();
        const month = date.toLocaleDateString('en-US', { month: 'short' });
        return {
          month: `${month} #${index + 1}`,
          score: genomeService.calculateFitnessScore(record),
          innovation: record.innovation,
          quality: record.quality,
          speed: record.speed
        };
      })
    : [
        { month: 'Jan', score: 65, innovation: 40, quality: 70, speed: 80 },
        { month: 'Feb', score: 68, innovation: 45, quality: 72, speed: 82 },
        { month: 'Mar', score: 72, innovation: 55, quality: 75, speed: 85 },
        { month: 'Apr', score: 75, innovation: 60, quality: 78, speed: 88 },
        { month: 'May', score: 80, innovation: 75, quality: 82, speed: 90 },
        { month: 'Jun', score: 84, innovation: 85, quality: 85, speed: 95 },
      ];

  const timelineItems = policies.length > 0
    ? policies.slice(0, 4).map(p => ({
        date: p.created_at ? new Date(p.created_at).toLocaleDateString(undefined, { month: 'short', year: 'numeric' }) : 'Just now',
        title: p.content.length > 30 ? p.content.substring(0, 30) + '...' : p.content,
        type: 'Policy'
      }))
    : [
        { date: 'Jun 2024', title: 'AI Governance Policy', type: 'Policy' },
        { date: 'May 2024', title: 'Micro-services Lesson', type: 'Lesson' },
        { date: 'Mar 2024', title: 'Remote-First Update', type: 'Policy' },
        { date: 'Jan 2024', title: 'Tech Stack Audit', type: 'Audit' },
      ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Evolution Engine</h1>
          <p className="text-muted-foreground">Track how your organization learns and adapts over time.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={handleUpdateGenome} disabled={isUpdating} className="gap-2">
            {isUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Sync Genome
          </Button>
          <Badge variant="outline" className="bg-emerald-500/5 text-emerald-500 border-emerald-500/20">
            Fitness: {fitnessDiff >= 0 ? `+${fitnessDiff}` : fitnessDiff}% vs Prev
          </Badge>
          <Badge variant="outline" className="h-8 px-3 gap-2 bg-primary/5 text-primary border-primary/20">
            <Wifi className="w-3 h-3" />
            {lastSyncedAt ? lastSyncedAt.toLocaleTimeString() : 'Syncing...'}
          </Badge>
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading evolution data from Supabase...</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Fitness Score Evolution */}
            <Card className="lg:col-span-2 glass-card">
              <CardHeader>
                <CardTitle>Organizational Fitness Score</CardTitle>
                <CardDescription>Composite score based on innovation, quality, and speed.</CardDescription>
              </CardHeader>
              <CardContent className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                    />
                    <Area type="monotone" dataKey="score" stroke="hsl(var(--primary))" fillOpacity={1} fill="url(#colorScore)" strokeWidth={3} />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Key Milestones */}
            <Card className="glass-card">
              <CardHeader>
                <CardTitle>Learning Timeline</CardTitle>
                <CardDescription>Major policy shifts and lessons.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {timelineItems.map((item, i) => (
                    <div key={i} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className="w-2 h-2 rounded-full bg-primary" />
                        {i !== timelineItems.length - 1 && <div className="w-0.5 flex-1 bg-border my-1" />}
                      </div>
                      <div className="pb-4">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{item.date}</p>
                        <p className="text-sm font-medium">{item.title}</p>
                        <Badge variant="secondary" className="text-[9px] h-4 mt-1">{item.type}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard title="Innovation Velocity" value={`${Math.round((latestRecord.innovation / 150) * 100)}%`} trend="up" icon={Zap} />
            <MetricCard title="Quality Retention" value={`${Math.round((latestRecord.quality / 150) * 100)}%`} trend="up" icon={Shield} />
            <MetricCard title="Decision Speed" value={`${Math.round((latestRecord.speed / 150) * 100)}%`} trend="up" icon={Rocket} />
            <MetricCard title="Risk Mitigation" value={`${Math.round(((150 - latestRecord.risk) / 150) * 100)}%`} trend="down" icon={Activity} />
          </div>

          {/* Policy Evolution */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Policy Evolution Impact</CardTitle>
              <CardDescription>How new policies affected organizational dimensions.</CardDescription>
            </CardHeader>
            <CardContent className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                  />
                  <Bar dataKey="innovation" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="quality" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function MetricCard({ title, value, trend, icon: Icon }: any) {
  return (
    <Card className="glass-card">
      <CardContent className="p-4 flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground font-medium">{title}</p>
          <p className="text-xl font-bold">{value}</p>
        </div>
        <div className={cn(
          "w-10 h-10 rounded-full flex items-center justify-center",
          trend === 'up' ? "bg-emerald-500/10 text-emerald-500" : "bg-amber-500/10 text-amber-500"
        )}>
          <Icon className="w-5 h-5" />
        </div>
      </CardContent>
    </Card>
  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}