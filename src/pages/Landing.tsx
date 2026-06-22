import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FoundryLogo } from '@/components/FoundryLogo';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Brain,
  Network,
  Database,
  History,
  TrendingUp,
  Zap,
  Shield,
  ArrowRight,
  CheckCircle2,
  BarChart3,
  Users,
  Lightbulb,
  GitBranch,
  Clock,
  Star,
} from 'lucide-react';
import { useTheme } from '@/components/theme-provider';
import { Moon, Sun } from 'lucide-react';
import { APP_VERSION, APP_BUILD } from '@/lib/version';

const features = [
  {
    icon: Brain,
    title: 'Org Brain',
    description: 'Capture and index every decision, lesson, and policy across your entire organization into a searchable intelligence layer.',
    color: 'text-purple-500',
    bg: 'bg-purple-500/10',
  },
  {
    icon: Network,
    title: 'Decision Graph',
    description: 'Visualize how past decisions connect and influence future ones. Understand the full context behind every organizational choice.',
    color: 'text-blue-500',
    bg: 'bg-blue-500/10',
  },
  {
    icon: Database,
    title: 'Memory Vault',
    description: 'A structured repository of organizational knowledge — from failed experiments to winning strategies — always accessible.',
    color: 'text-emerald-500',
    bg: 'bg-emerald-500/10',
  },
  {
    icon: History,
    title: 'Time Machine',
    description: 'Replay the reasoning behind past decisions. Understand the context, constraints, and trade-offs that shaped your organization.',
    color: 'text-amber-500',
    bg: 'bg-amber-500/10',
  },
  {
    icon: TrendingUp,
    title: 'Evolution Tracker',
    description: 'Monitor how your organization\'s decision-making fitness improves over time with actionable analytics and trend insights.',
    color: 'text-rose-500',
    bg: 'bg-rose-500/10',
  },
  {
    icon: Zap,
    title: 'Project Generator',
    description: 'Generate intelligent project blueprints informed by your organization\'s entire history of successes and failures.',
    color: 'text-cyan-500',
    bg: 'bg-cyan-500/10',
  },
];

const steps = [
  {
    step: '01',
    title: 'Capture Decisions',
    description: 'Log decisions, lessons, failures, and successes as they happen — in seconds, not hours.',
    icon: Database,
  },
  {
    step: '02',
    title: 'Build the Graph',
    description: 'FoundryAI automatically connects related decisions and builds a living knowledge graph of your organization.',
    icon: GitBranch,
  },
  {
    step: '03',
    title: 'Query the Past',
    description: 'Ask natural language questions and get instant answers grounded in your organization\'s real history.',
    icon: Lightbulb,
  },
  {
    step: '04',
    title: 'Improve Over Time',
    description: 'Watch your organizational fitness score rise as institutional knowledge is captured and leveraged.',
    icon: TrendingUp,
  },
];

const benefits = [
  'Stop repeating costly mistakes',
  'Onboard new team members 5× faster',
  'Surface relevant context in seconds',
  'Preserve knowledge when people leave',
  'Make decisions with full historical context',
  'Track organizational learning over time',
];

