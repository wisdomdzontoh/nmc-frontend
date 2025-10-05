"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { Calculator, Database } from "lucide-react";

/** We support TWO section shapes:
 *  A) GRID shape
 *     { id, type:"table", rows:number, cols:number, cells: { "r-c": { type, content?, dataElement?, formula?, ... } } }
 *
 *  B) TABLE-ARRAY shape
 *     {
 *       id, type:"table",
 *       columnWidths?: number[],
 *       header?: { rows: Array<Array<{ label?:string; colSpan?:number; rowSpan?:number; align?: "left"|"center"|"right" }>> },
 *       rows: Array<{ cells: Array<{ text?:string; bind?:string; compute?:string; colSpan?:number; rowSpan?:number; align?: "left"|"center"|"right" }> }>
 *     }
 */

type ValuesByCode = Record<string, number | string | null>;

type Props = {
  layout: any; // layout schema (two variants supported)
  values: ValuesByCode;
  onChange: (code: string, val: number | string | null) => void;
  readOnly?: boolean;
};

/** ---------- helpers ---------- */

function evalFormula(formula: string, values: ValuesByCode): number | null {
  try {
    let expr = formula;
    // crude token match: words, dots, underscores, and digits (so codes like foo.bar_1)
    const codes = formula.match(/[A-Za-z_][A-Za-z0-9_.]*/g) || [];
    for (const code of codes) {
      const v = values[code];
      if (typeof v === "number") {
        expr = expr.replace(new RegExp(code, "g"), String(v));
      } else {
        // cannot compute (missing value)
        return null;
      }
    }
    // eslint-disable-next-line no-new-func
    const result = Function(`"use strict"; return (${expr})`)();
    return typeof result === "number" && !Number.isNaN(result) ? result : null;
  } catch {
    return null;
  }
}

function CellInput({
  code,
  isRemark,
  numberValue,
  textValue,
  readOnly,
  onChange,
}: {
  code: string;
  isRemark: boolean;
  numberValue: number | null;
  textValue: string;
  readOnly?: boolean;
  onChange: (code: string, val: number | string | null) => void;
}) {
  if (isRemark) {
    return (
      <Textarea
        value={textValue ?? ""}
        readOnly={readOnly}
        onChange={(e) => onChange(code, e.target.value)}
        className="min-h-[60px] text-sm resize-none"
        placeholder="Enter remarks…"
      />
    );
  }
  return (
    <Input
      type="number"
      step="0.01"
      value={numberValue ?? ""}
      readOnly={readOnly}
      onChange={(e) => {
        const raw = e.target.value.trim();
        onChange(code, raw === "" ? null : Number(raw));
      }}
      className="text-right h-12 text-lg font-semibold px-4 border-2 border-blue-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 bg-white"
      placeholder="0"
    />
  );
}

