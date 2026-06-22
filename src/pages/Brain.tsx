import React, { useState, useEffect, useRef } from 'react';
import { 
  Radar, 
  RadarChart, 
  PolarGrid, 
  PolarAngleAxis, 
  PolarRadiusAxis, 
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Brain, Zap, Shield, Rocket, RefreshCw, Loader2, FileText, Lightbulb, ShieldCheck, FolderKanban, Wifi, WifiOff } from 'lucide-react';
import { genomeService, GenomeRecord, OrgActivitySnapshot } from '@/services/genomeService';
import { useToast } from '@/hooks/use-toast';

export default function BrainPage() {
  const [genomeHistory, setGenomeHistory] = useState<GenomeRecord[]>([]);
  const [activitySnapshot, setActivitySnapshot] = useState<OrgActivitySnapshot | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const [isLive, setIsLive] = useState(true);
  const { toast } = useToast();
  const unsubscribeRef = useRef<(() => void) | null>(null);

  const fetchGenomeData = async (showToastOnError = true) => {
    setIsLoading(true);
    try {
      const [history, snapshot] = await Promise.all([
        genomeService.getGenomeHistory(),
        genomeService.getActivitySnapshot()
      ]);
      setGenomeHistory(history);
      setActivitySnapshot(snapshot);
      setLastSyncedAt(new Date());
    } catch (error) {
      console.error('Error fetching genome data:', error);
      if (showToastOnError) {
        toast({
          title: "Error loading genome",
          description: "Failed to fetch genome data from Supabase.",
          variant: "destructive"
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchGenomeData();

    // Live sync: re-fetch whenever real org data changes (new memories, projects, genome records)
    unsubscribeRef.current = genomeService.subscribeToActivityChanges(() => {
      fetchGenomeData(false);
    });

    return () => {
      unsubscribeRef.current?.();
    };
  }, []);

  const handleUpdateGenome = async () => {
    setIsUpdating(true);
    try {
      // Derive the new genome record from real Supabase + Parcle activity,
      // not random noise - each dimension maps to a concrete organizational signal.
      const newRecord = await genomeService.deriveGenomeFromActivity();

      await genomeService.updateGenome(newRecord);
      toast({
        title: "Genome synced from live data",
        description: "Recalculated from real decisions, lessons, policies, and projects.",
      });
      await fetchGenomeData();
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

  // Format data for Radar Chart
  const radarData = [
    { subject: 'Innovation', A: latestRecord.innovation, B: 120, fullMark: 150 },
    { subject: 'Quality', A: latestRecord.quality, B: 130, fullMark: 150 },
    { subject: 'Speed', A: latestRecord.speed, B: 130, fullMark: 150 },
    { subject: 'Risk Tolerance', A: latestRecord.risk, B: 100, fullMark: 150 },
    { subject: 'Cost Sensitivity', A: latestRecord.cost, B: 90, fullMark: 150 },
  ];

  // Format data for Evolution Trend Chart
  const trendData = genomeHistory.map((record, index) => {
    const date = record.created_at ? new Date(record.created_at) : new Date();
    const month = date.toLocaleDateString('en-US', { month: 'short' });
    return {
      month: `${month} #${index + 1}`,
      innovation: record.innovation,
      quality: record.quality,
      speed: record.speed,
      score: genomeService.calculateFitnessScore(record)
    };
  });

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Organization Brain</h1>
          <p className="text-muted-foreground">The digital genome of your organization's intelligence.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={handleUpdateGenome} disabled={isUpdating} className="gap-2">
            {isUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Sync Genome
          </Button>
          <Badge variant="outline" className="h-8 px-4 gap-2 bg-primary/5 text-primary border-primary/20">
            {isLive ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
            {lastSyncedAt ? `Last synced: ${lastSyncedAt.toLocaleTimeString()}` : 'Syncing...'}
          </Badge>
        </div>
      </div>

      {/* Live Activity Snapshot — the real data driving the genome below */}
      {activitySnapshot && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <ActivityStat label="Decisions" value={activitySnapshot.decisions} icon={FileText} />
          <ActivityStat label="Lessons" value={activitySnapshot.lessons} icon={Lightbulb} />
          <ActivityStat label="Policies" value={activitySnapshot.policies} icon={ShieldCheck} />
          <ActivityStat label="Projects" value={activitySnapshot.projects} icon={FolderKanban} />
          <ActivityStat label="Parcle Synced" value={activitySnapshot.parcleSynced} icon={Zap} />
        </div>
      )}

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading genome data from Supabase...</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Radar Chart */}
            <Card className="glass-card">
              <CardHeader>
                <CardTitle>Organizational Genome</CardTitle>
                <CardDescription>Current vs. Target intelligence dimensions.</CardDescription>
              </CardHeader>
              <CardContent className="h-[400px] flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                    <PolarGrid stroke="hsl(var(--border))" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 150]} tick={false} axisLine={false} />
                    <Radar
                      name="Current"
                      dataKey="A"
                      stroke="hsl(var(--primary))"
                      fill="hsl(var(--primary))"
                      fillOpacity={0.5}
                    />
                    <Radar
                      name="Target"
                      dataKey="B"
                      stroke="#10b981"
                      fill="#10b981"
                      fillOpacity={0.2}
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                    />
                    <Legend />
                  </RadarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Dimension Details */}
            <div className="space-y-4">
              <DimensionCard 
                title="Innovation" 
                value={Math.round((latestRecord.innovation / 150) * 100)} 
                icon={Zap} 
                description="Ability to generate and implement novel ideas."
                status={latestRecord.innovation > 110 ? "High" : "Stable"}
              />
              <DimensionCard 
                title="Quality" 
                value={Math.round((latestRecord.quality / 150) * 100)} 
                icon={Shield} 
                description="Consistency and excellence in output."
                status={latestRecord.quality > 110 ? "Improving" : "Stable"}
              />
              <DimensionCard 
                title="Speed" 
                value={Math.round((latestRecord.speed / 150) * 100)} 
                icon={Rocket} 
                description="Velocity of decision-to-execution."
                status={latestRecord.speed < 80 ? "At Risk" : "Stable"}
              />
              <DimensionCard 
                title="Adaptability" 
                value={Math.round(((latestRecord.innovation + latestRecord.speed) / 300) * 100)} 
                icon={RefreshCw} 
                description="Responsiveness to market changes."
                status="Stable"
              />
            </div>
          </div>

          {/* Trend Chart */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Genome Evolution Trend</CardTitle>
              <CardDescription>How your organization's core dimensions have shifted over time.</CardDescription>
            </CardHeader>
            <CardContent className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="innovation" stroke="hsl(var(--primary))" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                  <Line type="monotone" dataKey="quality" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                  <Line type="monotone" dataKey="speed" stroke="#f59e0b" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function ActivityStat({ label, value, icon: Icon }: { label: string; value: number; icon: any }) {
  return (
    <Card className="glass-card">
      <CardContent className="p-4 flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <Icon className="w-4 h-4 text-primary" />
        </div>
        <div>
          <p className="text-lg font-bold leading-none">{value}</p>
          <p className="text-[11px] text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function DimensionCard({ title, value, icon: Icon, description, status }: any) {
  return (
    <Card className="glass-card">
      <CardContent className="p-4 flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <Icon className="w-6 h-6 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <h4 className="text-sm font-semibold">{title}</h4>
            <Badge variant="outline" className={cn(
              "text-[10px] h-5",
              status === 'At Risk' ? "text-destructive border-destructive/20 bg-destructive/5" : 
              status === 'Improving' ? "text-emerald-500 border-emerald-500/20 bg-emerald-500/5" : ""
            )}>
              {status}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mb-3 truncate">{description}</p>
          <div className="flex items-center gap-3">
            <Progress value={value} className="h-1.5" />
            <span className="text-xs font-bold w-8">{value}%</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}