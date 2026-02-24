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
import { Building2, ChevronRight, ChevronDown, Search, Loader2, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import api from "@/lib/api";

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
  };

  const applyUserUnitOnly = (checked: boolean) => {
    setUserUnitOnly(checked);
    setUserSubUnits(false);
    if (checked && userOrgUnitId) {
      setCheckedIds(new Set([userOrgUnitId]));
    } else if (!checked) {
      setCheckedIds(new Set());
    }
  };

  const applyUserSubUnits = (checked: boolean) => {
    setUserSubUnits(checked);
    setUserUnitOnly(false);
    if (checked && userOrgUnitId) {
      const ids = collectDescendantIds(tree, userOrgUnitId);
      setCheckedIds(ids.length > 0 ? new Set(ids) : new Set([userOrgUnitId]));
    } else if (!checked) {
      setCheckedIds(new Set());
    }
  };

  const deselectAll = () => {
    setCheckedIds(new Set());
    setUserUnitOnly(false);
    setUserSubUnits(false);
  };

  const handleUpdate = () => {
    if (userUnitOnly && userOrgUnitId) {
      onApply([userOrgUnitId]);
    } else if (userSubUnits && userOrgUnitId) {
      const ids = collectDescendantIds(tree, userOrgUnitId);
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
            className="flex items-center py-2 px-2 rounded-md hover:bg-slate-50"
            style={{ paddingLeft: 8 + level * 20 }}
          >
            {hasChildren ? (
              <button
                type="button"
                onClick={() => toggleExpand(node.id)}
                className="mr-2 p-1 hover:bg-slate-200 rounded"
              >
                {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </button>
            ) : (
              <span className="w-6 mr-2" />
            )}
            <Checkbox
              checked={isChecked}
              onCheckedChange={() => toggleCheck(node.id)}
              className="mr-2"
            />
            <Building2 className="h-4 w-4 mr-2 text-slate-500" />
            <span className="text-sm">{node.name}</span>
          </div>
          {hasChildren && isExpanded && (
            <div className="mt-0.5">{renderNode(node.children!, level + 1)}</div>
          )}
        </div>
      );
    });

  const selectedCount = userUnitOnly ? 1 : userSubUnits && userOrgUnitId ? collectDescendantIds(tree, userOrgUnitId).length : checkedIds.size;
  const selectedLabel =
    userUnitOnly && userOrgUnitId
      ? "User organisation unit"
      : userSubUnits
        ? "User sub-units"
        : selectedCount === 0
          ? "All"
          : `${selectedCount} unit(s)`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Organisation unit
          </DialogTitle>
        </DialogHeader>

        {error && (
          <div className="px-6 pt-4">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          </div>
        )}

        <div className="px-6 py-4 space-y-4">
          <div className="space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={userUnitOnly}
                onCheckedChange={(c) => applyUserUnitOnly(Boolean(c))}
                disabled={!userOrgUnitId}
              />
              <span className="text-sm">User organisation unit</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={userSubUnits}
                onCheckedChange={(c) => applyUserSubUnits(Boolean(c))}
                disabled={!userOrgUnitId}
              />
              <span className="text-sm">User sub-units</span>
            </label>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search organisation units..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="flex items-center justify-between text-sm text-slate-600">
            <span>Selected: {selectedLabel}</span>
            <Button variant="ghost" size="sm" onClick={deselectAll}>
              Deselect all
            </Button>
          </div>

          <ScrollArea className="h-[320px] border rounded-md bg-slate-50/50">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
              </div>
            ) : filteredTree.length === 0 ? (
              <div className="py-12 text-center text-sm text-slate-500">
                {tree.length === 0 ? "No organisation units available." : "No units match your search."}
              </div>
            ) : (
              <div className="p-2">{renderNode(filteredTree, 0)}</div>
            )}
          </ScrollArea>
        </div>

        <DialogFooter className="px-6 py-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Hide</Button>
          <Button onClick={handleUpdate}>Update</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default OrgUnitFilterModal;
