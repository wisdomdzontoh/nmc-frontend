"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Folder, ChevronRight, ChevronDown, Search, Loader2, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import api from "@/lib/api";
import { cn } from "@/lib/utils";

export interface OrgUnitNode {
  id: number;
  name: string;
  code?: string;
  parent?: number;
  children?: OrgUnitNode[];
}

interface OrgUnitFilterModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedIds: number[];
  onApply: (ids: number[] | "all") => void;
  userOrgUnitId?: number | null;
}

function flattenTree(nodes: OrgUnitNode[], acc: OrgUnitNode[] = []): OrgUnitNode[] {
  for (const n of nodes) {
    acc.push(n);
    if (n.children?.length) flattenTree(n.children, acc);
  }
  return acc;
}

function collectDescendantIds(nodes: OrgUnitNode[], id: number): number[] {
  const ids: number[] = [id];
  const find = (list: OrgUnitNode[]): boolean => {
    for (const n of list) {
      if (n.id === id) {
        if (n.children?.length) flattenTree(n.children).forEach((c) => ids.push(c.id));
        return true;
      }
      if (n.children?.length && find(n.children)) return true;
    }
    return false;
  };
  find(nodes);
  return [...new Set(ids)];
}

function collectDescendantIdsWithMaxDepth(nodes: OrgUnitNode[], id: number, maxDepth: number): number[] {
  const ids: number[] = [];
  const addNodeAndDescendants = (node: OrgUnitNode, depth: number) => {
    ids.push(node.id);
    if (depth < maxDepth && node.children?.length) {
      node.children.forEach((c) => addNodeAndDescendants(c, depth + 1));
    }
  };
  const findAndAdd = (list: OrgUnitNode[]): boolean => {
    for (const n of list) {
      if (n.id === id) {
        addNodeAndDescendants(n, 0);
        return true;
      }
      if (n.children?.length && findAndAdd(n.children)) return true;
    }
    return false;
  };
  findAndAdd(nodes);
  return ids;
}

