/**
 * Chart preparation utilities preserved from the legacy dashboard.
 */
export type LineChartInputDatum = unknown;
export type LineChartAccessor = (entry: LineChartInputDatum, index: number) => unknown;
export type LineChartFormatter = (value: number, entry: LineChartInputDatum, index: number) => string;
export interface LineChartTooltipPayload {
    point: LineChartComputedPoint;
    xFormatted: string;
    yFormatted: string;
    data: LineChartInputDatum;
    index: number;
}
export type LineChartTooltipRenderer = (payload: LineChartTooltipPayload) => string;
export interface ChartMargin {
    top: number;
    right: number;
    bottom: number;
    left: number;
}
interface ChartDimensions {
    width: number;
    height: number;
    margin: ChartMargin;
}
export interface LineChartOptions {
    series?: readonly LineChartInputDatum[];
    width?: number;
    height?: number;
    margin?: Partial<ChartMargin>;
    xAccessor?: LineChartAccessor;
    yAccessor?: LineChartAccessor;
    xFormatter?: LineChartFormatter;
    yFormatter?: LineChartFormatter;
    tooltipRenderer?: LineChartTooltipRenderer;
    markers?: LineChartMarker[];
    markerTooltipRenderer?: LineChartMarkerTooltipRenderer;
    color?: string;
    areaColor?: string;
    baseline?: LineChartBaselineOptions | null;
}
export interface LineChartBaselineOptions {
    value: number | null | undefined;
    color?: string;
    dashArray?: string;
    includeInDomain?: boolean;
}
interface LineChartRange {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
    boundedWidth: number;
    boundedHeight: number;
}
export interface LineChartComputedPoint {
    index: number;
    data: LineChartInputDatum;
    xValue: number;
    yValue: number;
    x: number;
    y: number;
}
interface LineChartInternalState extends ChartDimensions {
    svg: SVGSVGElement | null;
    areaPath: SVGPathElement | null;
    linePath: SVGPathElement | null;
    baselineLine: SVGLineElement | null;
    focusLine: SVGLineElement | null;
    focusCircle: SVGCircleElement | null;
    overlay: SVGRectElement | null;
    tooltip: HTMLDivElement | null;
    markerOverlay: HTMLDivElement | null;
    markerLayer: SVGGElement | null;
    markerTooltip: HTMLDivElement | null;
    xAxis?: HTMLDivElement;
    yAxis?: HTMLDivElement;
    series: LineChartInputDatum[];
    points: LineChartComputedPoint[];
    range: LineChartRange | null;
    xAccessor: LineChartAccessor;
    yAccessor: LineChartAccessor;
    xFormatter: LineChartFormatter;
    yFormatter: LineChartFormatter;
    tooltipRenderer: LineChartTooltipRenderer;
    markerTooltipRenderer: LineChartMarkerTooltipRenderer;
    color: string;
    areaColor: string;
    baseline: LineChartBaselineOptions | null;
    handlersAttached: boolean;
    handlePointerMove?: (event: PointerEvent) => void;
    handlePointerLeave?: (event: PointerEvent) => void;
    markers: LineChartMarker[];
    markerPositions: MarkerRenderEntry[];
}
export interface LineChartMarker {
    id: string;
    x: number;
    y: number;
    color?: string;
    label?: string;
    payload?: unknown;
}
export interface LineChartMarkerTooltipPayload {
    marker: LineChartMarker;
    xFormatted: string;
    yFormatted: string;
}
export type LineChartMarkerTooltipRenderer = (payload: LineChartMarkerTooltipPayload) => string;
interface LineChartContainerElement extends HTMLDivElement {
    __chartState?: LineChartInternalState;
}
interface MarkerRenderEntry {
    marker: LineChartMarker;
    x: number;
    y: number;
}
export declare function renderLineChart(root: HTMLElement, options?: LineChartOptions): LineChartContainerElement | null;
export declare function updateLineChart(container: LineChartContainerElement | null, options?: LineChartOptions): void;
export {};
//# sourceMappingURL=charting.d.ts.map