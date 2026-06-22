import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { FoundryLogo } from '@/components/FoundryLogo';
import { APP_VERSION, APP_BUILD } from '@/lib/version';

interface AboutModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * About modal — surfaces app branding and version/build info.
 * Version data is read from the centralized src/lib/version.ts source,
 * so it always reflects the current release without manual edits.
 */
export function AboutModal({ open, onOpenChange }: AboutModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="items-center text-center space-y-3">
          <FoundryLogo size={48} />
          <DialogTitle className="text-xl font-bold tracking-tight">FoundryAI</DialogTitle>
          <DialogDescription>
            Organizational memory & decision intelligence platform.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-2 py-2">
          <Badge variant="outline" className="text-xs">v{APP_VERSION}</Badge>
          <p className="text-xs text-muted-foreground/60">Build {APP_BUILD}</p>
        </div>

        <p className="text-xs text-center text-muted-foreground">
          © 2026 FoundryAI. All rights reserved.
        </p>
      </DialogContent>
    </Dialog>
  );
}
