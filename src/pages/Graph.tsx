import React, { useState, useEffect, useCallback, useMemo } from 'react';
import ReactFlow, { 
  Background, 
  Controls, 
  MiniMap,
  useNodesState,
  useEdgesState,
  MarkerType,
  Node,
  Edge
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Card, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter 
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction
} from '@/components/ui/alert-dialog';
import { 
  Filter, 
  Plus, 
  Loader2, 
  Search, 
  Pencil, 
  Trash2, 
  X, 
  ListTree,
  Workflow,
  ArrowRight
} from 'lucide-react';
import { decisionGraphService, DecisionGraphRow } from '@/services/decisionGraphService';
import { useToast } from '@/hooks/use-toast';

function getNodeStyle(name: string) {
  let type: 'input' | 'output' | 'default' = 'default';
  let background = 'hsl(var(--card))';
  let color = 'hsl(var(--foreground))';
  let border = '1px solid hsl(var(--border))';

  const lower = name.toLowerCase();
  if (lower.startsWith('decision:')) {
    type = 'input';
    background = 'hsl(var(--primary))';
    color = 'white';
    border = 'none';
  } else if (lower.startsWith('policy:')) {
    type = 'output';
    background = '#10b981';
    color = 'white';
    border = 'none';
  } else if (lower.startsWith('lesson:')) {
    background = 'hsl(var(--secondary))';
  }

  return { type, background, color, border };
}

