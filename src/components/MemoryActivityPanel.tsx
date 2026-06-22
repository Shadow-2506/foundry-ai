import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Database, Zap, RefreshCw, Clock } from 'lucide-react';
import { activityService, MemoryActivity } from '@/services/activityService';

export default function MemoryActivityPanel() {
  const [activities, setActivities] = useState<MemoryActivity[]>([]);

  const loadActivities = async () => {
    const data = await activityService.getRecentActivities();
    setActivities(data);
  };

  useEffect(() => {
    loadActivities();
    window.addEventListener('parcle_activity_updated', loadActivities);
    return () => {
      window.removeEventListener('parcle_activity_updated', loadActivities);
    };
  }, []);

  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'supabase':
        return <Database className="w-4 h-4 text-emerald-500" />;
      case 'parcle':
        return <Zap className="w-4 h-4 text-amber-500" />;
      default:
        return <RefreshCw className="w-4 h-4 text-primary" />;
    }
  };

  const getSourceBadge = (source: string) => {
    switch (source) {
      case 'supabase':
        return <Badge variant="outline" className="border-emerald-500/20 bg-emerald-500/5 text-emerald-500 text-[10px]">Supabase</Badge>;
      case 'parcle':
        return <Badge variant="outline" className="border-amber-500/20 bg-amber-500/5 text-amber-500 text-[10px]">Parcle</Badge>;
      default:
        return <Badge variant="outline" className="border-primary/20 bg-primary/5 text-primary text-[10px]">Merged Pipeline</Badge>;
    }
  };

  return (
    <Card className="glass-card">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" />
              Memory Pipeline Activity
            </CardTitle>
            <CardDescription className="text-xs">Real-time storage and retrieval logs</CardDescription>
          </div>
          <Badge variant="secondary" className="text-[10px]">Active</Badge>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="max-h-[240px] overflow-y-auto divide-y divide-border">
          {activities.length === 0 ? (
            <div className="p-6 text-center text-xs text-muted-foreground">
              No pipeline activity logged yet. Try adding a memory or exploring the Time Machine!
            </div>
          ) : (
            activities.map((activity) => (
              <div key={activity.id} className="p-3 flex items-start gap-3 hover:bg-secondary/10 transition-colors">
                <div className="mt-0.5 shrink-0">
                  {getSourceIcon(activity.source)}
                </div>
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-foreground">
                      {activity.action}
                    </span>
                    {getSourceBadge(activity.source)}
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {activity.content}
                  </p>
                  <p className="text-[9px] text-muted-foreground/70">
                    {new Date(activity.timestamp).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
