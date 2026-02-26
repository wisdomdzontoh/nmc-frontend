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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ChevronRight, ChevronLeft, ChevronsRight, ChevronsLeft, ArrowUp, ArrowDown, Search, Loader2, AlertCircle, Info, ChevronDown } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

export type DataItemType = "data_element" | "indicator";

export interface DataItem {
  id: number;
  code: string;
  name: string;
  type: DataItemType;
}

export interface DatasetOption {
  id: number;
  name: string;
  code: string;
  data_elements?: { id: number; code?: string; name?: string }[];
}

interface DataSelectionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  available: DataItem[];
  selected: DataItem[];
  onSelectedChange: (items: DataItem[]) => void;
  loading?: boolean;
  error?: string | null;
  /** Optional: datasets (report types) to filter by; when one is selected, available is already filtered by parent */
  datasets?: DatasetOption[];
  selectedDatasetId?: number | null;
  onDatasetChange?: (id: number | null) => void;
}

const DataSelectionModal: React.FC<DataSelectionModalProps> = ({
  open,
  onOpenChange,
  available,
  selected,
  onSelectedChange,
  loading = false,
  error = null,
  datasets = [],
  selectedDatasetId = null,
  onDatasetChange,
}) => {
  const [search, setSearch] = useState("");
  const [dataType, setDataType] = useState<string>("all");
  const [leftHighlight, setLeftHighlight] = useState<DataItem | null>(null);
  const [rightHighlight, setRightHighlight] = useState<DataItem | null>(null);
  const [datasetPopoverOpen, setDatasetPopoverOpen] = useState(false);
  const [datasetSearch, setDatasetSearch] = useState("");

  const filteredDatasets = useMemo(() => {
    if (!datasetSearch.trim()) return datasets;
    const q = datasetSearch.toLowerCase();
    return datasets.filter(
      (d) =>
        d.name.toLowerCase().includes(q) ||
        d.code.toLowerCase().includes(q)
    );
  }, [datasets, datasetSearch]);

  const selectedDataset = useMemo(
    () => datasets.find((d) => d.id === selectedDatasetId) ?? null,
    [datasets, selectedDatasetId]
  );

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
      <DialogContent
        className="!max-w-[min(96vw,1400px)] w-[96vw] max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden"
        style={{ width: "min(96vw, 1400px)", maxWidth: "min(96vw, 1400px)" }}
      >
        <DialogHeader className="px-6 pt-6 pb-4 border-b flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">Data</DialogTitle>
        </DialogHeader>

        {error && (
          <div className="px-6 pt-2 flex-shrink-0">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          </div>
        )}

        {/* Dataset filter - searchable dropdown before data type / lists */}
        {datasets.length > 0 && onDatasetChange && (
          <div className="px-6 pt-2 pb-3 flex-shrink-0 border-b">
            <label className="text-xs font-medium text-muted-foreground block mb-1.5">Dataset</label>
            <Popover open={datasetPopoverOpen} onOpenChange={setDatasetPopoverOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  className="w-full max-w-md justify-between font-normal"
                >
                  <span className="truncate">
                    {selectedDataset ? selectedDataset.name : "All datasets"}
                  </span>
                  <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-[var(--radix-popover-trigger-width)] p-0" alignOffset={4}>
                <div className="p-2 border-b">
                  <Input
                    placeholder="Search datasets..."
                    value={datasetSearch}
                    onChange={(e) => setDatasetSearch(e.target.value)}
                    className="h-9"
                  />
                </div>
                <ScrollArea className="max-h-[260px]">
                  <div className="p-1">
                    <button
                      type="button"
                      onClick={() => {
                        onDatasetChange(null);
                        setDatasetPopoverOpen(false);
                        setDatasetSearch("");
                      }}
                      className={cn(
                        "w-full text-left px-3 py-2 text-sm rounded-md",
                        !selectedDatasetId ? "bg-accent" : "hover:bg-muted/80"
                      )}
                    >
                      All datasets
                    </button>
                    {filteredDatasets.map((d) => (
                      <button
                        key={d.id}
                        type="button"
                        onClick={() => {
                          onDatasetChange(d.id);
                          setDatasetPopoverOpen(false);
                          setDatasetSearch("");
                        }}
                        className={cn(
                          "w-full text-left px-3 py-2 text-sm rounded-md truncate",
                          selectedDatasetId === d.id ? "bg-accent" : "hover:bg-muted/80"
                        )}
                        title={d.name}
                      >
                        {d.name}
                      </button>
                    ))}
                  </div>
                </ScrollArea>
              </PopoverContent>
            </Popover>
          </div>
        )}

        <div className="flex flex-1 min-h-0 px-6 py-4 gap-4 overflow-hidden">
          {/* Left: Available - min width so content not truncated */}
          <div className="flex flex-col min-w-[320px] flex-1 basis-0 border rounded-lg bg-muted/30 overflow-hidden">
            <div className="p-3 border-b space-y-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or code"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 bg-background"
                />
              </div>
              <Select value={dataType} onValueChange={setDataType}>
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Data type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  <SelectItem value="data_element">Data element</SelectItem>
                  <SelectItem value="indicator">Indicator</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 min-h-0 p-2 overflow-hidden">
              {loading ? (
                <div className="flex items-center justify-center h-48">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <ScrollArea className="h-[300px]">
                  <ul className="space-y-1 pr-2">
                    {filteredAvailable.length === 0 ? (
                      <li className="text-sm text-muted-foreground py-4 text-center">
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
                            className={cn(
                              "w-full text-left flex items-center gap-2 py-2 px-3 rounded-md text-sm min-w-0",
                              leftHighlight?.id === item.id && leftHighlight?.type === item.type
                                ? "bg-primary/10 border border-primary/30"
                                : "hover:bg-muted/80"
                            )}
                            title={`${item.code} – ${item.name}`}
                          >
                            <span className="text-muted-foreground shrink-0">•</span>
                            <span className="capitalize shrink-0">{item.type.replace("_", " ")}</span>
                            <Info className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                            <span className="truncate flex-1 min-w-0" title={item.name}>
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

          {/* Right: Selected - equal share with left panel */}
          <div className="flex flex-col min-w-[320px] flex-1 basis-0 border rounded-lg bg-muted/30 overflow-hidden">
            <div className="p-3 border-b flex items-center justify-between">
              <span className="text-sm font-medium text-foreground">Selected items</span>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8" title="Move up" disabled>
                  <ArrowUp className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" title="Move down" disabled>
                  <ArrowDown className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <ScrollArea className="h-[300px] flex-1 min-h-0">
              <ul className="space-y-1 p-2">
                {selected.length === 0 ? (
                  <li className="text-sm text-muted-foreground py-6 text-center">
                    No items selected.
                  </li>
                ) : (
                  selected.map((item, index) => (
                    <li key={`${item.type}-${item.id}`} className="flex items-center gap-1 min-w-0">
                      <button
                        type="button"
                        onClick={() => setRightHighlight(rightHighlight?.id === item.id ? null : item)}
                        onDoubleClick={() => removeFromSelected(item)}
                        className={cn(
                          "flex-1 text-left flex items-center gap-2 py-2 px-3 rounded-md text-sm min-w-0",
                          rightHighlight?.id === item.id && rightHighlight?.type === item.type
                            ? "bg-primary/10 border border-primary/30"
                            : "hover:bg-muted/80"
                        )}
                        title={`${item.code} – ${item.name}`}
                      >
                        <span className="truncate min-w-0" title={`${item.code} – ${item.name}`}>
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