export default function Landing() {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <FoundryLogo size={32} showText={true} />
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => navigate('/login')}>
              Sign In
            </Button>
            <Button size="sm" onClick={() => navigate('/signup')}>
              Get Started
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-5xl mx-auto text-center space-y-8">
          <Badge variant="outline" className="border-primary/30 text-primary bg-primary/5 px-4 py-1.5 text-sm">
            <Star className="w-3.5 h-3.5 mr-1.5 inline" />
            Organizational Intelligence Platform
          </Badge>

          <h1 className="text-5xl md:text-7xl font-black tracking-tight leading-tight">
            Your Organization's
            <span className="text-primary block">Memory. Supercharged.</span>
          </h1>

          <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            FoundryAI captures every decision, lesson, and policy your organization makes — then surfaces the right knowledge exactly when you need it.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Button size="lg" className="gap-2 text-base px-8" onClick={() => navigate('/signup')}>
              Get Started Free
              <ArrowRight className="w-5 h-5" />
            </Button>
            <Button size="lg" variant="outline" className="gap-2 text-base px-8" onClick={() => navigate('/login')}>
              Sign In
            </Button>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6 pt-4 text-sm text-muted-foreground">
            {['No credit card required', 'Setup in minutes', 'Free forever plan'].map((text) => (
              <span key={text} className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                {text}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Banner */}
      <section className="py-12 border-y border-border/50 bg-card/30">
        <div className="max-w-5xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { value: '10×', label: 'Faster knowledge retrieval' },
              { value: '85%', label: 'Reduction in repeated mistakes' },
              { value: '5×', label: 'Faster new hire onboarding' },
              { value: '100%', label: 'Institutional knowledge retained' },
            ].map((stat) => (
              <div key={stat.label} className="space-y-1">
                <div className="text-3xl font-black text-primary">{stat.value}</div>
                <div className="text-xs text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24 px-6" id="features">
        <div className="max-w-7xl mx-auto">
          <div className="text-center space-y-4 mb-16">
            <Badge variant="outline" className="border-primary/30 text-primary bg-primary/5">Features</Badge>
            <h2 className="text-4xl font-black tracking-tight">Everything your organization needs</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              A complete suite of tools to capture, connect, and leverage your organization's collective intelligence.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="p-6 rounded-2xl border border-border/50 bg-card hover:border-primary/30 transition-all hover:shadow-lg hover:shadow-primary/5 group"
              >
                <div className={`w-12 h-12 rounded-xl ${feature.bg} flex items-center justify-center mb-4`}>
                  <feature.icon className={`w-6 h-6 ${feature.color}`} />
                </div>
                <h3 className="font-bold text-lg mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-24 px-6 bg-card/20 border-y border-border/50" id="how-it-works">
        <div className="max-w-5xl mx-auto">
          <div className="text-center space-y-4 mb-16">
            <Badge variant="outline" className="border-primary/30 text-primary bg-primary/5">How It Works</Badge>
            <h2 className="text-4xl font-black tracking-tight">Simple. Powerful. Instant.</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Get your organization's memory working for you in four simple steps.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {steps.map((step, index) => (
              <div key={step.step} className="flex gap-5 p-6 rounded-2xl border border-border/50 bg-card">
                <div className="shrink-0">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <step.icon className="w-6 h-6 text-primary" />
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-xs font-bold text-primary tracking-wider">{step.step}</div>
                  <h3 className="font-bold text-lg">{step.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-24 px-6" id="benefits">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-6">
              <Badge variant="outline" className="border-primary/30 text-primary bg-primary/5">Benefits</Badge>
              <h2 className="text-4xl font-black tracking-tight">Stop losing knowledge. Start compounding it.</h2>
              <p className="text-muted-foreground leading-relaxed">
                Every organization loses critical knowledge when people leave, projects end, or teams reorganize. FoundryAI ensures that institutional intelligence stays, grows, and becomes your competitive advantage.
              </p>
              <Button size="lg" className="gap-2" onClick={() => navigate('/signup')}>
                Start Building Your Memory
                <ArrowRight className="w-5 h-5" />
              </Button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {benefits.map((benefit) => (
                <div key={benefit} className="flex items-center gap-3 p-4 rounded-xl bg-card border border-border/50">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                  <span className="text-sm font-medium">{benefit}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6 bg-primary/5 border-y border-primary/10">
        <div className="max-w-3xl mx-auto text-center space-y-8">
          <h2 className="text-4xl md:text-5xl font-black tracking-tight">
            Ready to build your organization's memory?
          </h2>
          <p className="text-lg text-muted-foreground">
            Join teams that never lose institutional knowledge again. Start capturing, connecting, and leveraging your organization's intelligence today.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="gap-2 text-base px-10" onClick={() => navigate('/signup')}>
              Get Started Free
              <ArrowRight className="w-5 h-5" />
            </Button>
            <Button size="lg" variant="outline" className="text-base px-10" onClick={() => navigate('/login')}>
              Sign In to Dashboard
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">No credit card required · Free forever plan · Setup in minutes</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-border/50">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <FoundryLogo size={28} showText={true} />
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <Link to="/login" className="hover:text-foreground transition-colors">Sign In</Link>
              <Link to="/signup" className="hover:text-foreground transition-colors">Sign Up</Link>
            </div>
            <div className="text-right space-y-1">
              <p className="text-xs text-muted-foreground">© 2026 FoundryAI. All rights reserved.</p>
              <p className="text-xs text-muted-foreground/80">Version {APP_VERSION}</p>
              <p className="text-xs text-muted-foreground/60">Build {APP_BUILD}</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