const OrgUnitFilterModal: React.FC<OrgUnitFilterModalProps> = ({
  open,
  onOpenChange,
  selectedIds,
  onApply,
  userOrgUnitId,
}) => {
  const [tree, setTree] = useState<OrgUnitNode[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [checkedIds, setCheckedIds] = useState<Set<number>>(new Set(selectedIds));
  const [userUnitOnly, setUserUnitOnly] = useState(false);
  const [userSubUnits, setUserSubUnits] = useState(false);
  const [userSubX2Units, setUserSubX2Units] = useState(false);

  const normalizeTree = useCallback((nodes: OrgUnitNode[]): OrgUnitNode[] => {
    return nodes.map((n) => ({
      ...n,
      children: normalizeTree(n.children ?? []),
    }));
  }, []);

  useEffect(() => {
    if (!open) return;
    setError(null);
    const load = async () => {
      try {
        setLoading(true);
        const res = await api.get("/org/tree/");
        const data = normalizeTree(res.data ?? []);
        setTree(data);
        if (userOrgUnitId) {
          setExpanded((prev) => new Set(prev).add(userOrgUnitId));
        }
      } catch (err) {
        console.error("Failed to load organisation units:", err);
        setError("Failed to load organisation units. Please try again.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [open, userOrgUnitId, normalizeTree]);

  useEffect(() => {
    if (!open) return;
    setCheckedIds(new Set(selectedIds));
  }, [open, selectedIds]);

  const filteredTree = useMemo(() => {
    if (!search.trim()) return tree;
    const q = search.toLowerCase();
    const filter = (nodes: OrgUnitNode[]): OrgUnitNode[] =>
      nodes
        .map((n) => ({ ...n, children: filter(n.children ?? []) }))
        .filter((n) => n.name.toLowerCase().includes(q) || (n.children ?? []).length > 0);
    return filter(tree);
  }, [tree, search]);

  const toggleExpand = (id: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleCheck = (id: number) => {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setUserUnitOnly(false);
    setUserSubUnits(false);
    setUserSubX2Units(false);
  };

  const applyUserUnitOnly = (checked: boolean) => {
    setUserUnitOnly(checked);
    setUserSubUnits(false);
    setUserSubX2Units(false);
    if (checked && userOrgUnitId) {
      setCheckedIds(new Set([userOrgUnitId]));
    } else if (!checked) {
      setCheckedIds(new Set());
    }
  };

  const applyUserSubUnits = (checked: boolean) => {
    setUserSubUnits(checked);
    setUserUnitOnly(false);
    setUserSubX2Units(false);
    if (checked && userOrgUnitId) {
      const ids = collectDescendantIds(tree, userOrgUnitId);
      setCheckedIds(ids.length > 0 ? new Set(ids) : new Set([userOrgUnitId]));
    } else if (!checked) {
      setCheckedIds(new Set());
    }
  };

  const applyUserSubX2Units = (checked: boolean) => {
    setUserSubX2Units(checked);
    setUserUnitOnly(false);
    setUserSubUnits(false);
    if (checked && userOrgUnitId) {
      const ids = collectDescendantIdsWithMaxDepth(tree, userOrgUnitId, 2);
      setCheckedIds(ids.length > 0 ? new Set(ids) : new Set([userOrgUnitId]));
    } else if (!checked) {
      setCheckedIds(new Set());
    }
  };

  const deselectAll = () => {
    setCheckedIds(new Set());
    setUserUnitOnly(false);
    setUserSubUnits(false);
    setUserSubX2Units(false);
  };

  const handleUpdate = () => {
    if (userUnitOnly && userOrgUnitId) {
      onApply([userOrgUnitId]);
    } else if (userSubUnits && userOrgUnitId) {
      const ids = collectDescendantIds(tree, userOrgUnitId);
      onApply(ids.length > 0 ? ids : [userOrgUnitId]);
    } else if (userSubX2Units && userOrgUnitId) {
      const ids = collectDescendantIdsWithMaxDepth(tree, userOrgUnitId, 2);
      onApply(ids.length > 0 ? ids : [userOrgUnitId]);
    } else if (checkedIds.size === 0) {
      onApply("all");
    } else {
      onApply(Array.from(checkedIds));
    }
    onOpenChange(false);
  };

  const renderNode = (nodes: OrgUnitNode[], level: number): React.ReactNode =>
    nodes.map((node) => {
      const hasChildren = (node.children?.length ?? 0) > 0;
      const isExpanded = expanded.has(node.id);
      const isChecked = checkedIds.has(node.id);

      return (
        <div key={node.id}>
          <div
            className={cn(
              "flex items-center gap-2 py-2 px-2 rounded-md transition-colors",
              "hover:bg-muted/50",
              isChecked && "bg-primary/5"
            )}
            style={{ paddingLeft: 8 + level * 20 }}
          >
            {hasChildren ? (
              <button
                type="button"
                onClick={() => toggleExpand(node.id)}
                className="p-0.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                aria-label={isExpanded ? "Collapse" : "Expand"}
              >
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </button>
            ) : (
              <span className="w-5 shrink-0" />
            )}
            <Checkbox
              checked={isChecked}
              onCheckedChange={() => toggleCheck(node.id)}
              className="h-4 w-4 rounded border-2 border-muted-foreground/40 data-[state=checked]:border-primary data-[state=checked]:bg-primary"
            />
            <Folder className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="text-sm text-foreground truncate">{node.name}</span>
          </div>
          {hasChildren && isExpanded && (
            <div className="mt-0.5">{renderNode(node.children!, level + 1)}</div>
          )}
        </div>
      );
    });

  const selectedCount = userUnitOnly
    ? 1
    : userSubUnits && userOrgUnitId
      ? collectDescendantIds(tree, userOrgUnitId).length
      : userSubX2Units && userOrgUnitId
        ? collectDescendantIdsWithMaxDepth(tree, userOrgUnitId, 2).length
        : checkedIds.size;
  const selectedLabel =
    userUnitOnly && userOrgUnitId
      ? "User organisation unit"
      : userSubUnits
        ? "User sub-units"
        : userSubX2Units
          ? "User sub-x2-units"
          : selectedCount === 0
            ? "All"
            : `${selectedCount} unit(s)`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
        <DialogHeader className="flex flex-row items-center justify-between space-y-0 px-6 pt-6 pb-4 border-b">
          <DialogTitle className="text-lg font-semibold">Organisation unit</DialogTitle>
        </DialogHeader>

        {error && (
          <div className="px-6 pt-2">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          </div>
        )}

        <div className="px-6 py-4 space-y-4 flex flex-col min-h-0 flex-1">
          {/* Top checkboxes - horizontal row like image */}
          <div className="flex flex-wrap items-center gap-6">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <Checkbox
                checked={userUnitOnly}
                onCheckedChange={(c) => applyUserUnitOnly(Boolean(c))}
                disabled={!userOrgUnitId}
                className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
              />
              <span className="text-sm font-medium">User organisation unit</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <Checkbox
                checked={userSubUnits}
                onCheckedChange={(c) => applyUserSubUnits(Boolean(c))}
                disabled={!userOrgUnitId}
                className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
              />
              <span className="text-sm font-medium">User sub-units</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <Checkbox
                checked={userSubX2Units}
                onCheckedChange={(c) => applyUserSubX2Units(Boolean(c))}
                disabled={!userOrgUnitId}
                className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
              />
              <span className="text-sm font-medium">User sub-x2-units</span>
            </label>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search organisation units..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Tree - scrollable */}
          <ScrollArea className="h-[280px] border rounded-lg bg-muted/30">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredTree.length === 0 ? (
              <div className="py-12 text-center text-sm text-muted-foreground">
                {tree.length === 0 ? "No organisation units available." : "No units match your search."}
              </div>
            ) : (
              <div className="p-2">{renderNode(filteredTree, 0)}</div>
            )}
          </ScrollArea>

          {/* Level and group dropdowns */}
          <div className="flex flex-wrap gap-4">
            <div className="min-w-[160px]">
              <label className="text-xs font-medium text-muted-foreground block mb-1">Select a level</label>
              <Select disabled>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All levels</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="min-w-[160px]">
              <label className="text-xs font-medium text-muted-foreground block mb-1">Select a group</label>
              <Select disabled>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a group" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All groups</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Selected + Deselect all */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Selected: <span className="font-medium text-foreground">{selectedLabel}</span></span>
            <Button variant="ghost" size="sm" onClick={deselectAll} className="text-muted-foreground hover:text-foreground">
              Deselect all
            </Button>
          </div>
        </div>

        <DialogFooter className="px-6 py-4 border-t bg-muted/20 flex-shrink-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Hide
          </Button>
          <Button onClick={handleUpdate}>
            Update
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default OrgUnitFilterModal;