export default function GraphPage() {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [rawData, setRawData] = useState<DecisionGraphRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  // Form states for adding new relationship/nodes
  const [sourceNode, setSourceNode] = useState('');
  const [targetNode, setTargetNode] = useState('');
  const [relationship, setRelationship] = useState('');

  // Search / manage tab
  const [searchQuery, setSearchQuery] = useState('');

  // Selected node (for rename/delete actions)
  const [selectedNodeName, setSelectedNodeName] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [isRenameOpen, setIsRenameOpen] = useState(false);
  const [nodeToDelete, setNodeToDelete] = useState<string | null>(null);

  // Selected edge (for edit/delete actions)
  const [editingEdge, setEditingEdge] = useState<DecisionGraphRow | null>(null);
  const [editRelationshipValue, setEditRelationshipValue] = useState('');
  const [edgeToDelete, setEdgeToDelete] = useState<DecisionGraphRow | null>(null);

  const buildGraph = useCallback((data: DecisionGraphRow[]) => {
    const uniqueNodeNames = new Set<string>();
    data.forEach(row => {
      uniqueNodeNames.add(row.source_node);
      uniqueNodeNames.add(row.target_node);
    });

    const nodeList: Node[] = Array.from(uniqueNodeNames).map((name, index) => {
      const { type, background, color, border } = getNodeStyle(name);
      const x = 100 + (index % 3) * 250;
      const y = 50 + Math.floor(index / 3) * 150;

      return {
        id: name,
        type,
        data: { label: name },
        position: { x, y },
        style: {
          background,
          color,
          border,
          borderRadius: '8px',
          padding: '10px',
          cursor: 'pointer'
        }
      };
    });

    const edgeList: Edge[] = data.map(row => ({
      id: row.id,
      source: row.source_node,
      target: row.target_node,
      label: row.relationship,
      animated: row.source_node.toLowerCase().startsWith('decision:'),
      markerEnd: { type: MarkerType.ArrowClosed },
      style: { stroke: 'hsl(var(--primary))', cursor: 'pointer' },
      labelStyle: { fill: 'hsl(var(--foreground))', fontSize: 11, fontWeight: 600 },
      labelBgStyle: { fill: 'hsl(var(--card))', fillOpacity: 0.9 }
    }));

    setNodes(nodeList);
    setEdges(edgeList);
  }, [setNodes, setEdges]);

  const fetchGraphData = async () => {
    setIsLoading(true);
    try {
      let data = await decisionGraphService.getRelationships();
      
      // If no data exists in Supabase yet, let's seed some default relationships for a great first impression
      if (data.length === 0) {
        const defaults = [
          { source: 'Decision: Adopt React', target: 'Outcome: Faster Development', rel: 'leads to' },
          { source: 'Decision: Adopt React', target: 'Outcome: Large Ecosystem', rel: 'leads to' },
          { source: 'Outcome: Faster Development', target: 'Lesson: Component Reusability', rel: 'enables' },
          { source: 'Outcome: Large Ecosystem', target: 'Lesson: Component Reusability', rel: 'supports' },
          { source: 'Lesson: Component Reusability', target: 'Policy: Component-First Design', rel: 'codified as' }
        ];
        
        for (const item of defaults) {
          await decisionGraphService.addRelationship(item.source, item.target, item.rel);
        }
        data = await decisionGraphService.getRelationships();
      }

      setRawData(data);
      buildGraph(data);
    } catch (error) {
      console.error('Error loading graph data:', error);
      toast({
        title: "Error loading graph",
        description: "Failed to fetch decision graph from Supabase.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchGraphData();
  }, []);

  const allNodeNames = useMemo(() => {
    const set = new Set<string>();
    rawData.forEach(r => { set.add(r.source_node); set.add(r.target_node); });
    return Array.from(set).sort();
  }, [rawData]);

  const filteredRelationships = useMemo(() => {
    if (!searchQuery.trim()) return rawData;
    const q = searchQuery.toLowerCase();
    return rawData.filter(r =>
      r.source_node.toLowerCase().includes(q) ||
      r.target_node.toLowerCase().includes(q) ||
      r.relationship.toLowerCase().includes(q)
    );
  }, [rawData, searchQuery]);

  const handleAddRelationship = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sourceNode.trim() || !targetNode.trim() || !relationship.trim()) {
      toast({
        title: "Missing fields",
        description: "Please fill in all fields to create a relationship.",
        variant: "destructive"
      });
      return;
    }

    setIsSaving(true);
    try {
      await decisionGraphService.addRelationship(
        sourceNode.trim(),
        targetNode.trim(),
        relationship.trim()
      );
      toast({
        title: "Relationship added",
        description: "Successfully saved new relationship to Supabase.",
      });
      setSourceNode('');
      setTargetNode('');
      setRelationship('');
      await fetchGraphData();
    } catch (error) {
      console.error('Error adding relationship:', error);
      toast({
        title: "Failed to save",
        description: "Could not save relationship to Supabase.",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const onConnect = useCallback(async (params: any) => {
    if (!params.source || !params.target) return;
    setIsSaving(true);
    try {
      await decisionGraphService.addRelationship(params.source, params.target, 'connected to');
      toast({
        title: "Connection saved",
        description: "Successfully connected nodes in Supabase.",
      });
      await fetchGraphData();
    } catch (error) {
      console.error('Error connecting nodes:', error);
      toast({
        title: "Connection failed",
        description: "Could not save connection to Supabase.",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  }, [toast]);

  // --- Node actions ---
  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNodeName(node.id);
  }, []);

  const openRenameDialog = (name: string) => {
    setRenameValue(name);
    setIsRenameOpen(true);
  };

  const handleRenameNode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedNodeName || !renameValue.trim() || renameValue.trim() === selectedNodeName) {
      setIsRenameOpen(false);
      return;
    }
    setIsSaving(true);
    try {
      await decisionGraphService.renameNode(selectedNodeName, renameValue.trim());
      toast({ title: "Node renamed", description: `Updated all connections for "${selectedNodeName}".` });
      setIsRenameOpen(false);
      setSelectedNodeName(null);
      await fetchGraphData();
    } catch (error) {
      console.error('Error renaming node:', error);
      toast({ title: "Rename failed", description: "Could not rename node in Supabase.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteNode = async () => {
    if (!nodeToDelete) return;
    setIsSaving(true);
    try {
      await decisionGraphService.deleteNode(nodeToDelete);
      toast({ title: "Node deleted", description: `Removed "${nodeToDelete}" and all its connections.` });
      setNodeToDelete(null);
      setSelectedNodeName(null);
      await fetchGraphData();
    } catch (error) {
      console.error('Error deleting node:', error);
      toast({ title: "Delete failed", description: "Could not delete node from Supabase.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  // --- Edge actions ---
  const onEdgeClick = useCallback((_: React.MouseEvent, edge: Edge) => {
    const row = rawData.find(r => r.id === edge.id);
    if (row) {
      setEditingEdge(row);
      setEditRelationshipValue(row.relationship);
    }
  }, [rawData]);

  const handleUpdateEdge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEdge || !editRelationshipValue.trim()) return;
    setIsSaving(true);
    try {
      await decisionGraphService.updateRelationship(editingEdge.id, { relationship: editRelationshipValue.trim() });
      toast({ title: "Connection updated", description: "Relationship label saved." });
      setEditingEdge(null);
      await fetchGraphData();
    } catch (error) {
      console.error('Error updating relationship:', error);
      toast({ title: "Update failed", description: "Could not update relationship in Supabase.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteEdge = async (row: DecisionGraphRow) => {
    setIsSaving(true);
    try {
      await decisionGraphService.deleteRelationship(row.id);
      toast({ title: "Connection deleted", description: `Removed "${row.relationship}" link.` });
      setEdgeToDelete(null);
      if (editingEdge?.id === row.id) setEditingEdge(null);
      await fetchGraphData();
    } catch (error) {
      console.error('Error deleting relationship:', error);
      toast({ title: "Delete failed", description: "Could not delete connection from Supabase.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="h-[calc(100vh-12rem)] flex flex-col gap-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Decision Graph</h1>
          <p className="text-muted-foreground">Visualize the lineage of organizational choices and their impacts.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-2" onClick={fetchGraphData}>
            <Filter className="w-4 h-4" />
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 flex-1 min-h-0">
        {/* Left Sidebar: Add / Manage tabs */}
        <Card className="glass-card flex flex-col h-full lg:col-span-1">
          <Tabs defaultValue="add" className="flex flex-col h-full">
            <CardHeader className="pb-3">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="add" className="gap-1.5 text-xs">
                  <Plus className="w-3.5 h-3.5" /> Add
                </TabsTrigger>
                <TabsTrigger value="manage" className="gap-1.5 text-xs">
                  <ListTree className="w-3.5 h-3.5" /> Manage
                </TabsTrigger>
              </TabsList>
            </CardHeader>

            {/* ADD TAB */}
            <TabsContent value="add" className="flex-1 overflow-y-auto px-6 pb-6 mt-0 space-y-4">
              <form onSubmit={handleAddRelationship} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="source">Source Node</Label>
                  <Input 
                    id="source"
                    placeholder="e.g., Decision: Adopt React" 
                    value={sourceNode}
                    onChange={(e) => setSourceNode(e.target.value)}
                    list="existing-nodes"
                  />
                  <p className="text-[10px] text-muted-foreground">Prefix with "Decision:" or "Policy:" for custom styling.</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="relationship">Relationship</Label>
                  <Input 
                    id="relationship"
                    placeholder="e.g., leads to, enables, supports" 
                    value={relationship}
                    onChange={(e) => setRelationship(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="target">Target Node</Label>
                  <Input 
                    id="target"
                    placeholder="e.g., Outcome: Faster Development" 
                    value={targetNode}
                    onChange={(e) => setTargetNode(e.target.value)}
                    list="existing-nodes"
                  />
                </div>

                {/* Shared datalist so users can quickly reuse existing node names */}
                <datalist id="existing-nodes">
                  {allNodeNames.map(name => <option key={name} value={name} />)}
                </datalist>

                <Button type="submit" className="w-full gap-2" disabled={isSaving}>
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  Add Connection
                </Button>
              </form>

              <div className="pt-4 border-t border-border space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Tips</h4>
                <ul className="text-xs text-muted-foreground space-y-1 list-disc pl-4">
                  <li>Prefix with <strong>Decision:</strong> for purple nodes.</li>
                  <li>Prefix with <strong>Policy:</strong> for green nodes.</li>
                  <li>Prefix with <strong>Lesson:</strong> for gray nodes.</li>
                  <li>Drag from one node's handle to another to connect them instantly.</li>
                  <li>Click any node or connection on the canvas to rename, edit, or delete it.</li>
                </ul>
              </div>
            </TabsContent>

            {/* MANAGE TAB */}
            <TabsContent value="manage" className="flex-1 overflow-y-auto px-6 pb-6 mt-0 space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search connections..."
                  className="pl-9"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              {filteredRelationships.length === 0 ? (
                <div className="text-center py-10 text-xs text-muted-foreground">
                  {rawData.length === 0 ? 'No connections yet. Add one from the "Add" tab.' : 'No connections match your search.'}
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredRelationships.map((row) => (
                    <div key={row.id} className="p-3 rounded-lg border border-border/60 bg-secondary/20 space-y-1.5 group">
                      <div className="flex items-center gap-1.5 text-xs">
                        <span className="font-medium truncate">{row.source_node}</span>
                        <ArrowRight className="w-3 h-3 text-muted-foreground shrink-0" />
                        <span className="font-medium truncate">{row.target_node}</span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <Badge variant="secondary" className="text-[10px] h-5 font-normal">
                          {row.relationship}
                        </Badge>
                        <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => {
                              setEditingEdge(row);
                              setEditRelationshipValue(row.relationship);
                            }}
                          >
                            <Pencil className="w-3 h-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-destructive hover:text-destructive"
                            onClick={() => setEdgeToDelete(row)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {allNodeNames.length > 0 && (
                <div className="pt-3 border-t border-border space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">All Nodes ({allNodeNames.length})</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {allNodeNames.map(name => (
                      <Badge
                        key={name}
                        variant="outline"
                        className="text-[10px] cursor-pointer hover:bg-secondary transition-colors gap-1 pr-1"
                        onClick={() => openRenameDialog(name)}
                      >
                        <span className="truncate max-w-[140px]">{name}</span>
                        <Trash2
                          className="w-2.5 h-2.5 text-destructive shrink-0"
                          onClick={(e) => { e.stopPropagation(); setNodeToDelete(name); }}
                        />
                      </Badge>
                    ))}
                  </div>
                  <p className="text-[10px] text-muted-foreground">Click a node name to rename it, or the trash icon to delete it (and all its connections).</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </Card>

        {/* Right Area: ReactFlow Graph */}
        <Card className="lg:col-span-3 overflow-hidden glass-card relative border-none h-full">
          <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
            <div className="bg-card/80 backdrop-blur-md border border-border p-2 rounded-lg flex flex-col gap-1">
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-2 mb-1">Legend</div>
              <div className="flex items-center gap-2 px-2">
                <div className="w-3 h-3 rounded-full bg-primary" />
                <span className="text-xs">Decision</span>
              </div>
              <div className="flex items-center gap-2 px-2">
                <div className="w-3 h-3 rounded-full bg-card border border-border" />
                <span className="text-xs">Outcome</span>
              </div>
              <div className="flex items-center gap-2 px-2">
                <div className="w-3 h-3 rounded-full bg-secondary" />
                <span className="text-xs">Lesson</span>
              </div>
              <div className="flex items-center gap-2 px-2">
                <div className="w-3 h-3 rounded-full bg-emerald-500" />
                <span className="text-xs">Policy</span>
              </div>
            </div>
          </div>

          {/* Selected node quick-action toolbar */}
          {selectedNodeName && (
            <div className="absolute top-4 right-4 z-10 bg-card/95 backdrop-blur-md border border-border p-2.5 rounded-lg flex items-center gap-2 shadow-lg max-w-xs">
              <Workflow className="w-3.5 h-3.5 text-primary shrink-0" />
              <span className="text-xs font-medium truncate flex-1">{selectedNodeName}</span>
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openRenameDialog(selectedNodeName)}>
                <Pencil className="w-3.5 h-3.5" />
              </Button>
              <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setNodeToDelete(selectedNodeName)}>
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setSelectedNodeName(null)}>
                <X className="w-3.5 h-3.5" />
              </Button>
            </div>
          )}

          {isLoading ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/50 backdrop-blur-sm z-20">
              <Loader2 className="w-8 h-8 animate-spin text-primary mb-2" />
              <p className="text-sm text-muted-foreground">Loading decision graph...</p>
            </div>
          ) : nodes.length === 0 ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
              <Workflow className="w-10 h-10 text-muted-foreground mb-3" />
              <h3 className="font-semibold mb-1">No connections yet</h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                Add your first decision, outcome, or policy from the "Add" tab to start building the graph.
              </p>
            </div>
          ) : (
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onNodeClick={onNodeClick}
              onEdgeClick={onEdgeClick}
              onPaneClick={() => setSelectedNodeName(null)}
              fitView
              className="bg-dot-pattern"
            >
              <Background color="hsl(var(--muted-foreground))" gap={20} size={1} />
              <Controls className="bg-card border-border fill-foreground" />
              <MiniMap 
                nodeColor={(n) => {
                  if (n.type === 'input') return 'hsl(var(--primary))';
                  if (n.type === 'output') return '#10b981';
                  return 'hsl(var(--secondary))';
                }}
                maskColor="rgba(0, 0, 0, 0.1)"
                className="bg-card border-border"
              />
            </ReactFlow>
          )}
        </Card>
      </div>

      {/* Rename Node Dialog */}
      <Dialog open={isRenameOpen} onOpenChange={setIsRenameOpen}>
        <DialogContent className="sm:max-w-[420px] glass-card">
          <DialogHeader>
            <DialogTitle>Rename Node</DialogTitle>
            <DialogDescription>
              Updates every connection where "{selectedNodeName}" appears as a source or target.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleRenameNode} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="rename-node">Node Name</Label>
              <Input
                id="rename-node"
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                autoFocus
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsRenameOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isSaving} className="gap-2">
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Save
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Edge / Relationship Dialog */}
      <Dialog open={!!editingEdge} onOpenChange={(open) => !open && setEditingEdge(null)}>
        <DialogContent className="sm:max-w-[460px] glass-card">
          <DialogHeader>
            <DialogTitle>Edit Connection</DialogTitle>
            <DialogDescription>
              {editingEdge && (
                <span className="flex items-center gap-1.5 mt-1 text-xs">
                  <span className="font-medium text-foreground">{editingEdge.source_node}</span>
                  <ArrowRight className="w-3 h-3" />
                  <span className="font-medium text-foreground">{editingEdge.target_node}</span>
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdateEdge} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-relationship">Relationship Label</Label>
              <Input
                id="edit-relationship"
                value={editRelationshipValue}
                onChange={(e) => setEditRelationshipValue(e.target.value)}
                placeholder="e.g., leads to, enables, supports"
                autoFocus
              />
            </div>
            <DialogFooter className="flex items-center sm:justify-between gap-2">
              <Button
                type="button"
                variant="ghost"
                className="text-destructive hover:text-destructive hover:bg-destructive/10 gap-2"
                onClick={() => editingEdge && setEdgeToDelete(editingEdge)}
              >
                <Trash2 className="w-4 h-4" />
                Delete Connection
              </Button>
              <Button type="submit" disabled={isSaving} className="gap-2">
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Save
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Node Confirmation */}
      <AlertDialog open={!!nodeToDelete} onOpenChange={(open) => !open && setNodeToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{nodeToDelete}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes this node and every connection linked to it as a source or target. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDeleteNode}
            >
              Delete Node
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Edge Confirmation */}
      <AlertDialog open={!!edgeToDelete} onOpenChange={(open) => !open && setEdgeToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this connection?</AlertDialogTitle>
            <AlertDialogDescription>
              {edgeToDelete && (
                <>Removes the "{edgeToDelete.relationship}" link between "{edgeToDelete.source_node}" and "{edgeToDelete.target_node}". This cannot be undone.</>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => edgeToDelete && handleDeleteEdge(edgeToDelete)}
            >
              Delete Connection
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
