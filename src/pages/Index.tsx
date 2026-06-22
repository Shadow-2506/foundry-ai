import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  Layers, 
  FileText, 
  Lightbulb, 
  ArrowUpRight,
  TrendingUp,
  Clock,
  CheckCircle2,
  Plus,
  Loader2,
  Download,
  X
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { MOCK_DATA } from '@/lib/mock-data';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer
} from 'recharts';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import * as memoryService from '@/services/memoryService';
import { decisionGraphService } from '@/services/decisionGraphService';
import { genomeService } from '@/services/genomeService';
import { jsPDF } from 'jspdf';

export default function Index() {
  const { toast } = useToast();
  const [isDecisionModalOpen, setIsDecisionModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Full-screen explanation modal state
  const [selectedDecision, setSelectedDecision] = useState<any | null>(null);

  // Real-time stats
  const [stats, setStats] = useState({
    fitnessScore: MOCK_DATA.fitnessScore,
    activeProjects: MOCK_DATA.activeProjects,
    totalDecisions: MOCK_DATA.totalDecisions,
    lessonsLearned: MOCK_DATA.lessonsLearned,
  });

  // Real-time lists
  const [recentDecisions, setRecentDecisions] = useState<any[]>([]);
  const [recentLessons, setRecentLessons] = useState<any[]>([]);

  // Form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [outcome, setOutcome] = useState('');
  const [department, setDepartment] = useState('Engineering');
  const [visibility, setVisibility] = useState<'public' | 'private'>('public');

  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      const memories = await memoryService.getMemories();
      
      // Filter decisions
      const decisions = memories.filter(m => m.memory_type === 'decision');
      const lessons = memories.filter(m => m.memory_type === 'lesson');

      // Load genome history for fitness score
      const genomeHistory = await genomeService.getGenomeHistory();
      let latestFitness = MOCK_DATA.fitnessScore;
      if (genomeHistory.length > 0) {
        latestFitness = genomeService.calculateFitnessScore(genomeHistory[genomeHistory.length - 1]);
      }

      setStats({
        fitnessScore: latestFitness,
        activeProjects: MOCK_DATA.activeProjects,
        totalDecisions: decisions.length > 0 ? decisions.length : MOCK_DATA.totalDecisions,
        lessonsLearned: lessons.length > 0 ? lessons.length : MOCK_DATA.lessonsLearned,
      });

      // Format recent decisions
      if (decisions.length > 0) {
        setRecentDecisions(decisions.slice(0, 5).map((d, idx) => {
          let parsedContent = d.content;
          let displayTitle = d.content;
          let desc = '';
          let out = '';
          let dept = 'Engineering';
          try {
            if (d.content.startsWith('{')) {
              const parsed = JSON.parse(d.content);
              displayTitle = parsed.title || d.content;
              desc = parsed.description || '';
              out = parsed.outcome || '';
              dept = parsed.department || 'Engineering';
            }
          } catch (e) {}

          return {
            id: d.id,
            title: displayTitle,
            description: desc || d.content,
            outcome: out,
            department: dept,
            date: d.created_at ? new Date(d.created_at).toLocaleDateString() : 'Just now',
            impact: idx === 0 ? 'Critical' : idx === 1 ? 'High' : 'Medium'
          };
        }));
      } else {
        setRecentDecisions(MOCK_DATA.recentDecisions.map(d => ({
          ...d,
          description: `Standardized organizational choice to implement ${d.title} to optimize performance and scalability.`,
          outcome: 'Improved developer velocity and system reliability.',
          department: 'Engineering'
        })));
      }

      // Format recent lessons
      if (lessons.length > 0) {
        setRecentLessons(lessons.slice(0, 2).map(l => ({
          id: l.id,
          title: l.content.length > 40 ? l.content.substring(0, 40) + '...' : l.content,
          category: 'Intelligence',
          lesson: l.content
        })));
      } else {
        setRecentLessons(MOCK_DATA.recentLessons);
      }

    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const handleCreateDecision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim() || !outcome.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields.',
        variant: 'destructive'
      });
      return;
    }

    setIsSaving(true);
    try {
      // Format content as structured JSON string
      const structuredContent = JSON.stringify({
        title: title.trim(),
        description: description.trim(),
        outcome: outcome.trim(),
        department
      });

      // 1. Save to Supabase memories table
      const newMemory = await memoryService.createMemory({
        memory_type: 'decision',
        content: structuredContent,
        visibility
      });

      // 2. Automatically update Decision Graph by adding a relationship
      await decisionGraphService.addRelationship(
        `Decision: ${title.trim()}`,
        `Outcome: ${outcome.trim()}`,
        'leads to'
      );

      toast({
        title: 'Decision Recorded',
        description: 'Successfully saved decision and updated organizational memory.'
      });

      // Reset form and close modal
      setTitle('');
      setDescription('');
      setOutcome('');
      setIsDecisionModalOpen(false);

      // Reload dashboard data to update counters and lists
      await loadDashboardData();
    } catch (error) {
      toast({
        title: 'Error saving decision',
        description: 'Failed to record decision in Supabase.',
        variant: 'destructive'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleExportReport = async () => {
    setIsExporting(true);
    try {
      const doc = new jsPDF();
      
      // Header
      doc.setFontSize(22);
      doc.setTextColor(124, 58, 237); // Primary color
      doc.text('FoundryAI - Organizational Intelligence Report', 14, 20);
      
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 27);
      doc.line(14, 30, 196, 30);

      // Section 1: Key Metrics
      doc.setFontSize(16);
      doc.setTextColor(0);
      doc.text('1. Executive Metrics', 14, 40);
      
      doc.setFontSize(12);
      doc.text(`• Organizational Fitness Score: ${stats.fitnessScore}%`, 20, 50);
      doc.text(`• Active Projects: ${stats.activeProjects}`, 20, 58);
      doc.text(`• Total Decisions Stored: ${stats.totalDecisions}`, 20, 66);
      doc.text(`• Lessons Learned: ${stats.lessonsLearned}`, 20, 74);

      // Section 2: Recent Decisions
      doc.setFontSize(16);
      doc.text('2. Recent Decisions', 14, 90);
      let yOffset = 100;
      recentDecisions.forEach((decision, idx) => {
        if (yOffset > 260) {
          doc.addPage();
          yOffset = 20;
        }
        doc.setFontSize(11);
        doc.setTextColor(0);
        doc.text(`${idx + 1}. ${decision.title}`, 20, yOffset);
        doc.setFontSize(9);
        doc.setTextColor(120);
        doc.text(`Date: ${decision.date} | Impact: ${decision.impact}`, 24, yOffset + 5);
        yOffset += 15;
      });

      // Section 3: Recent Lessons
      if (yOffset > 220) {
        doc.addPage();
        yOffset = 20;
      }
      doc.setFontSize(16);
      doc.setTextColor(0);
      doc.text('3. Recent Lessons Learned', 14, yOffset);
      yOffset += 10;
      recentLessons.forEach((lesson, idx) => {
        if (yOffset > 260) {
          doc.addPage();
          yOffset = 20;
        }
        doc.setFontSize(11);
        doc.setTextColor(0);
        doc.text(`${idx + 1}. ${lesson.title}`, 20, yOffset);
        doc.setFontSize(9);
        doc.setTextColor(100);
        const splitLesson = doc.splitTextToSize(lesson.lesson, 170);
        doc.text(splitLesson, 24, yOffset + 5);
        yOffset += 10 + (splitLesson.length * 5);
      });

      // Save PDF
      doc.save(`FoundryAI_Intelligence_Report_${Date.now()}.pdf`);
      
      toast({
        title: 'Report Exported',
        description: 'Your intelligence report has been downloaded successfully.'
      });
    } catch (error) {
      toast({
        title: 'Export Failed',
        description: 'Failed to generate PDF report.',
        variant: 'destructive'
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Organizational Dashboard</h1>
          <p className="text-muted-foreground">Real-time intelligence and memory health overview.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={handleExportReport} disabled={isExporting} className="gap-2">
            {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            Export Report
          </Button>
          <Button onClick={() => setIsDecisionModalOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            New Decision
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          title="Fitness Score" 
          value={`${stats.fitnessScore}%`} 
          change="+2.4%" 
          icon={Activity} 
          description="Overall organizational health"
        />
        <StatCard 
          title="Active Projects" 
          value={stats.activeProjects} 
          change="+1" 
          icon={Layers} 
          description="Currently tracked initiatives"
        />
        <StatCard 
          title="Total Decisions" 
          value={stats.totalDecisions.toLocaleString()} 
          change="+42" 
          icon={FileText} 
          description="Stored in memory vault"
        />
        <StatCard 
          title="Lessons Learned" 
          value={stats.lessonsLearned} 
          change="+12" 
          icon={Lightbulb} 
          description="Extracted from outcomes"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Chart */}
        <Card className="lg:col-span-2 glass-card">
          <CardHeader>
            <CardTitle>Organizational Evolution</CardTitle>
            <CardDescription>Fitness score and innovation trends over the last 6 months.</CardDescription>
          </CardHeader>
          <CardContent className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={MOCK_DATA.evolutionData}>
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
                  itemStyle={{ color: 'hsl(var(--foreground))' }}
                />
                <Area type="monotone" dataKey="score" stroke="hsl(var(--primary))" fillOpacity={1} fill="url(#colorScore)" strokeWidth={2} />
                <Area type="monotone" dataKey="innovation" stroke="#10b981" fill="transparent" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Executive Summary */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Executive Summary</CardTitle>
            <CardDescription>AI-generated insights for this week.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-primary">
                <TrendingUp className="w-4 h-4" />
                <span>Growth Opportunity</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Innovation score is up 15% following the "Rust for Core" decision. Consider accelerating the migration.
              </p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-amber-500">
                <Clock className="w-4 h-4" />
                <span>Risk Alert</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Quality metrics show a slight dip in the last 2 weeks. Correlates with increased speed in Project Alpha.
              </p>
            </div>
            <div className="pt-4 border-t border-border">
              <h4 className="text-sm font-semibold mb-3">Key Recommendations</h4>
              <ul className="space-y-2">
                <li className="flex items-start gap-2 text-xs text-muted-foreground">
                  <CheckCircle2 className="w-3 h-3 mt-0.5 text-primary" />
                  Review "Database Sharding" lesson before Q4 scaling.
                </li>
                <li className="flex items-start gap-2 text-xs text-muted-foreground">
                  <CheckCircle2 className="w-3 h-3 mt-0.5 text-primary" />
                  Update Remote-First policy based on recent feedback.
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Decisions */}
        <Card className="glass-card">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent Decisions</CardTitle>
              <CardDescription>Latest entries in the organizational memory.</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentDecisions.map((decision) => (
                <div 
                  key={decision.id} 
                  onClick={() => setSelectedDecision(decision)}
                  className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 border border-border/50 hover:border-primary/50 transition-colors cursor-pointer group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded bg-primary/10 flex items-center justify-center">
                      <FileText className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium group-hover:text-primary transition-colors">{decision.title}</p>
                      <p className="text-xs text-muted-foreground">{decision.date}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={decision.impact === 'Critical' ? 'destructive' : 'secondary'}>
                      {decision.impact}
                    </Badge>
                    <ArrowUpRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Lessons */}
        <Card className="glass-card">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent Lessons</CardTitle>
              <CardDescription>Extracted intelligence from project outcomes.</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentLessons.map((lesson) => (
                <div key={lesson.id} className="p-4 rounded-lg bg-secondary/30 border border-border/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">
                      {lesson.category}
                    </Badge>
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Verified</span>
                  </div>
                  <h4 className="text-sm font-semibold">{lesson.title}</h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {lesson.lesson}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* New Decision Modal */}
      <Dialog open={isDecisionModalOpen} onOpenChange={setIsDecisionModalOpen}>
        <DialogContent className="sm:max-w-[520px] glass-card">
          <DialogHeader>
            <DialogTitle>Record New Decision</DialogTitle>
            <DialogDescription>
              Add a critical decision to the organizational brain to update metrics, memory, and lineage.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateDecision} className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="title">Decision Title</Label>
              <Input 
                id="title" 
                placeholder="e.g., Migrate Core API to Rust" 
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="bg-secondary/30 border-none focus-visible:ring-primary"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description & Context</Label>
              <Textarea 
                id="description" 
                placeholder="Why was this decision made? What alternatives were considered?" 
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="min-h-[80px] bg-secondary/30 border-none focus-visible:ring-primary"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="outcome">Expected Outcome</Label>
              <Input 
                id="outcome" 
                placeholder="e.g., 50% reduction in server latency" 
                value={outcome}
                onChange={(e) => setOutcome(e.target.value)}
                className="bg-secondary/30 border-none focus-visible:ring-primary"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="department">Department</Label>
                <Select value={department} onValueChange={setDepartment}>
                  <SelectTrigger id="department" className="bg-secondary/30 border-none">
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Engineering">Engineering</SelectItem>
                    <SelectItem value="Product">Product</SelectItem>
                    <SelectItem value="Operations">Operations</SelectItem>
                    <SelectItem value="Marketing">Marketing</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="visibility">Visibility</Label>
                <Select value={visibility} onValueChange={(val: any) => setVisibility(val)}>
                  <SelectTrigger id="visibility" className="bg-secondary/30 border-none">
                    <SelectValue placeholder="Select visibility" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="public">Public</SelectItem>
                    <SelectItem value="private">Private</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setIsDecisionModalOpen(false)} disabled={isSaving}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving} className="gap-2">
                {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                Record Decision
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Full-Screen Explanation Modal */}
      <Dialog open={!!selectedDecision} onOpenChange={(open) => !open && setSelectedDecision(null)}>
        <DialogContent className="sm:max-w-[700px] glass-card">
          <DialogHeader className="border-b border-border/50 pb-4">
            <div className="flex items-center justify-between">
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 capitalize">
                {selectedDecision?.department || 'Engineering'}
              </Badge>
              <span className="text-xs text-muted-foreground">{selectedDecision?.date}</span>
            </div>
            <DialogTitle className="text-2xl font-bold mt-2 text-foreground">
              {selectedDecision?.title}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <h4 className="text-sm font-bold uppercase tracking-wider text-primary">Description & Context</h4>
              <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                {selectedDecision?.description}
              </p>
            </div>

            {selectedDecision?.outcome && (
              <div className="space-y-2 p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
                <h4 className="text-sm font-bold uppercase tracking-wider text-emerald-500">Expected Outcome</h4>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {selectedDecision?.outcome}
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border/50">
              <div>
                <span className="text-xs text-muted-foreground">Impact Level</span>
                <p className="text-sm font-semibold mt-0.5">{selectedDecision?.impact || 'Medium'}</p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Status</span>
                <p className="text-sm font-semibold mt-0.5 text-emerald-500">Active & Verified</p>
              </div>
            </div>
          </div>
          <DialogFooter className="border-t border-border/50 pt-4">
            <Button onClick={() => setSelectedDecision(null)}>Close Explanation</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatCard({ title, value, change, icon: Icon, description }: any) {
  return (
    <Card className="glass-card overflow-hidden relative">
      <div className="absolute top-0 right-0 p-4 opacity-10">
        <Icon className="w-12 h-12" />
      </div>
      <CardHeader className="pb-2">
        <CardDescription className="text-xs font-medium uppercase tracking-wider">{title}</CardDescription>
        <CardTitle className="text-2xl font-bold">{value}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded">
            {change}
          </span>
          <span className="text-xs text-muted-foreground">{description}</span>
        </div>
      </CardContent>
    </Card>
  );
}