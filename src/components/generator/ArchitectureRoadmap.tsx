"use client";

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Layout, Milestone } from 'lucide-react';

interface RoadmapStep {
  phase: string;
  task: string;
}

interface ArchitectureRoadmapProps {
  architecture: string;
  roadmap: RoadmapStep[];
}

export default function ArchitectureRoadmap({ architecture, roadmap }: ArchitectureRoadmapProps) {
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