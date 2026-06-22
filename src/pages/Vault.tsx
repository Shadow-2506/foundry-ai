import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Plus, 
  Database, 
  Zap, 
  Eye, 
  EyeOff, 
  Filter, 
  Tag, 
  Calendar,
  Loader2,
  RefreshCw,
  CloudUpload,
  Trash2,
  Unlink
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter,
  DialogDescription
} from '@/components/ui/dialog';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import * as memoryService from '@/services/memoryService';
import { Memory } from '@/services/memoryService';
import { parcleService } from '@/services/parcleService';
import { useToast } from '@/hooks/use-toast';

export default function Vault() {
  const { toast } = useToast();
  const [memories, setMemories] = useState<Memory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedVisibility, setSelectedVisibility] = useState<string>('all');
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [newType, setNewType] = useState('decision');
  const [newContent, setNewContent] = useState('');
  const [newVisibility, setNewVisibility] = useState<'public' | 'private'>('public');

  // Full-screen explanation modal state
  const [selectedMemory, setSelectedMemory] = useState<Memory | null>(null);

  // Tracks which memory IDs currently have a Parcle resync in flight
  const [retryingIds, setRetryingIds] = useState<Set<string>>(new Set());

  // Delete confirm state
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Unsync from Parcle state
  const [unsyncingIds, setUnsyncingIds] = useState<Set<string>>(new Set());

  // Bulk sync state
  const [isBulkSyncing, setIsBulkSyncing] = useState(false);
  const [bulkSyncResult, setBulkSyncResult] = useState<{ success: number; failed: number } | null>(null);

  const loadMemories = async () => {
    setIsLoading(true);
    try {
      const data = await memoryService.getMemories();
      setMemories(data);
    } catch (e) {
      toast({ 
        title: 'Error loading memories', 
        description: 'Failed to fetch records from the database.',
        variant: 'destructive' 
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadMemories();
  }, []);

  const handleCreateMemory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContent.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Memory content cannot be empty.',
        variant: 'destructive'
      });
      return;
    }

    setIsSaving(true);
    try {
      await memoryService.createMemory({
        memory_type: newType,
        content: newContent.trim(),
        visibility: newVisibility
      });
      
      toast({
        title: 'Memory Saved',
        description: 'Successfully stored memory in Supabase and Parcle.'
      });
      
      // Reset form and close modal
      setNewContent('');
      setNewType('decision');
      setNewVisibility('public');
      setIsModalOpen(false);
      
      // Reload memories
      await loadMemories();
    } catch (error) {
      toast({
        title: 'Error saving memory',
        description: 'Failed to save memory to the database.',
        variant: 'destructive'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleRetrySync = async (memory: Memory, e?: React.MouseEvent) => {
    e?.stopPropagation(); // don't open the detail modal when clicking the badge/button
    if (retryingIds.has(memory.id)) return;

    setRetryingIds(prev => new Set(prev).add(memory.id));
    try {
      const synced = await memoryService.retrySyncToParcle(memory);
      if (synced) {
        toast({
          title: 'Synced to Parcle',
          description: 'This memory is now stored in both Supabase and Parcle.'
        });
        // Update local state immediately, then reconcile with the server on next load.
        setMemories(prev =>
          prev.map(m =>
            m.id === memory.id
              ? { ...m, storedIn: ['supabase', 'parcle'], parcleSynced: true }
              : m
          )
        );
        if (selectedMemory?.id === memory.id) {
          setSelectedMemory({ ...selectedMemory, storedIn: ['supabase', 'parcle'], parcleSynced: true });
        }
      } else {
        toast({
          title: 'Parcle sync failed',
          description: 'Check your Parcle API key and connection in Settings, then try again.',
          variant: 'destructive'
        });
      }
    } catch (error) {
      toast({
        title: 'Parcle sync failed',
        description: 'An unexpected error occurred while retrying the sync.',
        variant: 'destructive'
      });
    } finally {
      setRetryingIds(prev => {
        const next = new Set(prev);
        next.delete(memory.id);
        return next;
      });
    }
  };

  const handleBulkSync = async () => {
    if (isBulkSyncing) return;
    const unsynced = memories.filter(m => !(m.storedIn ?? []).includes('parcle'));
    if (unsynced.length === 0) {
      toast({ title: 'All synced', description: 'Every memory is already synced to Parcle.' });
      return;
    }
    setIsBulkSyncing(true);
    setBulkSyncResult(null);
    let successCount = 0;
    let failCount = 0;
    // Add all unsynced IDs to retrying set
    setRetryingIds(new Set(unsynced.map(m => m.id)));
    for (const memory of unsynced) {
      try {
        const synced = await memoryService.retrySyncToParcle(memory);
        if (synced) {
          successCount++;
          setMemories(prev =>
            prev.map(m =>
              m.id === memory.id
                ? { ...m, storedIn: ['supabase', 'parcle'], parcleSynced: true }
                : m
            )
          );
        } else {
          failCount++;
        }
      } catch {
        failCount++;
      }
      // Remove from retrying set as each completes
      setRetryingIds(prev => {
        const next = new Set(prev);
        next.delete(memory.id);
        return next;
      });
    }
    setIsBulkSyncing(false);
    setBulkSyncResult({ success: successCount, failed: failCount });
    toast({
      title: 'Bulk Sync Complete',
      description: `${successCount} synced successfully${failCount > 0 ? `, ${failCount} failed` : ''}.`,
      variant: failCount > 0 && successCount === 0 ? 'destructive' : 'default',
    });
  };

  const handleDeleteMemory = async (memory: Memory, e?: React.MouseEvent) => {
    e?.stopPropagation();
    // First click: ask for confirmation
    if (confirmDeleteId !== memory.id) {
      setConfirmDeleteId(memory.id);
      return;
    }
    // Second click: confirmed — delete
    setConfirmDeleteId(null);
    setDeletingId(memory.id);
    try {
      await memoryService.deleteMemory(memory.id);
      setMemories(prev => prev.filter(m => m.id !== memory.id));
      if (selectedMemory?.id === memory.id) setSelectedMemory(null);
      toast({ title: 'Memory deleted', description: 'Removed from Supabase.' });
    } catch (err) {
      toast({ title: 'Delete failed', description: 'Could not delete the memory.', variant: 'destructive' });
    } finally {
      setDeletingId(null);
    }
  };

  const handleUnsyncFromParcle = async (memory: Memory, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (unsyncingIds.has(memory.id)) return;
    setUnsyncingIds(prev => new Set(prev).add(memory.id));
    try {
      // Import parcleService for deletion
      const removed = await parcleService.deleteMemory(memory.id);
      if (removed) {
        setMemories(prev =>
          prev.map(m =>
            m.id === memory.id
              ? { ...m, storedIn: ['supabase'], parcleSynced: false }
              : m
          )
        );
        if (selectedMemory?.id === memory.id) {
          setSelectedMemory(prev => prev ? { ...prev, storedIn: ['supabase'], parcleSynced: false } : null);
        }
        toast({ title: 'Unsynced from Parcle', description: 'Memory removed from Parcle. It still exists in Supabase.' });
      } else {
        toast({ title: 'Unsync failed', description: 'Could not remove from Parcle. Check your API key.', variant: 'destructive' });
      }
    } catch (err) {
      toast({ title: 'Unsync failed', description: 'An error occurred while removing from Parcle.', variant: 'destructive' });
    } finally {
      setUnsyncingIds(prev => {
        const next = new Set(prev);
        next.delete(memory.id);
        return next;
      });
    }
  };

  // Filter logic
  const filteredMemories = memories.filter(memory => {
    const matchesSearch = memory.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          memory.memory_type.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = selectedCategory === 'all' || 
                            memory.memory_type.toLowerCase() === selectedCategory.toLowerCase();
    
    const matchesVisibility = selectedVisibility === 'all' || 
                              (memory.visibility || 'public').toLowerCase() === selectedVisibility.toLowerCase();

    return matchesSearch && matchesCategory && matchesVisibility;
  });

  const categories = ['all', 'decision', 'lesson', 'failure', 'success', 'policy'];

  const getCategoryColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'decision':
        return 'bg-purple-500/10 text-purple-500 border-purple-500/20';
      case 'lesson':
        return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'failure':
        return 'bg-red-500/10 text-red-500 border-red-500/20';
      case 'success':
        return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
      case 'policy':
        return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
      default:
        return 'bg-slate-500/10 text-slate-500 border-slate-500/20';
    }
  };

  const getParsedContent = (content: string) => {
    try {
      if (content.startsWith('{')) {
        const parsed = JSON.parse(content);
        return parsed.title || content;
      }
    } catch (e) {}
    return content;
  };

  const getParsedDescription = (content: string) => {
    try {
      if (content.startsWith('{')) {
        const parsed = JSON.parse(content);
        return parsed.description || parsed.outcome || content;
      }
    } catch (e) {}
    return content;
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Memory Vault</h1>
          <p className="text-muted-foreground">Search, filter, and manage your organization's collective intelligence.</p>
        </div>
        
        {/* Sync All to Parcle */}
        <Button
          variant="outline"
          className="gap-2"
          onClick={handleBulkSync}
          disabled={isBulkSyncing || memories.filter(m => !(m.storedIn ?? []).includes('parcle')).length === 0}
        >
          {isBulkSyncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CloudUpload className="w-4 h-4" />}
          {isBulkSyncing
            ? 'Syncing...'
            : `Sync All to Parcle${memories.filter(m => !(m.storedIn ?? []).includes('parcle')).length > 0
                ? ` (${memories.filter(m => !(m.storedIn ?? []).includes('parcle')).length})`
                : ''}`}
        </Button>

        {/* Create Memory Modal Trigger */}
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Add Memory
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[520px] glass-card">
            <DialogHeader>
              <DialogTitle>Create New Memory</DialogTitle>
              <DialogDescription>
                Add a new decision, lesson, policy, or outcome to the organizational brain.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateMemory} className="space-y-5 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="memory-type">Memory Type</Label>
                  <Select value={newType} onValueChange={setNewType}>
                    <SelectTrigger id="memory-type">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="decision">Decision</SelectItem>
                      <SelectItem value="lesson">Lesson</SelectItem>
                      <SelectItem value="failure">Failure</SelectItem>
                      <SelectItem value="success">Success</SelectItem>
                      <SelectItem value="policy">Policy</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="visibility">Visibility</Label>
                  <Select 
                    value={newVisibility} 
                    onValueChange={(val) => setNewVisibility(val as 'public' | 'private')}
                  >
                    <SelectTrigger id="visibility">
                      <SelectValue placeholder="Select visibility" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="public">Public</SelectItem>
                      <SelectItem value="private">Private</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="content">Memory Content</Label>
                <Textarea 
                  id="content"
                  placeholder="Describe the decision, lesson, or policy in detail..."
                  className="min-h-[120px] bg-secondary/30 border-none focus-visible:ring-primary"
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                />
              </div>

              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSaving}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSaving} className="gap-2">
                  {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                  Save Memory
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Bulk Sync Result Banner */}
      {bulkSyncResult && (
        <div className={`flex items-center justify-between gap-3 p-4 rounded-xl border ${bulkSyncResult.failed > 0 && bulkSyncResult.success === 0 ? 'bg-destructive/10 border-destructive/20 text-destructive' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600'}`}>
          <p className="text-sm font-medium">
            Bulk sync complete: <strong>{bulkSyncResult.success} succeeded</strong>
            {bulkSyncResult.failed > 0 && <>, <strong>{bulkSyncResult.failed} failed</strong> — check your Parcle API key in Settings</>}.
          </p>
          <Button variant="ghost" size="sm" className="shrink-0" onClick={() => setBulkSyncResult(null)}>Dismiss</Button>
        </div>
      )}

      {/* Search and Filters Panel */}
      <Card className="glass-card">
        <CardContent className="p-6 space-y-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search Bar */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                type="text" 
                placeholder="Search memories by content or type..." 
                className="pl-10 bg-secondary/30 border-none focus-visible:ring-primary"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Visibility Selector */}
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs font-medium text-muted-foreground">Visibility:</span>
              <div className="flex bg-secondary/50 p-1 rounded-lg border border-border/50">
                <button
                  onClick={() => setSelectedVisibility('all')}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                    selectedVisibility === 'all' 
                      ? 'bg-background text-foreground shadow-sm' 
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setSelectedVisibility('public')}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                    selectedVisibility === 'public' 
                      ? 'bg-background text-foreground shadow-sm' 
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Public
                </button>
                <button
                  onClick={() => setSelectedVisibility('private')}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                    selectedVisibility === 'private' 
                      ? 'bg-background text-foreground shadow-sm' 
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Private
                </button>
              </div>
            </div>
          </div>

          {/* Category Filters */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <Filter className="w-3.5 h-3.5" />
              <span>Filter by Category:</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-4 py-1.5 text-xs font-medium rounded-full border transition-all capitalize ${
                    selectedCategory === category
                      ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                      : 'bg-secondary/30 border-border/50 text-muted-foreground hover:text-foreground hover:border-border'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Memories Grid */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading organizational memories...</p>
        </div>
      ) : filteredMemories.length === 0 ? (
        <Card className="glass-card border-dashed border-2">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center">
              <Search className="w-6 h-6 text-muted-foreground" />
            </div>
            <div className="space-y-1">
              <h3 className="font-semibold text-lg">No memories found</h3>
              <p className="text-sm text-muted-foreground max-w-md">
                We couldn't find any memories matching your search or filter criteria. Try adjusting your filters or add a new memory.
              </p>
            </div>
            <Button onClick={() => setIsModalOpen(true)} variant="outline" className="gap-2">
              <Plus className="w-4 h-4" />
              Create Memory
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMemories.map((memory) => (
            <Card 
              key={memory.id} 
              onClick={() => setSelectedMemory(memory)}
              className="glass-card flex flex-col justify-between hover:border-primary/30 transition-all group cursor-pointer"
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  {/* Category Badge */}
                  <Badge variant="outline" className={`capitalize ${getCategoryColor(memory.memory_type)}`}>
                    {memory.memory_type}
                  </Badge>
                  
                  {/* Storage Badges */}
                  <div className="flex items-center gap-1.5">
                    {(memory.storedIn ?? ['supabase']).includes('supabase') && (
                      <Badge variant="outline" className="border-emerald-500/20 bg-emerald-500/5 text-emerald-500 text-[10px] flex items-center gap-1">
                        <Database className="w-3 h-3" /> Supabase
                      </Badge>
                    )}
                    {(memory.storedIn ?? []).includes('parcle') ? (
                      <Badge variant="outline" className="border-amber-500/20 bg-amber-500/5 text-amber-500 text-[10px] flex items-center gap-1">
                        <Zap className="w-3 h-3" /> Parcle
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        onClick={(e) => handleRetrySync(memory, e)}
                        className="border-muted-foreground/20 bg-muted/30 text-muted-foreground text-[10px] flex items-center gap-1 cursor-pointer hover:border-amber-500/30 hover:text-amber-500 hover:bg-amber-500/5 transition-colors"
                        title="Click to retry syncing this memory to Parcle"
                      >
                        {retryingIds.has(memory.id) ? (
                          <RefreshCw className="w-3 h-3 animate-spin" />
                        ) : (
                          <Zap className="w-3 h-3" />
                        )}
                        {retryingIds.has(memory.id) ? 'Syncing…' : 'Parcle: not synced'}
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="pb-4 flex-1">
                <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap line-clamp-4">
                  {getParsedContent(memory.content)}
                </p>
              </CardContent>
              
              <CardFooter className="pt-3 border-t border-border/50 flex flex-col gap-2 text-xs text-muted-foreground">
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-1.5">
                    {memory.visibility === 'private' ? (
                      <span className="flex items-center gap-1 text-amber-500">
                        <EyeOff className="w-3.5 h-3.5" />
                        Private
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-emerald-500">
                        <Eye className="w-3.5 h-3.5" />
                        Public
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>
                      {memory.created_at 
                        ? new Date(memory.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
                        : 'Just now'}
                    </span>
                  </div>
                </div>

                {/* Action buttons row */}
                <div className="flex items-center gap-1.5 w-full" onClick={(e) => e.stopPropagation()}>
                  {/* Unsync from Parcle — only when synced */}
                  {(memory.storedIn ?? []).includes('parcle') && (
                    <button
                      onClick={(e) => handleUnsyncFromParcle(memory, e)}
                      disabled={unsyncingIds.has(memory.id)}
                      className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium text-amber-500/80 hover:text-amber-500 hover:bg-amber-500/10 border border-amber-500/20 hover:border-amber-500/40 transition-colors disabled:opacity-50"
                      title="Remove this memory from Parcle (keeps Supabase copy)"
                    >
                      {unsyncingIds.has(memory.id)
                        ? <Loader2 className="w-3 h-3 animate-spin" />
                        : <Unlink className="w-3 h-3" />}
                      {unsyncingIds.has(memory.id) ? 'Unsyncing…' : 'Unsync Parcle'}
                    </button>
                  )}

                  {/* Delete button — confirm-on-second-click pattern */}
                  <button
                    onClick={(e) => handleDeleteMemory(memory, e)}
                    disabled={deletingId === memory.id}
                    className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium transition-colors disabled:opacity-50 ml-auto ${
                      confirmDeleteId === memory.id
                        ? 'text-white bg-destructive border border-destructive hover:bg-destructive/90'
                        : 'text-destructive/70 hover:text-destructive hover:bg-destructive/10 border border-destructive/20 hover:border-destructive/40'
                    }`}
                    title={confirmDeleteId === memory.id ? 'Click again to confirm deletion' : 'Delete this memory'}
                    onBlur={() => setConfirmDeleteId(null)}
                  >
                    {deletingId === memory.id
                      ? <Loader2 className="w-3 h-3 animate-spin" />
                      : <Trash2 className="w-3 h-3" />}
                    {deletingId === memory.id
                      ? 'Deleting…'
                      : confirmDeleteId === memory.id
                        ? 'Confirm delete'
                        : 'Delete'}
                  </button>
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* Full-Screen Explanation Modal */}
      <Dialog open={!!selectedMemory} onOpenChange={(open) => !open && setSelectedMemory(null)}>
        <DialogContent className="sm:max-w-[700px] glass-card">
          <DialogHeader className="border-b border-border/50 pb-4">
            <div className="flex items-center justify-between">
              <Badge variant="outline" className={`capitalize ${selectedMemory ? getCategoryColor(selectedMemory.memory_type) : ''}`}>
                {selectedMemory?.memory_type}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {selectedMemory?.created_at ? new Date(selectedMemory.created_at).toLocaleDateString() : 'Just now'}
              </span>
            </div>
            <DialogTitle className="text-2xl font-bold mt-2 text-foreground">
              {selectedMemory ? getParsedContent(selectedMemory.content) : ''}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <h4 className="text-sm font-bold uppercase tracking-wider text-primary">Detailed Explanation</h4>
              <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                {selectedMemory ? getParsedDescription(selectedMemory.content) : ''}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border/50">
              <div>
                <span className="text-xs text-muted-foreground">Source Pipeline</span>
                <p className="text-sm font-semibold mt-0.5 capitalize">
                  {selectedMemory
                    ? (selectedMemory.storedIn?.length
                        ? selectedMemory.storedIn.join(' + ')
                        : selectedMemory.source || 'Supabase')
                    : 'Supabase'}
                </p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Visibility</span>
                <p className="text-sm font-semibold mt-0.5 capitalize">{selectedMemory?.visibility || 'Public'}</p>
              </div>
            </div>

            {selectedMemory && !(selectedMemory.storedIn ?? []).includes('parcle') && (
              <div className="flex items-center justify-between gap-3 p-3 rounded-lg bg-amber-500/5 border border-amber-500/20">
                <p className="text-xs text-muted-foreground">
                  This memory hasn't synced to Parcle yet. If you've just connected or fixed your Parcle API key, retry now.
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-2 shrink-0"
                  disabled={retryingIds.has(selectedMemory.id)}
                  onClick={() => handleRetrySync(selectedMemory)}
                >
                  {retryingIds.has(selectedMemory.id) ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <RefreshCw className="w-3.5 h-3.5" />
                  )}
                  Retry Parcle Sync
                </Button>
              </div>
            )}
          </div>
          <DialogFooter className="border-t border-border/50 pt-4 flex flex-wrap gap-2 items-center justify-between sm:justify-between">
            <div className="flex items-center gap-2">
              {/* Unsync from Parcle — only when synced */}
              {selectedMemory && (selectedMemory.storedIn ?? []).includes('parcle') && (
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5 text-amber-500 border-amber-500/30 hover:bg-amber-500/10 hover:border-amber-500/50"
                  disabled={unsyncingIds.has(selectedMemory.id)}
                  onClick={() => selectedMemory && handleUnsyncFromParcle(selectedMemory)}
                >
                  {unsyncingIds.has(selectedMemory.id)
                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    : <Unlink className="w-3.5 h-3.5" />}
                  {unsyncingIds.has(selectedMemory.id) ? 'Unsyncing…' : 'Unsync Parcle'}
                </Button>
              )}
              {/* Delete */}
              {selectedMemory && (
                <Button
                  size="sm"
                  variant={confirmDeleteId === selectedMemory.id ? 'destructive' : 'outline'}
                  className={confirmDeleteId === selectedMemory.id ? '' : 'gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/10 hover:border-destructive/50'}
                  disabled={deletingId === selectedMemory.id}
                  onClick={() => selectedMemory && handleDeleteMemory(selectedMemory)}
                >
                  {deletingId === selectedMemory.id
                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    : <Trash2 className="w-3.5 h-3.5" />}
                  {deletingId === selectedMemory.id
                    ? 'Deleting…'
                    : confirmDeleteId === selectedMemory.id
                      ? 'Confirm delete'
                      : 'Delete'}
                </Button>
              )}
            </div>
            <Button onClick={() => { setSelectedMemory(null); setConfirmDeleteId(null); }}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}