"use client";

import React, { useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronRight, ChevronLeft, ChevronsRight, ChevronsLeft, ArrowUp, ArrowDown, Search, Loader2, AlertCircle, Info } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";

export type DataItemType = "data_element" | "indicator";

export interface DataItem {
  id: number;
  code: string;
  name: string;
  type: DataItemType;
}

interface DataSelectionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  available: DataItem[];
  selected: DataItem[];
  onSelectedChange: (items: DataItem[]) => void;
  loading?: boolean;
  error?: string | null;
}

const DataSelectionModal: React.FC<DataSelectionModalProps> = ({
  open,
  onOpenChange,
  available,
  selected,
  onSelectedChange,
  loading = false,
  error = null,
}) => {
  const [search, setSearch] = useState("");
  const [dataType, setDataType] = useState<string>("all");
  const [leftHighlight, setLeftHighlight] = useState<DataItem | null>(null);
  const [rightHighlight, setRightHighlight] = useState<DataItem | null>(null);

  const selectedIds = useMemo(() => new Set(selected.map((s) => `${s.type}:${s.id}`)), [selected]);

  const filteredAvailable = useMemo(() => {
    let list = available.filter((a) => !selectedIds.has(`${a.type}:${a.id}`));
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (a) =>
          a.name.toLowerCase().includes(q) ||
          (a.code || "").toLowerCase().includes(q)
      );
    }
    if (dataType === "data_element") {
      list = list.filter((a) => a.type === "data_element");
    } else if (dataType === "indicator") {
      list = list.filter((a) => a.type === "indicator");
    }
    return list;
  }, [available, selectedIds, search, dataType]);

  const moveToSelected = (item: DataItem) => {
    onSelectedChange([...selected, item]);
    setLeftHighlight(null);
  };

  const moveAllToSelected = () => {
    onSelectedChange([...selected, ...filteredAvailable]);
    setLeftHighlight(null);
  };

  const removeFromSelected = (item: DataItem) => {
    onSelectedChange(selected.filter((s) => !(s.type === item.type && s.id === item.id)));
    setRightHighlight(null);
  };

  const removeAllFromSelected = () => {
    onSelectedChange([]);
    setRightHighlight(null);
  };

  const moveSelectedUp = (index: number) => {
    if (index <= 0) return;
    const next = [...selected];
    [next[index - 1], next[index]] = [next[index], next[index - 1]];
    onSelectedChange(next);
  };

  const moveSelectedDown = (index: number) => {
    if (index >= selected.length - 1) return;
    const next = [...selected];
    [next[index], next[index + 1]] = [next[index + 1], next[index]];
    onSelectedChange(next);
  };

  const handleUpdate = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle className="flex items-center gap-2">Data</DialogTitle>
        </DialogHeader>

        {error && (
          <div className="px-6 pt-4">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          </div>
        )}

        <div className="flex flex-1 min-h-0 px-6 py-4 gap-4">
          {/* Left: Available */}
          <div className="flex flex-col w-[45%] min-w-0 border rounded-lg bg-slate-50/50">
            <div className="p-3 border-b space-y-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search by data item name"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 bg-white"
                />
              </div>
              <Select value={dataType} onValueChange={setDataType}>
                <SelectTrigger className="bg-white">
                  <SelectValue placeholder="Data type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  <SelectItem value="data_element">Data element</SelectItem>
                  <SelectItem value="indicator">Indicator</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 min-h-0 p-2">
              {loading ? (
                <div className="flex items-center justify-center h-48">
                  <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
                </div>
              ) : (
                <ScrollArea className="h-[280px]">
                  <ul className="space-y-1 pr-2">
                    {filteredAvailable.length === 0 ? (
                      <li className="text-sm text-slate-500 py-4 text-center">
                        {available.length === 0
                          ? "No data elements or indicators available."
                          : "No items match your search or filter."}
                      </li>
                    ) : (
                      filteredAvailable.map((item) => (
                        <li key={`${item.type}-${item.id}`}>
                          <button
                            type="button"
                            onClick={() => setLeftHighlight(leftHighlight?.id === item.id ? null : item)}
                            onDoubleClick={() => moveToSelected(item)}
                            className={`w-full text-left flex items-center gap-2 py-2 px-3 rounded-md text-sm ${
                              leftHighlight?.id === item.id && leftHighlight?.type === item.type
                                ? "bg-primary/10 border border-primary/30"
                                : "hover:bg-slate-100"
                            }`}
                          >
                            <span className="text-slate-400">•</span>
                            <span className="capitalize">{item.type.replace("_", " ")}</span>
                            <Info className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                            <span className="truncate flex-1" title={item.name}>
                              {item.name}
                            </span>
                          </button>
                        </li>
                      ))
                    )}
                  </ul>
                </ScrollArea>
              )}
            </div>
          </div>

          {/* Arrows */}
          <div className="flex flex-col justify-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => leftHighlight && moveToSelected(leftHighlight)}
              disabled={!leftHighlight}
              title="Add selected"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={moveAllToSelected}
              disabled={filteredAvailable.length === 0}
              title="Add all"
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => rightHighlight && removeFromSelected(rightHighlight)}
              disabled={!rightHighlight}
              title="Remove selected"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={removeAllFromSelected}
              disabled={selected.length === 0}
              title="Remove all"
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
          </div>

          {/* Right: Selected */}
          <div className="flex flex-col w-[45%] min-w-0 border rounded-lg bg-slate-50/50">
            <div className="p-3 border-b flex items-center justify-between">
              <span className="text-sm font-medium text-slate-700">Selected items</span>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8" title="Move up" disabled>
                  <ArrowUp className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" title="Move down" disabled>
                  <ArrowDown className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <ScrollArea className="h-[280px] flex-1 min-h-0">
              <ul className="space-y-1 p-2">
                {selected.length === 0 ? (
                  <li className="text-sm text-slate-500 py-6 text-center">
                    No items selected.
                  </li>
                ) : (
                  selected.map((item, index) => (
                    <li key={`${item.type}-${item.id}`} className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setRightHighlight(rightHighlight?.id === item.id ? null : item)}
                        onDoubleClick={() => removeFromSelected(item)}
                        className={`flex-1 text-left flex items-center gap-2 py-2 px-3 rounded-md text-sm ${
                          rightHighlight?.id === item.id && rightHighlight?.type === item.type
                            ? "bg-primary/10 border border-primary/30"
                            : "hover:bg-slate-100"
                        }`}
                      >
                        <span className="truncate" title={item.name}>
                          {item.code} – {item.name}
                        </span>
                      </button>
                      <div className="flex flex-shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => moveSelectedUp(index)}
                          disabled={index === 0}
                        >
                          <ArrowUp className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => moveSelectedDown(index)}
                          disabled={index === selected.length - 1}
                        >
                          <ArrowDown className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </li>
                  ))
                )}
              </ul>
            </ScrollArea>
          </div>
        </div>

        <DialogFooter className="px-6 py-4 border-t flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Hide
          </Button>
          <Button onClick={handleUpdate}>Update</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DataSelectionModal;
