import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth, isSupabaseConfigured } from '../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, LogIn, AlertCircle } from 'lucide-react';
import { FoundryLogo } from '@/components/FoundryLogo';
import { APP_VERSION } from '@/lib/version';

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-4 h-4" aria-hidden="true">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const { isMock, signInMock, signInWithGoogle } = useAuth();

  const from = location.state?.from?.pathname || '/dashboard';

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!email || !password) {
      setErrorMessage('Please enter both your email and password.');
      return;
    }

    setIsLoading(true);
    try {
      if (isMock) {
        await signInMock(email, password);
        toast({ title: 'Welcome back!', description: 'Successfully signed in.' });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast({ title: 'Welcome back!', description: 'Successfully signed in.' });
      }
      navigate(from, { replace: true });
    } catch (error: any) {
      setErrorMessage(error.message || 'Invalid email or password. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    if (!isSupabaseConfigured) {
      setErrorMessage(
        'Google Sign-In requires Supabase. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env, then enable Google OAuth in your Supabase dashboard under Authentication → Providers → Google.'
      );
      return;
    }
    setErrorMessage('');
    setIsGoogleLoading(true);
    try {
      await signInWithGoogle();
      // No navigate needed — Supabase OAuth redirects the browser automatically
    } catch (error: any) {
      setErrorMessage(error.message || 'Google sign-in failed. Please try again.');
      setIsGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 relative">
      <Card className="w-full max-w-md border-primary/20">
        <CardHeader className="space-y-2 text-center">
          <div className="mx-auto mb-2">
            <FoundryLogo size={48} />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">Welcome back</CardTitle>
          <CardDescription>
            {isMock
              ? 'Demo Mode: Sign in with an account you created during signup.'
              : 'Enter your credentials to access your dashboard.'}
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleLogin}>
          <CardContent className="space-y-4">
            {/* Google OAuth */}
            <Button
              type="button"
              variant="outline"
              className={`w-full gap-2 ${!isSupabaseConfigured ? 'opacity-60' : ''}`}
              onClick={handleGoogleLogin}
              disabled={isGoogleLoading || isLoading}
              title={!isSupabaseConfigured ? 'Requires Supabase configuration — click for setup instructions' : 'Sign in with Google'}
            >
              {isGoogleLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <GoogleIcon />}
              Continue with Google
              {!isSupabaseConfigured && <span className="text-[10px] ml-auto text-muted-foreground">Setup required</span>}
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">or continue with email</span>
              </div>
            </div>

            {/* Inline Error */}
            {errorMessage && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="name@company.com"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setErrorMessage(''); }}
                className="bg-secondary/30 border-none focus-visible:ring-primary"
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setErrorMessage(''); }}
                className="bg-secondary/30 border-none focus-visible:ring-primary"
                disabled={isLoading}
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <Button type="submit" className="w-full gap-2" disabled={isLoading}>
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
              Sign In
            </Button>
            <p className="text-xs text-center text-muted-foreground">
              Don't have an account?{' '}
              <Link to="/signup" className="text-primary hover:underline font-medium">
                Sign up
              </Link>
              {' · '}
              <Link to="/" className="text-primary hover:underline font-medium">
                Back to home
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
      <span className="absolute bottom-4 inset-x-0 text-center text-xs text-muted-foreground/60">
        v{APP_VERSION}
      </span>
    </div>
  );
}
