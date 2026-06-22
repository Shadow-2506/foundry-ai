"use client";

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { ShieldAlert, AlertTriangle } from 'lucide-react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer } from 'recharts';

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

export default function AnalysisSection({ swot, radarData, riskAssessment }: AnalysisSectionProps) {
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