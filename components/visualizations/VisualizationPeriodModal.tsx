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
import { ChevronRight, ChevronLeft, ChevronsRight, ChevronsLeft, ArrowUp, ArrowDown, Calendar, CheckCircle, Loader2, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";

export type PeriodType = "monthly" | "quarterly" | "half_yearly" | "yearly";

export interface PeriodOption {
  id: string;
  label: string;
  startDate: string;
  endDate: string;
  periodType: PeriodType;
}

export interface VisualizationPeriodResult {
  periodType: PeriodType;
  startDate: string;
  endDate: string;
  selectedLabels: string[];
}

const PERIOD_TYPES: { value: PeriodType; label: string }[] = [
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "half_yearly", label: "Six-monthly" },
  { value: "yearly", label: "Yearly" },
];

function generateFixedPeriods(periodType: PeriodType, year: number): PeriodOption[] {
  const options: PeriodOption[] = [];
  if (periodType === "monthly") {
    for (let m = 1; m <= 12; m++) {
      const start = new Date(year, m - 1, 1);
      const end = new Date(year, m, 0);
      options.push({
        id: `${year}-${String(m).padStart(2, "0")}`,
        label: `${year} ${start.toLocaleString("default", { month: "long" })}`,
        startDate: start.toISOString().slice(0, 10),
        endDate: end.toISOString().slice(0, 10),
        periodType: "monthly",
      });
    }
  } else if (periodType === "quarterly") {
    for (let q = 1; q <= 4; q++) {
      const start = new Date(year, (q - 1) * 3, 1);
      const end = new Date(year, q * 3, 0);
      options.push({
        id: `${year}-Q${q}`,
        label: `${year} Q${q}`,
        startDate: start.toISOString().slice(0, 10),
        endDate: end.toISOString().slice(0, 10),
        periodType: "quarterly",
      });
    }
  } else if (periodType === "half_yearly") {
    for (let h = 1; h <= 2; h++) {
      const start = new Date(year, (h - 1) * 6, 1);
      const end = new Date(year, h * 6, 0);
      options.push({
        id: `${year}-H${h}`,
        label: `${year} H${h}`,
        startDate: start.toISOString().slice(0, 10),
        endDate: end.toISOString().slice(0, 10),
        periodType: "half_yearly",
      });
    }
  } else {
    options.push({
      id: String(year),
      label: String(year),
      startDate: `${year}-01-01`,
      endDate: `${year}-12-31`,
      periodType: "yearly",
    });
  }
  return options;
}

interface VisualizationPeriodModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  value: VisualizationPeriodResult | null;
  onApply: (result: VisualizationPeriodResult) => void;
  error?: string | null;
}

