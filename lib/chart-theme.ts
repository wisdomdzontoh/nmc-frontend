/**
 * Chart colours and axis styling, all read from the design tokens in globals.css,
 * so charts match the rest of the app. Recharts accepts CSS variables in fill/stroke.
 */
export const CHART_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
]

export const chartColor = (index: number) => CHART_COLORS[index % CHART_COLORS.length]

export const CHART_GRID = "hsl(var(--border))"
export const CHART_AXIS = "hsl(var(--border))"
export const CHART_TICK = { fontSize: 11, fill: "hsl(var(--muted-foreground))" }

export const CHART_TOOLTIP_STYLE = {
  borderRadius: 8,
  border: "1px solid hsl(var(--border))",
  background: "hsl(var(--popover))",
  color: "hsl(var(--popover-foreground))",
  fontSize: 12,
  boxShadow: "0 4px 12px hsl(222 30% 12% / 0.08)",
}
