"use client";

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, Sparkles, Activity, Clock } from 'lucide-react';

interface ScoreCardsProps {
  businessValueScore: number;
  innovationScore: number;
  technicalComplexityScore: number;
  effortEstimate: string;
}

export default function ScoreCards({
  businessValueScore,
  innovationScore,
  technicalComplexityScore,
  effortEstimate
}: ScoreCardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <Card className="glass-card">
        <CardContent className="p-4 flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground font-medium">Business Value</p>
            <p className="text-2xl font-bold text-emerald-500">{businessValueScore}/100</p>
          </div>
          <TrendingUp className="w-8 h-8 text-emerald-500/20" />
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardContent className="p-4 flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground font-medium">Innovation Score</p>
            <p className="text-2xl font-bold text-primary">{innovationScore}/100</p>
          </div>
          <Sparkles className="w-8 h-8 text-primary/20" />
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardContent className="p-4 flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground font-medium">Technical Complexity</p>
            <p className="text-2xl font-bold text-amber-500">{technicalComplexityScore}/100</p>
          </div>
          <Activity className="w-8 h-8 text-amber-500/20" />
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardContent className="p-4 flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground font-medium">Effort Estimate</p>
            <p className="text-2xl font-bold text-blue-500">{effortEstimate}</p>
          </div>
          <Clock className="w-8 h-8 text-blue-500/20" />
        </CardContent>
      </Card>
    </div>
  );
}