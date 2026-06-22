import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { User, Mail, Calendar, Shield, LogOut } from 'lucide-react';

export default function Profile() {
  const { user, signOut } = useAuth();

  if (!user) return null;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">User Profile</h1>
        <p className="text-muted-foreground">Manage your personal account details and security settings.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="space-y-4">
          <Card className="glass-card text-center p-6">
            <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20 mx-auto mb-4">
              <User className="w-12 h-12 text-primary" />
            </div>
            <h3 className="font-bold text-lg">{user.email?.split('@')[0]}</h3>
            <p className="text-xs text-muted-foreground mb-4">{user.email}</p>
            <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
              Active Session
            </Badge>
          </Card>
        </div>

        <div className="md:col-span-2 space-y-6">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Account Information</CardTitle>
              <CardDescription>Details retrieved from your secure authentication provider.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-4 p-3 rounded-lg bg-secondary/30 border border-border/50">
                <Mail className="w-5 h-5 text-primary shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Email Address</p>
                  <p className="text-sm font-medium">{user.email}</p>
                </div>
              </div>

              <div className="flex items-center gap-4 p-3 rounded-lg bg-secondary/30 border border-border/50">
                <Shield className="w-5 h-5 text-primary shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">User ID</p>
                  <p className="text-sm font-mono text-xs">{user.id}</p>
                </div>
              </div>

              <div className="flex items-center gap-4 p-3 rounded-lg bg-secondary/30 border border-border/50">
                <Calendar className="w-5 h-5 text-primary shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Account Created</p>
                  <p className="text-sm font-medium">
                    {user.created_at ? new Date(user.created_at).toLocaleDateString(undefined, { dateStyle: 'long' }) : 'N/A'}
                  </p>
                </div>
              </div>

              <div className="pt-4 border-t border-border flex justify-end">
                <Button variant="destructive" className="gap-2" onClick={signOut}>
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}