const VisualizationPeriodModal: React.FC<VisualizationPeriodModalProps> = ({
  open,
  onOpenChange,
  value,
  onApply,
  error = null,
}) => {
  const currentYear = new Date().getFullYear();
  const [tab, setTab] = useState<"relative" | "fixed">("fixed");
  const [periodType, setPeriodType] = useState<PeriodType>("monthly");
  const [year, setYear] = useState(currentYear);
  const [fixedPool, setFixedPool] = useState<PeriodOption[]>([]);
  const [selectedPeriods, setSelectedPeriods] = useState<PeriodOption[]>(value?.selectedLabels ? [] : []);
  const [relativeChoice, setRelativeChoice] = useState<string | null>(null);

  const relativeOptions = useMemo(() => {
    const now = new Date();
    return [
      { id: "last-3", label: "Last 3 months", months: 3 },
      { id: "last-6", label: "Last 6 months", months: 6 },
      { id: "last-12", label: "Last 12 months", months: 12 },
      { id: "this-year", label: "This year", months: -1 },
    ];
  }, []);

  const availableFixed = useMemo(
    () => generateFixedPeriods(periodType, year),
    [periodType, year]
  );

  const selectedIds = useMemo(() => new Set(selectedPeriods.map((p) => p.id)), [selectedPeriods]);
  const poolFiltered = useMemo(
    () => availableFixed.filter((p) => !selectedIds.has(p.id)),
    [availableFixed, selectedIds]
  );

  const addPeriod = (p: PeriodOption) => {
    setSelectedPeriods((prev) => [...prev, p]);
  };
  const addAll = () => {
    setSelectedPeriods((prev) => [...prev, ...poolFiltered]);
  };
  const removePeriod = (p: PeriodOption) => {
    setSelectedPeriods((prev) => prev.filter((x) => x.id !== p.id));
  };
  const removeAll = () => setSelectedPeriods([]);

  const moveUp = (index: number) => {
    if (index <= 0) return;
    setSelectedPeriods((prev) => {
      const next = [...prev];
      [next[index - 1], next[index]] = [next[index], next[index - 1]];
      return next;
    });
  };
  const moveDown = (index: number) => {
    if (index >= selectedPeriods.length - 1) return;
    setSelectedPeriods((prev) => {
      const next = [...prev];
      [next[index], next[index + 1]] = [next[index + 1], next[index]];
      return next;
    });
  };

  const handleUpdate = () => {
    if (tab === "relative" && relativeChoice) {
      const opt = relativeOptions.find((o) => o.id === relativeChoice);
      if (opt && opt.months > 0) {
        const end = new Date();
        const start = new Date(end.getFullYear(), end.getMonth() - opt.months, 1);
        const endDate = new Date(end.getFullYear(), end.getMonth() + 1, 0);
        onApply({
          periodType: "monthly",
          startDate: start.toISOString().slice(0, 10),
          endDate: endDate.toISOString().slice(0, 10),
          selectedLabels: [opt.label],
        });
      } else if (opt && opt.months === -1) {
        const y = new Date().getFullYear();
        onApply({
          periodType: "yearly",
          startDate: `${y}-01-01`,
          endDate: `${y}-12-31`,
          selectedLabels: [`${y}`],
        });
      }
    } else if (tab === "fixed" && selectedPeriods.length > 0) {
      const sorted = [...selectedPeriods].sort(
        (a, b) => a.startDate.localeCompare(b.startDate)
      );
      onApply({
        periodType: sorted[0].periodType,
        startDate: sorted[0].startDate,
        endDate: sorted[sorted.length - 1].endDate,
        selectedLabels: sorted.map((p) => p.label),
      });
    }
    onOpenChange(false);
  };

  const canUpdate =
    (tab === "relative" && relativeChoice) || (tab === "fixed" && selectedPeriods.length > 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Period
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

        <div className="flex border-b px-6">
          <button
            type="button"
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
              tab === "relative" ? "border-primary text-primary" : "border-transparent text-slate-600"
            }`}
            onClick={() => setTab("relative")}
          >
            Relative periods
          </button>
          <button
            type="button"
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
              tab === "fixed" ? "border-primary text-primary" : "border-transparent text-slate-600"
            }`}
            onClick={() => setTab("fixed")}
          >
            Fixed periods
          </button>
        </div>

        <div className="flex flex-1 min-h-0 px-6 py-4 gap-4">
          {tab === "relative" && (
            <div className="flex-1 space-y-4">
              <p className="text-sm text-slate-600">Choose a relative period range.</p>
              <div className="space-y-2">
                {relativeOptions.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setRelativeChoice(relativeChoice === opt.id ? null : opt.id)}
                    className={`w-full flex items-center justify-between p-3 rounded-lg border text-left ${
                      relativeChoice === opt.id ? "bg-primary/10 border-primary" : "hover:bg-slate-50"
                    }`}
                  >
                    <span className="text-sm font-medium">{opt.label}</span>
                    {relativeChoice === opt.id && <CheckCircle className="h-4 w-4 text-primary" />}
                  </button>
                ))}
              </div>
            </div>
          )}

          {tab === "fixed" && (
            <>
              <div className="flex flex-col w-[45%] min-w-0 border rounded-lg bg-slate-50/50">
                <div className="p-3 border-b flex gap-2 flex-wrap">
                  <Select value={periodType} onValueChange={(v) => setPeriodType(v as PeriodType)}>
                    <SelectTrigger className="w-[140px] bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PERIOD_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    type="number"
                    min={2000}
                    max={2100}
                    value={year}
                    onChange={(e) => setYear(Number(e.target.value) || currentYear)}
                    className="w-20 bg-white"
                  />
                </div>
                <ScrollArea className="h-[260px]">
                  <ul className="p-2 space-y-1">
                    {availableFixed.map((p) => (
                      <li key={p.id}>
                        <button
                          type="button"
                          onClick={() => addPeriod(p)}
                          className="w-full text-left py-2 px-3 rounded-md text-sm hover:bg-slate-100"
                        >
                          {p.label}
                        </button>
                      </li>
                    ))}
                  </ul>
                </ScrollArea>
              </div>

              <div className="flex flex-col justify-center gap-2">
                <Button variant="outline" size="icon" onClick={() => poolFiltered[0] && addPeriod(poolFiltered[0])} disabled={poolFiltered.length === 0}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" onClick={addAll} disabled={poolFiltered.length === 0}>
                  <ChevronsRight className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" onClick={() => selectedPeriods[0] && removePeriod(selectedPeriods[0])} disabled={selectedPeriods.length === 0}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" onClick={removeAll} disabled={selectedPeriods.length === 0}>
                  <ChevronsLeft className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex flex-col w-[45%] min-w-0 border rounded-lg bg-slate-50/50">
                <div className="p-3 border-b flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-700">Selected periods</span>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" disabled><ArrowUp className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" disabled><ArrowDown className="h-4 w-4" /></Button>
                  </div>
                </div>
                <ScrollArea className="h-[260px]">
                  <ul className="p-2 space-y-1">
                    {selectedPeriods.length === 0 ? (
                      <li className="text-sm text-slate-500 py-6 text-center">No periods selected.</li>
                    ) : (
                      selectedPeriods.map((p, index) => (
                        <li key={p.id} className="flex items-center gap-1">
                          <span className="flex-1 py-2 px-3 rounded-md text-sm bg-white border">{p.label}</span>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => moveUp(index)} disabled={index === 0}><ArrowUp className="h-3.5 w-3.5" /></Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => moveDown(index)} disabled={index === selectedPeriods.length - 1}><ArrowDown className="h-3.5 w-3.5" /></Button>
                        </li>
                      ))
                    )}
                  </ul>
                </ScrollArea>
              </div>
            </>
          )}
        </div>

        <DialogFooter className="px-6 py-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Hide</Button>
          <Button onClick={handleUpdate} disabled={!canUpdate}>Update</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default VisualizationPeriodModal;