/** ---------- renderer for TABLE-ARRAY shape ---------- */
function TableArray({
  section,
  values,
  onChange,
  readOnly,
}: {
  section: any;
  values: ValuesByCode;
  onChange: (code: string, val: number | string | null) => void;
  readOnly?: boolean;
}) {
  const colWidths: number[] | undefined = section.columnWidths;
  const header = section.header?.rows;
  const body = section.rows || [];

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse min-w-[700px]">
        {Array.isArray(colWidths) && colWidths.length > 0 ? (
          <colgroup>
            {colWidths.map((w: number, i: number) => (
              <col key={i} style={{ width: `${w}px` }} />
            ))}
          </colgroup>
        ) : null}

        {Array.isArray(header) && header.length > 0 ? (
          <thead className="bg-amber-50">
            {header.map((hr: any[], ri: number) => (
              <tr key={`th-${ri}`}>
                {hr.map((hc: any, ci: number) => (
                  <th
                    key={`thc-${ri}-${ci}`}
                    colSpan={hc.colSpan || 1}
                    rowSpan={hc.rowSpan || 1}
                    className={cn(
                      "border border-gray-300 px-2 py-2 text-left text-[14px] font-bold bg-blue-50",
                      hc.align === "center" && "text-center",
                      hc.align === "right" && "text-right"
                    )}
                  >
                    {hc.label ?? ""}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
        ) : null}

        <tbody>
          {body.map((row: any, ri: number) => (
            <tr key={`tr-${ri}`} className="hover:bg-blue-50/20">
              {(row.cells || []).map((c: any, ci: number) => {
                let content: React.ReactNode = c.text ?? "";
                let extraClass = "";

                if (c.bind) {
                  const code = String(c.bind);
                  const isRemark = code.startsWith("remark.");
                  content = (
                    <CellInput
                      code={code}
                      isRemark={isRemark}
                      numberValue={(values[code] as number | null) ?? null}
                      textValue={String(values[code] ?? "")}
                      onChange={onChange}
                      readOnly={readOnly}
                    />
                  );
                  extraClass = "bg-blue-50/30";
                } else if (c.compute) {
                  const computed = evalFormula(String(c.compute), values);
                  content = (
                    <div className="flex items-center gap-2 text-purple-700 text-lg font-semibold">
                      <Calculator className="h-5 w-5" />
                      <span className="font-mono font-semibold">
                        {computed !== null ? computed : "—"}
                      </span>
                    </div>
                  );
                  extraClass = "bg-purple-50/30";
                } else if (typeof c.text === "string" && c.text.trim() !== "") {
                  content = <span className="text-lg font-semibold">{c.text}</span>;
                }

                return (
                  <td
                    key={`td-${ri}-${ci}`}
                    colSpan={c.colSpan || 1}
                    rowSpan={c.rowSpan || 1}
                    className={cn(
                      "border border-gray-300 px-3 py-3 align-top min-w-[120px]",
                      c.bold && "font-semibold",
                      c.align === "center" && "text-center",
                      c.align === "right" && "text-right",
                      extraClass
                    )}
                  >
                    {content}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** ---------- renderer for GRID shape ---------- */
function GridTable({
  section,
  values,
  onChange,
  readOnly,
}: {
  section: any;
  values: ValuesByCode;
  onChange: (code: string, val: number | string | null) => void;
  readOnly?: boolean;
}) {
  const rows: number = Number(section.rows || 0);
  const cols: number = Number(section.cols || 0);
  const cells: Record<string, any> = section.cells || {};

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse min-w-[700px]">
        <tbody>
          {Array.from({ length: rows }, (_, ri) => (
            <tr key={`r-${ri}`} className="hover:bg-blue-50/20">
              {Array.from({ length: cols }, (_, ci) => {
                const key = `${ri}-${ci}`;
                const cell = cells[key];

                if (!cell) {
                  return (
                    <td
                      key={key}
                      className="border border-gray-300 px-3 py-3 min-w-[120px] h-12"
                    />
                  );
                }

                const isHeader = ri === 0;
                let content: React.ReactNode = cell.content ?? "";
                let extraClass = isHeader ? "bg-amber-50 font-semibold text-base" : "";

                if (cell.type === "bound" && cell.dataElement) {
                  const code = String(cell.dataElement);
                  const isRemark = code.startsWith("remark.");
                  content = (
                    <CellInput
                      code={code}
                      isRemark={isRemark}
                      numberValue={(values[code] as number | null) ?? null}
                      textValue={String(values[code] ?? "")}
                      onChange={onChange}
                      readOnly={readOnly}
                    />
                  );
                  extraClass = "bg-blue-50/30";
                } else if (cell.type === "formula" && cell.formula) {
                  const computed = evalFormula(String(cell.formula), values);
                  content = (
                    <div className="flex items-center gap-2 text-purple-700 text-lg font-semibold">
                      <Calculator className="h-5 w-5" />
                      <span className="font-mono font-semibold">
                        {computed !== null ? computed : "—"}
                      </span>
                    </div>
                  );
                  extraClass = "bg-purple-50/30";
                } else if (typeof cell.content === "string" && cell.content.trim() !== "") {
                  content = <span className="text-lg font-semibold">{cell.content}</span>;
                }

                return (
                  <td
                    key={key}
                    className={cn(
                      "border border-gray-300 px-3 py-3 min-w-[120px]",
                      cell.bold && "font-semibold",
                      cell.alignment === "center" && "text-center",
                      cell.alignment === "right" && "text-right",
                      cell.alignment === "left" && "text-left",
                      extraClass
                    )}
                  >
                    {content}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** ---------- main ---------- */
export default function LayoutEntryForm({
  layout,
  values,
  onChange,
  readOnly,
}: Props) {
  const sections = Array.isArray(layout?.sections) ? layout.sections : [];
  if (!sections.length) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-6 text-center">
        <p className="text-gray-500">
          No layout sections found. Please check the layout configuration.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
      {sections.map((section: any, sIdx: number) => {
        if (section.type === "heading") {
          return (
            <div
              key={section.id || `heading-${sIdx}`}
              className={cn(
                "px-4 py-3 font-semibold border-b bg-gradient-to-r from-blue-50 to-blue-100",
                section.level === 1 && "text-lg",
                section.level === 2 && "text-base",
                (!section.level || section.level === 3) && "text-sm"
              )}
            >
              {section.text}
            </div>
          );
        }

        if (section.type === "text") {
          return (
            <div
              key={section.id || `text-${sIdx}`}
              className="px-4 py-3 text-sm text-gray-700 border-b bg-gray-50"
            >
              {section.content}
            </div>
          );
        }

        if (section.type === "table") {
          // Branch based on shape
          const isGridShape =
            typeof section.rows === "number" && typeof section.cols === "number";
          const isTableArrayShape =
            Array.isArray(section.rows) || Array.isArray(section.header?.rows);

          return (
            <div key={section.id || `table-${sIdx}`}>
              {isTableArrayShape ? (
                <TableArray
                  section={section}
                  values={values}
                  onChange={onChange}
                  readOnly={readOnly}
                />
              ) : isGridShape ? (
                <GridTable
                  section={section}
                  values={values}
                  onChange={onChange}
                  readOnly={readOnly}
                />
              ) : (
                <div className="p-4 text-sm text-gray-600">
                  Unsupported table schema. Please re-save this layout in the
                  designer to normalize it.
                </div>
              )}
            </div>
          );
        }

        return <React.Fragment key={`unknown-${sIdx}`} />;
      })}

      <div className="px-4 py-3 border-t bg-gray-50 flex items-center gap-6 text-xs text-gray-600">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-blue-50 border border-blue-200 rounded" />
          <span>Data Entry</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-purple-50 border border-purple-200 rounded" />
          <span>Calculated</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-amber-50 border border-amber-200 rounded" />
          <span>Header</span>
        </div>
      </div>
    </div>
  );
}
