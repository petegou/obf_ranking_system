'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter, useSearchParams } from 'next/navigation';
import { AgGridReact } from 'ag-grid-react';
import { Check, Columns3, RotateCcw, Search, Star, Trash2, X } from 'lucide-react';
import type {
  ColDef,
  ColGroupDef,
  GridReadyEvent,
  SelectionChangedEvent,
  ValueFormatterParams,
} from 'ag-grid-community';
import {
  AllCommunityModule,
  ModuleRegistry,
  themeQuartz,
} from 'ag-grid-community';
import { scoreColorVar } from '@/lib/score-color';
import { useIsDarkMode } from '@/lib/use-color-scheme';
import {
  formatCurrencyMetric,
  formatNumberMetric,
  formatPercentMetric,
  formatPriceMetric,
  formatReturnPercentMetric,
} from '@/lib/metric-format';

ModuleRegistry.registerModules([AllCommunityModule]);

const gridThemeLight = themeQuartz.withParams({
  backgroundColor: '#ffffff',
  foregroundColor: '#0a0a0a',
  borderColor: '#ececec',
  chromeBackgroundColor: '#fafafa',
  headerBackgroundColor: '#fafafa',
  headerTextColor: '#525252',
  rowHoverColor: '#f5f5f5',
  selectedRowBackgroundColor: 'rgba(13, 31, 51, 0.04)',
  accentColor: '#0d1f33',
  fontSize: 13,
  fontFamily: 'inherit',
});

const gridThemeDark = themeQuartz.withParams({
  backgroundColor: '#141414',
  foregroundColor: '#fafafa',
  borderColor: '#262626',
  chromeBackgroundColor: '#0a0a0a',
  headerBackgroundColor: '#0a0a0a',
  headerTextColor: '#a3a3a3',
  rowHoverColor: '#1f1f1f',
  selectedRowBackgroundColor: 'rgba(74, 143, 212, 0.08)',
  accentColor: '#4a8fd4',
  fontSize: 13,
  fontFamily: 'inherit',
});

export interface RankingRow {
  rank: number;
  ticker: string;
  name: string;
  totalGpaScore: number;
  riskScore: number;
  returnScore: number;
  marketCapScore: number;
  turnoverScore: number;
  betaScore: number;
  rSquaredScore: number;
  upCaptureScore: number;
  downCaptureScore: number;
  sharpeScore: number;
  trackingErrorScore: number;
  sortinoScore: number;
  treynorScore: number;
  infoRatioScore: number;
  kurtosisScore: number;
  drawdownScore: number;
  skewnessScore: number;
  alphaScore: number;
  yieldScore: number;
  relativeReturnScore: number;
  priceScore: number;
  feeScore: number;
  aum: number | null;
  turnover: number | null;
  lastPrice: number | null;
  expenseRatio: number | null;
  yieldPct: number | null;
  pe: number | null;
  pb: number | null;
  minInitialInvestment: number | null;
  alpha3yr: number | null;
  alpha5yr: number | null;
  returnQtd: number | null;
  returnYtd: number | null;
  return1yr: number | null;
  return3yr: number | null;
  return5yr: number | null;
  return10yr: number | null;
  benchmarkReturn1yr: number | null;
  benchmarkReturn3yr: number | null;
  benchmarkReturn5yr: number | null;
  benchmarkReturn10yr: number | null;
  battingAvg3yr: number | null;
  battingAvg5yr: number | null;
  beta3yr: number | null;
  beta5yr: number | null;
  rSquared3yr: number | null;
  rSquared5yr: number | null;
  upCapture3yr: number | null;
  upCapture5yr: number | null;
  downCapture3yr: number | null;
  downCapture5yr: number | null;
  sharpe3yr: number | null;
  sharpe5yr: number | null;
  trackingError3yr: number | null;
  trackingError5yr: number | null;
  sortino3yr: number | null;
  sortino5yr: number | null;
  treynor3yr: number | null;
  treynor5yr: number | null;
  infoRatio3yr: number | null;
  infoRatio5yr: number | null;
  kurtosis3yr: number | null;
  kurtosis5yr: number | null;
  drawdown3yr: number | null;
  drawdown5yr: number | null;
  skewness3yr: number | null;
  skewness5yr: number | null;
  stdDev3yr: number | null;
  stdDev5yr: number | null;
  downsideDev3yr: number | null;
  downsideDev5yr: number | null;
}

type RankingNumberField = {
  [K in keyof RankingRow]: RankingRow[K] extends number | null ? K : never;
}[keyof RankingRow];
type RankingField = keyof RankingRow & string;
type ColumnId = string;
type ColumnChoice = {
  columnId: ColumnId;
  field: RankingField;
  label: string;
};
type ColumnChoiceGroup = {
  group: string;
  columns: ColumnChoice[];
};
type ColumnPreset = {
  id: string;
  name: string;
  schemaVersion: number;
  visibleColumnIds: ColumnId[];
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
};

const COLUMN_CHOOSER_GROUPS: ColumnChoiceGroup[] = [
  {
    group: 'Core',
    columns: [
      { columnId: 'core.rank', field: 'rank', label: '#' },
      { columnId: 'core.ticker', field: 'ticker', label: 'Ticker' },
      { columnId: 'core.name', field: 'name', label: 'Name' },
    ],
  },
  {
    group: 'Scores',
    columns: [
      { columnId: 'score.total_gpa', field: 'totalGpaScore', label: 'GPA' },
      { columnId: 'score.risk', field: 'riskScore', label: 'Risk' },
      { columnId: 'score.return', field: 'returnScore', label: 'Return' },
      { columnId: 'score.market_cap', field: 'marketCapScore', label: 'Mkt Cap' },
      { columnId: 'score.turnover', field: 'turnoverScore', label: 'Turnover' },
    ],
  },
  {
    group: 'Risk Score Components',
    columns: [
      { columnId: 'risk_score.beta', field: 'betaScore', label: 'Beta' },
      { columnId: 'risk_score.r_squared', field: 'rSquaredScore', label: 'R-Squared' },
      { columnId: 'risk_score.up_capture', field: 'upCaptureScore', label: 'Up Capture' },
      { columnId: 'risk_score.down_capture', field: 'downCaptureScore', label: 'Down Capture' },
      { columnId: 'risk_score.sharpe', field: 'sharpeScore', label: 'Sharpe' },
      { columnId: 'risk_score.tracking_error', field: 'trackingErrorScore', label: 'Tracking Err' },
      { columnId: 'risk_score.sortino', field: 'sortinoScore', label: 'Sortino' },
      { columnId: 'risk_score.treynor', field: 'treynorScore', label: 'Treynor' },
      { columnId: 'risk_score.info_ratio', field: 'infoRatioScore', label: 'Info Ratio' },
      { columnId: 'risk_score.kurtosis', field: 'kurtosisScore', label: 'Kurtosis' },
      { columnId: 'risk_score.drawdown', field: 'drawdownScore', label: 'Drawdown' },
      { columnId: 'risk_score.skewness', field: 'skewnessScore', label: 'Skewness' },
    ],
  },
  {
    group: 'Return Score Components',
    columns: [
      { columnId: 'return_score.alpha', field: 'alphaScore', label: 'Alpha' },
      { columnId: 'return_score.yield', field: 'yieldScore', label: 'Yield' },
      { columnId: 'return_score.relative_return', field: 'relativeReturnScore', label: 'Relative Return' },
      { columnId: 'return_score.price', field: 'priceScore', label: 'Price' },
      { columnId: 'return_score.fee', field: 'feeScore', label: 'Fee' },
    ],
  },
  {
    group: 'Fund Profile',
    columns: [
      { columnId: 'profile.aum', field: 'aum', label: 'AUM' },
      { columnId: 'profile.turnover', field: 'turnover', label: 'Turnover' },
      { columnId: 'profile.last_price', field: 'lastPrice', label: 'Last Price' },
      { columnId: 'profile.expense_ratio', field: 'expenseRatio', label: 'Expense Ratio' },
      { columnId: 'profile.yield', field: 'yieldPct', label: 'Yield' },
      { columnId: 'profile.pe', field: 'pe', label: 'P/E' },
      { columnId: 'profile.pb', field: 'pb', label: 'P/B' },
      { columnId: 'profile.min_initial_investment', field: 'minInitialInvestment', label: 'Min Investment' },
    ],
  },
  {
    group: 'Return Metrics',
    columns: [
      { columnId: 'return.alpha_3yr', field: 'alpha3yr', label: 'Alpha 3Y' },
      { columnId: 'return.alpha_5yr', field: 'alpha5yr', label: 'Alpha 5Y' },
      { columnId: 'return.qtd', field: 'returnQtd', label: 'QTD Return' },
      { columnId: 'return.ytd', field: 'returnYtd', label: 'YTD Return' },
      { columnId: 'return.1yr', field: 'return1yr', label: '1Y Return' },
      { columnId: 'return.3yr', field: 'return3yr', label: '3Y Return' },
      { columnId: 'return.5yr', field: 'return5yr', label: '5Y Return' },
      { columnId: 'return.10yr', field: 'return10yr', label: '10Y Return' },
      { columnId: 'benchmark_return.1yr', field: 'benchmarkReturn1yr', label: 'Benchmark 1Y' },
      { columnId: 'benchmark_return.3yr', field: 'benchmarkReturn3yr', label: 'Benchmark 3Y' },
      { columnId: 'benchmark_return.5yr', field: 'benchmarkReturn5yr', label: 'Benchmark 5Y' },
      { columnId: 'benchmark_return.10yr', field: 'benchmarkReturn10yr', label: 'Benchmark 10Y' },
      { columnId: 'batting_avg.3yr', field: 'battingAvg3yr', label: 'Batting Avg 3Y' },
      { columnId: 'batting_avg.5yr', field: 'battingAvg5yr', label: 'Batting Avg 5Y' },
    ],
  },
  {
    group: 'Risk Metrics 3Y',
    columns: [
      { columnId: 'risk.beta_3yr', field: 'beta3yr', label: 'Beta' },
      { columnId: 'risk.r_squared_3yr', field: 'rSquared3yr', label: 'R-Squared' },
      { columnId: 'risk.up_capture_3yr', field: 'upCapture3yr', label: 'Up Capture' },
      { columnId: 'risk.down_capture_3yr', field: 'downCapture3yr', label: 'Down Capture' },
      { columnId: 'risk.sharpe_3yr', field: 'sharpe3yr', label: 'Sharpe' },
      { columnId: 'risk.tracking_error_3yr', field: 'trackingError3yr', label: 'Tracking Err' },
      { columnId: 'risk.sortino_3yr', field: 'sortino3yr', label: 'Sortino' },
      { columnId: 'risk.treynor_3yr', field: 'treynor3yr', label: 'Treynor' },
      { columnId: 'risk.info_ratio_3yr', field: 'infoRatio3yr', label: 'Info Ratio' },
      { columnId: 'risk.kurtosis_3yr', field: 'kurtosis3yr', label: 'Kurtosis' },
      { columnId: 'risk.drawdown_3yr', field: 'drawdown3yr', label: 'Drawdown' },
      { columnId: 'risk.skewness_3yr', field: 'skewness3yr', label: 'Skewness' },
      { columnId: 'risk.std_dev_3yr', field: 'stdDev3yr', label: 'Std Dev' },
      { columnId: 'risk.downside_dev_3yr', field: 'downsideDev3yr', label: 'Downside Dev' },
    ],
  },
  {
    group: 'Risk Metrics 5Y',
    columns: [
      { columnId: 'risk.beta_5yr', field: 'beta5yr', label: 'Beta' },
      { columnId: 'risk.r_squared_5yr', field: 'rSquared5yr', label: 'R-Squared' },
      { columnId: 'risk.up_capture_5yr', field: 'upCapture5yr', label: 'Up Capture' },
      { columnId: 'risk.down_capture_5yr', field: 'downCapture5yr', label: 'Down Capture' },
      { columnId: 'risk.sharpe_5yr', field: 'sharpe5yr', label: 'Sharpe' },
      { columnId: 'risk.tracking_error_5yr', field: 'trackingError5yr', label: 'Tracking Err' },
      { columnId: 'risk.sortino_5yr', field: 'sortino5yr', label: 'Sortino' },
      { columnId: 'risk.treynor_5yr', field: 'treynor5yr', label: 'Treynor' },
      { columnId: 'risk.info_ratio_5yr', field: 'infoRatio5yr', label: 'Info Ratio' },
      { columnId: 'risk.kurtosis_5yr', field: 'kurtosis5yr', label: 'Kurtosis' },
      { columnId: 'risk.drawdown_5yr', field: 'drawdown5yr', label: 'Drawdown' },
      { columnId: 'risk.skewness_5yr', field: 'skewness5yr', label: 'Skewness' },
      { columnId: 'risk.std_dev_5yr', field: 'stdDev5yr', label: 'Std Dev' },
      { columnId: 'risk.downside_dev_5yr', field: 'downsideDev5yr', label: 'Downside Dev' },
    ],
  },
];

const ALL_COLUMNS = COLUMN_CHOOSER_GROUPS.flatMap((group) => group.columns);
const ALL_COLUMN_IDS = ALL_COLUMNS.map((column) => column.columnId);
const FIELD_TO_COLUMN_ID = new Map<string, ColumnId>(
  ALL_COLUMNS.map((column) => [column.field, column.columnId] as const),
);
const CANONICAL_COLUMN_IDS = new Set(ALL_COLUMN_IDS);
const COLUMN_ID_ALIASES: Record<string, ColumnId> = {
  totalGpaScore: 'score.total_gpa',
  marketCapScore: 'score.market_cap',
  expenseRatio: 'profile.expense_ratio',
  minInitialInvestment: 'profile.min_initial_investment',
  stdDev3yr: 'risk.std_dev_3yr',
  stdDev5yr: 'risk.std_dev_5yr',
};

function normalizeColumnIds(columnIds: string[]): ColumnId[] {
  const next: ColumnId[] = [];
  const seen = new Set<ColumnId>();

  for (const columnId of columnIds) {
    const canonicalId =
      COLUMN_ID_ALIASES[columnId] ?? FIELD_TO_COLUMN_ID.get(columnId) ?? columnId;
    if (!CANONICAL_COLUMN_IDS.has(canonicalId) || seen.has(canonicalId)) {
      continue;
    }
    seen.add(canonicalId);
    next.push(canonicalId);
  }

  return next.length > 0 ? next : ALL_COLUMN_IDS;
}

function setsMatch(left: Set<ColumnId>, right: Set<ColumnId>) {
  return left.size === right.size && [...left].every((id) => right.has(id));
}

function scoreCellRenderer(
  params: ValueFormatterParams<RankingRow, number | null>,
) {
  const value = params.value;
  if (typeof value !== 'number') return '';
  return value.toFixed(1);
}

function metricCellRenderer(
  params: ValueFormatterParams<RankingRow, number | null>,
) {
  const value = params.value;
  if (typeof value !== 'number') return '';
  return formatNumberMetric(value);
}

function percentCellRenderer(
  params: ValueFormatterParams<RankingRow, number | null>,
) {
  const value = params.value;
  if (typeof value !== 'number') return '';
  return formatPercentMetric(value);
}

function returnPercentCellRenderer(
  params: ValueFormatterParams<RankingRow, number | null>,
) {
  const value = params.value;
  if (typeof value !== 'number') return '';
  return formatReturnPercentMetric(value);
}

function currencyCellRenderer(
  params: ValueFormatterParams<RankingRow, number | null>,
) {
  const value = params.value;
  if (typeof value !== 'number') return '';
  return formatCurrencyMetric(value);
}

function priceCellRenderer(
  params: ValueFormatterParams<RankingRow, number | null>,
) {
  const value = params.value;
  if (typeof value !== 'number') return '';
  return formatPriceMetric(value);
}

function ScoreCell({ value }: { value: number | null | undefined }) {
  if (typeof value !== 'number') return null;
  return (
    <span
      className="font-mono tabular-nums font-medium"
      style={{ color: scoreColorVar(value) }}>
      {value.toFixed(2)}
    </span>
  );
}

function scoreColumn(
  headerName: string,
  field: RankingNumberField,
  width = 110,
  hide = false,
): ColDef<RankingRow> {
  return {
    headerName,
    field,
    width,
    hide,
    valueFormatter: scoreCellRenderer,
    cellRenderer: (params: { value: number | null | undefined }) => (
      <ScoreCell value={params.value} />
    ),
    type: 'rightAligned',
  };
}

function metricColumn(
  headerName: string,
  field: RankingNumberField,
  formatter = metricCellRenderer,
  width = 120,
  hide = false,
): ColDef<RankingRow> {
  return {
    headerName,
    field,
    width,
    hide,
    valueFormatter: formatter,
    type: 'rightAligned',
    cellClass: 'font-mono tabular-nums',
  };
}

async function readPresetResponse(response: Response) {
  const body: unknown = await response.json();
  const error =
    typeof body === 'object' && body !== null
      ? Reflect.get(body, 'error')
      : null;
  if (!response.ok) {
    throw new Error(typeof error === 'string' ? error : 'Unable to save preset.');
  }
  return body;
}

async function fetchColumnPresets() {
  const response = await fetch('/api/category-column-presets');
  const body = await readPresetResponse(response);
  const presets =
    typeof body === 'object' && body !== null ? Reflect.get(body, 'presets') : [];
  return Array.isArray(presets) ? (presets as ColumnPreset[]) : [];
}

async function createColumnPreset({
  name,
  visibleColumnIds,
  isDefault = false,
}: {
  name: string;
  visibleColumnIds: ColumnId[];
  isDefault?: boolean;
}) {
  const response = await fetch('/api/category-column-presets', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, visibleColumnIds, isDefault }),
  });
  const body = await readPresetResponse(response);
  return Reflect.get(body as object, 'preset') as ColumnPreset;
}

async function updateColumnPreset(
  id: string,
  updates: {
    name?: string;
    visibleColumnIds?: ColumnId[];
    isDefault?: boolean;
  },
) {
  const response = await fetch(`/api/category-column-presets/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  const body = await readPresetResponse(response);
  return Reflect.get(body as object, 'preset') as ColumnPreset;
}

async function deleteColumnPreset(id: string) {
  const response = await fetch(`/api/category-column-presets/${id}`, {
    method: 'DELETE',
  });
  await readPresetResponse(response);
}

export function RankingsGrid({
  rows,
  category,
  columnControlsId,
}: {
  rows: RankingRow[];
  category: string;
  columnControlsId?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isDark = useIsDarkMode();
  const selectedTickers = searchParams.getAll('fund');
  const tickerKey = selectedTickers.join(',');

  const [api, setApi] = useState<GridReadyEvent<RankingRow>['api'] | null>(
    null,
  );
  const [isColumnChooserOpen, setIsColumnChooserOpen] = useState(false);
  const [visibleColumnIds, setVisibleColumnIds] = useState<Set<ColumnId>>(
    () => new Set(ALL_COLUMN_IDS),
  );
  const [draftVisibleColumnIds, setDraftVisibleColumnIds] = useState<
    Set<ColumnId>
  >(() => new Set(ALL_COLUMN_IDS));
  const [presets, setPresets] = useState<ColumnPreset[]>([]);
  const [selectedPresetId, setSelectedPresetId] = useState<string>('');
  const [presetName, setPresetName] = useState('');
  const [columnSearchQuery, setColumnSearchQuery] = useState('');
  const [presetError, setPresetError] = useState<string | null>(null);
  const [isLoadingPresets, setIsLoadingPresets] = useState(true);
  const [isSavingPreset, setIsSavingPreset] = useState(false);
  const [columnControlsTarget, setColumnControlsTarget] =
    useState<HTMLElement | null>(null);
  const [activeColumnGroup, setActiveColumnGroup] = useState(
    COLUMN_CHOOSER_GROUPS[0]?.group ?? '',
  );
  const isSyncing = useRef(false);
  const replaceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const selectedPreset =
    presets.find((preset) => preset.id === selectedPresetId) ?? null;

  useEffect(() => {
    if (!columnControlsId) return;
    setColumnControlsTarget(document.getElementById(columnControlsId));
  }, [columnControlsId]);

  const filteredColumnGroups = useMemo(() => {
    const query = columnSearchQuery.trim().toLowerCase();
    if (!query) return COLUMN_CHOOSER_GROUPS;

    return COLUMN_CHOOSER_GROUPS.map((group) => {
      const groupMatches = group.group.toLowerCase().includes(query);
      const columns = groupMatches
        ? group.columns
        : group.columns.filter((column) =>
            [
              column.label,
              column.field,
              column.columnId,
              group.group,
            ].some((value) => value.toLowerCase().includes(query)),
          );

      return columns.length > 0 ? { ...group, columns } : null;
    }).filter((group): group is ColumnChoiceGroup => group !== null);
  }, [columnSearchQuery]);
  const filteredColumnCount = filteredColumnGroups.reduce(
    (count, group) => count + group.columns.length,
    0,
  );
  const activeColumnGroupData =
    COLUMN_CHOOSER_GROUPS.find((group) => group.group === activeColumnGroup) ??
    COLUMN_CHOOSER_GROUPS[0];
  const visibleColumnGroups = columnSearchQuery.trim()
    ? filteredColumnGroups
    : activeColumnGroupData
      ? [activeColumnGroupData]
      : [];
  const totalDraftSelectedCount = ALL_COLUMNS.filter((column) =>
    draftVisibleColumnIds.has(column.columnId),
  ).length;

  const columns = useMemo<
    (ColDef<RankingRow> | ColGroupDef<RankingRow>)[]
  >(() => {
    const isHidden = (field: RankingField) => {
      const columnId = FIELD_TO_COLUMN_ID.get(field);
      return columnId ? !visibleColumnIds.has(columnId) : false;
    };

    return [
      {
        headerName: '#',
        field: 'rank',
        width: 70,
        pinned: 'left',
        cellClass: 'font-mono tabular-nums',
        hide: isHidden('rank'),
      },
      {
        headerName: 'Ticker',
        field: 'ticker',
        width: 100,
        cellClass: 'font-mono font-medium',
        hide: isHidden('ticker'),
        pinned: 'left',
        lockPinned: true,
      },
      {
        headerName: 'Name',
        field: 'name',
        width: 260,
        minWidth: 220,
        hide: isHidden('name'),
        pinned: 'left',
        lockPinned: true,
      },
      {
        headerName: 'Scores',
        children: [
          scoreColumn('GPA', 'totalGpaScore', 90, isHidden('totalGpaScore')),
          scoreColumn('Risk', 'riskScore', 90, isHidden('riskScore')),
          scoreColumn('Return', 'returnScore', 90, isHidden('returnScore')),
          scoreColumn(
            'Mkt Cap',
            'marketCapScore',
            100,
            isHidden('marketCapScore'),
          ),
          scoreColumn(
            'Turnover',
            'turnoverScore',
            100,
            isHidden('turnoverScore'),
          ),
        ],
      },
      {
        headerName: 'Risk Score Components',
        children: [
          scoreColumn('Beta', 'betaScore', 110, isHidden('betaScore')),
          scoreColumn(
            'R-Squared',
            'rSquaredScore',
            110,
            isHidden('rSquaredScore'),
          ),
          scoreColumn(
            'Up Capture',
            'upCaptureScore',
            110,
            isHidden('upCaptureScore'),
          ),
          scoreColumn(
            'Down Capture',
            'downCaptureScore',
            110,
            isHidden('downCaptureScore'),
          ),
          scoreColumn('Sharpe', 'sharpeScore', 110, isHidden('sharpeScore')),
          scoreColumn(
            'Tracking Err',
            'trackingErrorScore',
            120,
            isHidden('trackingErrorScore'),
          ),
          scoreColumn('Sortino', 'sortinoScore', 110, isHidden('sortinoScore')),
          scoreColumn('Treynor', 'treynorScore', 110, isHidden('treynorScore')),
          scoreColumn(
            'Info Ratio',
            'infoRatioScore',
            110,
            isHidden('infoRatioScore'),
          ),
          scoreColumn(
            'Kurtosis',
            'kurtosisScore',
            110,
            isHidden('kurtosisScore'),
          ),
          scoreColumn(
            'Drawdown',
            'drawdownScore',
            110,
            isHidden('drawdownScore'),
          ),
          scoreColumn(
            'Skewness',
            'skewnessScore',
            110,
            isHidden('skewnessScore'),
          ),
        ],
      },
      {
        headerName: 'Return Score Components',
        children: [
          scoreColumn('Alpha', 'alphaScore', 110, isHidden('alphaScore')),
          scoreColumn('Yield', 'yieldScore', 110, isHidden('yieldScore')),
          scoreColumn(
            'Relative Return',
            'relativeReturnScore',
            135,
            isHidden('relativeReturnScore'),
          ),
          scoreColumn('Price', 'priceScore', 110, isHidden('priceScore')),
          scoreColumn('Fee', 'feeScore', 110, isHidden('feeScore')),
        ],
      },
      {
        headerName: 'Fund Profile',
        children: [
          metricColumn(
            'AUM',
            'aum',
            currencyCellRenderer,
            120,
            isHidden('aum'),
          ),
          metricColumn(
            'Turnover',
            'turnover',
            percentCellRenderer,
            120,
            isHidden('turnover'),
          ),
          metricColumn(
            'Last Price',
            'lastPrice',
            priceCellRenderer,
            110,
            isHidden('lastPrice'),
          ),
          metricColumn(
            'Expense Ratio',
            'expenseRatio',
            percentCellRenderer,
            130,
            isHidden('expenseRatio'),
          ),
          metricColumn(
            'Yield',
            'yieldPct',
            percentCellRenderer,
            120,
            isHidden('yieldPct'),
          ),
          metricColumn('P/E', 'pe', metricCellRenderer, 120, isHidden('pe')),
          metricColumn('P/B', 'pb', metricCellRenderer, 120, isHidden('pb')),
          metricColumn(
            'Min Investment',
            'minInitialInvestment',
            currencyCellRenderer,
            135,
            isHidden('minInitialInvestment'),
          ),
        ],
      },
      {
        headerName: 'Return Metrics',
        children: [
          metricColumn(
            'Alpha 3Y',
            'alpha3yr',
            metricCellRenderer,
            120,
            isHidden('alpha3yr'),
          ),
          metricColumn(
            'Alpha 5Y',
            'alpha5yr',
            metricCellRenderer,
            120,
            isHidden('alpha5yr'),
          ),
          metricColumn(
            'QTD Return',
            'returnQtd',
            returnPercentCellRenderer,
            120,
            isHidden('returnQtd'),
          ),
          metricColumn(
            'YTD Return',
            'returnYtd',
            returnPercentCellRenderer,
            120,
            isHidden('returnYtd'),
          ),
          metricColumn(
            '1Y Return',
            'return1yr',
            returnPercentCellRenderer,
            120,
            isHidden('return1yr'),
          ),
          metricColumn(
            '3Y Return',
            'return3yr',
            returnPercentCellRenderer,
            120,
            isHidden('return3yr'),
          ),
          metricColumn(
            '5Y Return',
            'return5yr',
            returnPercentCellRenderer,
            120,
            isHidden('return5yr'),
          ),
          metricColumn(
            '10Y Return',
            'return10yr',
            returnPercentCellRenderer,
            120,
            isHidden('return10yr'),
          ),
          metricColumn(
            'Benchmark 1Y',
            'benchmarkReturn1yr',
            returnPercentCellRenderer,
            130,
            isHidden('benchmarkReturn1yr'),
          ),
          metricColumn(
            'Benchmark 3Y',
            'benchmarkReturn3yr',
            returnPercentCellRenderer,
            130,
            isHidden('benchmarkReturn3yr'),
          ),
          metricColumn(
            'Benchmark 5Y',
            'benchmarkReturn5yr',
            returnPercentCellRenderer,
            130,
            isHidden('benchmarkReturn5yr'),
          ),
          metricColumn(
            'Benchmark 10Y',
            'benchmarkReturn10yr',
            returnPercentCellRenderer,
            135,
            isHidden('benchmarkReturn10yr'),
          ),
          metricColumn(
            'Batting Avg 3Y',
            'battingAvg3yr',
            percentCellRenderer,
            135,
            isHidden('battingAvg3yr'),
          ),
          metricColumn(
            'Batting Avg 5Y',
            'battingAvg5yr',
            percentCellRenderer,
            135,
            isHidden('battingAvg5yr'),
          ),
        ],
      },
      {
        headerName: 'Risk Metrics 3Y',
        children: [
          metricColumn(
            'Beta',
            'beta3yr',
            metricCellRenderer,
            120,
            isHidden('beta3yr'),
          ),
          metricColumn(
            'R-Squared',
            'rSquared3yr',
            metricCellRenderer,
            120,
            isHidden('rSquared3yr'),
          ),
          metricColumn(
            'Up Capture',
            'upCapture3yr',
            percentCellRenderer,
            120,
            isHidden('upCapture3yr'),
          ),
          metricColumn(
            'Down Capture',
            'downCapture3yr',
            percentCellRenderer,
            130,
            isHidden('downCapture3yr'),
          ),
          metricColumn(
            'Sharpe',
            'sharpe3yr',
            metricCellRenderer,
            120,
            isHidden('sharpe3yr'),
          ),
          metricColumn(
            'Tracking Err',
            'trackingError3yr',
            metricCellRenderer,
            120,
            isHidden('trackingError3yr'),
          ),
          metricColumn(
            'Sortino',
            'sortino3yr',
            metricCellRenderer,
            120,
            isHidden('sortino3yr'),
          ),
          metricColumn(
            'Treynor',
            'treynor3yr',
            metricCellRenderer,
            120,
            isHidden('treynor3yr'),
          ),
          metricColumn(
            'Info Ratio',
            'infoRatio3yr',
            metricCellRenderer,
            120,
            isHidden('infoRatio3yr'),
          ),
          metricColumn(
            'Kurtosis',
            'kurtosis3yr',
            metricCellRenderer,
            120,
            isHidden('kurtosis3yr'),
          ),
          metricColumn(
            'Drawdown',
            'drawdown3yr',
            percentCellRenderer,
            120,
            isHidden('drawdown3yr'),
          ),
          metricColumn(
            'Skewness',
            'skewness3yr',
            metricCellRenderer,
            120,
            isHidden('skewness3yr'),
          ),
          metricColumn(
            'Std Dev',
            'stdDev3yr',
            percentCellRenderer,
            120,
            isHidden('stdDev3yr'),
          ),
          metricColumn(
            'Downside Dev',
            'downsideDev3yr',
            percentCellRenderer,
            130,
            isHidden('downsideDev3yr'),
          ),
        ],
      },
      {
        headerName: 'Risk Metrics 5Y',
        children: [
          metricColumn(
            'Beta',
            'beta5yr',
            metricCellRenderer,
            120,
            isHidden('beta5yr'),
          ),
          metricColumn(
            'R-Squared',
            'rSquared5yr',
            metricCellRenderer,
            120,
            isHidden('rSquared5yr'),
          ),
          metricColumn(
            'Up Capture',
            'upCapture5yr',
            percentCellRenderer,
            120,
            isHidden('upCapture5yr'),
          ),
          metricColumn(
            'Down Capture',
            'downCapture5yr',
            percentCellRenderer,
            130,
            isHidden('downCapture5yr'),
          ),
          metricColumn(
            'Sharpe',
            'sharpe5yr',
            metricCellRenderer,
            120,
            isHidden('sharpe5yr'),
          ),
          metricColumn(
            'Tracking Err',
            'trackingError5yr',
            metricCellRenderer,
            120,
            isHidden('trackingError5yr'),
          ),
          metricColumn(
            'Sortino',
            'sortino5yr',
            metricCellRenderer,
            120,
            isHidden('sortino5yr'),
          ),
          metricColumn(
            'Treynor',
            'treynor5yr',
            metricCellRenderer,
            120,
            isHidden('treynor5yr'),
          ),
          metricColumn(
            'Info Ratio',
            'infoRatio5yr',
            metricCellRenderer,
            120,
            isHidden('infoRatio5yr'),
          ),
          metricColumn(
            'Kurtosis',
            'kurtosis5yr',
            metricCellRenderer,
            120,
            isHidden('kurtosis5yr'),
          ),
          metricColumn(
            'Drawdown',
            'drawdown5yr',
            percentCellRenderer,
            120,
            isHidden('drawdown5yr'),
          ),
          metricColumn(
            'Skewness',
            'skewness5yr',
            metricCellRenderer,
            120,
            isHidden('skewness5yr'),
          ),
          metricColumn(
            'Std Dev',
            'stdDev5yr',
            percentCellRenderer,
            120,
            isHidden('stdDev5yr'),
          ),
          metricColumn(
            'Downside Dev',
            'downsideDev5yr',
            percentCellRenderer,
            130,
            isHidden('downsideDev5yr'),
          ),
        ],
      },
    ];
  }, [visibleColumnIds]);

  useEffect(() => {
    let isMounted = true;

    async function loadPresets() {
      setIsLoadingPresets(true);
      setPresetError(null);
      try {
        const nextPresets = await fetchColumnPresets();
        if (!isMounted) return;
        setPresets(nextPresets);

        const defaultPreset =
          nextPresets.find((preset) => preset.isDefault) ?? null;
        if (defaultPreset) {
          const normalized = normalizeColumnIds(defaultPreset.visibleColumnIds);
          setVisibleColumnIds(new Set(normalized));
          setDraftVisibleColumnIds(new Set(normalized));
          setSelectedPresetId(defaultPreset.id);
          setPresetName(defaultPreset.name);
        } else {
          setVisibleColumnIds(new Set(ALL_COLUMN_IDS));
          setDraftVisibleColumnIds(new Set(ALL_COLUMN_IDS));
          setSelectedPresetId('');
          setPresetName('');
        }
      } catch (error) {
        if (!isMounted) return;
        setPresetError(
          error instanceof Error ? error.message : 'Unable to load presets.',
        );
      } finally {
        if (isMounted) setIsLoadingPresets(false);
      }
    }

    void loadPresets();

    return () => {
      isMounted = false;
    };
  }, []);

  // Sync grid selection state from URL on mount and when URL changes
  useEffect(() => {
    if (!api) return;
    const tickers = tickerKey ? tickerKey.split(',') : [];
    isSyncing.current = true;
    api.forEachNode((node) => {
      node.setSelected(tickers.includes(node.data?.ticker ?? ''), false, 'api');
    });
    isSyncing.current = false;
    const firstTicker = tickers[0];
    if (firstTicker) {
      const node = api.getRowNode(firstTicker);
      if (node) api.ensureNodeVisible(node, 'middle');
    }
  }, [api, tickerKey]);

  useEffect(() => {
    return () => {
      if (replaceTimer.current) clearTimeout(replaceTimer.current);
    };
  }, []);

  function onSelectionChanged(event: SelectionChangedEvent<RankingRow>) {
    if (isSyncing.current) return;
    const next = event.api.getSelectedRows().map((row) => row.ticker);

    const params = new URLSearchParams(searchParams.toString());
    params.delete('fund');
    next.forEach((t) => params.append('fund', t));
    const nextQuery = params.toString();
    if (nextQuery === searchParams.toString()) return;

    if (replaceTimer.current) clearTimeout(replaceTimer.current);
    replaceTimer.current = setTimeout(() => {
      const path = `/categories/${encodeURIComponent(category)}`;
      router.replace(nextQuery ? `${path}?${nextQuery}` : path, {
        scroll: false,
      });
    }, 120);
  }

  function openColumnChooser() {
    setDraftVisibleColumnIds(new Set(visibleColumnIds));
    setColumnSearchQuery('');
    setPresetError(null);
    setIsColumnChooserOpen(true);
  }

  function toggleDraftColumn(columnId: ColumnId) {
    setDraftVisibleColumnIds((current) => {
      const next = new Set(current);
      if (next.has(columnId)) {
        next.delete(columnId);
      } else {
        next.add(columnId);
      }
      return next;
    });
  }

  function selectDraftGroup(group: ColumnChoiceGroup) {
    setDraftVisibleColumnIds((current) => {
      const next = new Set(current);
      group.columns.forEach((column) => next.add(column.columnId));
      return next;
    });
  }

  function deselectDraftGroup(group: ColumnChoiceGroup) {
    setDraftVisibleColumnIds((current) => {
      const next = new Set(current);
      group.columns.forEach((column) => next.delete(column.columnId));
      return next;
    });
  }

  function applyColumnChoices() {
    if (draftVisibleColumnIds.size === 0) {
      setPresetError('Select at least one column.');
      return;
    }
    if (!setsMatch(draftVisibleColumnIds, visibleColumnIds)) {
      setVisibleColumnIds(new Set(draftVisibleColumnIds));
    }
    setIsColumnChooserOpen(false);
  }

  function resetColumnChoices() {
    const next = new Set(ALL_COLUMN_IDS);
    setDraftVisibleColumnIds(next);
    setVisibleColumnIds(new Set(next));
    setSelectedPresetId('');
    setPresetName('');
    setPresetError(null);
  }

  function selectPreset(presetId: string) {
    setSelectedPresetId(presetId);
    setPresetError(null);
    const preset = presets.find((item) => item.id === presetId);
    if (!preset) {
      setPresetName('');
      return;
    }
    setPresetName(preset.name);
    setDraftVisibleColumnIds(new Set(normalizeColumnIds(preset.visibleColumnIds)));
  }

  function updatePresetInState(nextPreset: ColumnPreset) {
    setPresets((current) =>
      current
        .map((preset) =>
          preset.id === nextPreset.id
            ? nextPreset
            : nextPreset.isDefault
              ? { ...preset, isDefault: false }
              : preset,
        )
        .sort((left, right) => {
          if (left.isDefault !== right.isDefault) return left.isDefault ? -1 : 1;
          return left.name.localeCompare(right.name);
        }),
    );
  }

  async function savePresetAsNew() {
    const name = presetName.trim();
    if (!name) {
      setPresetError('Enter a preset name.');
      return;
    }
    if (draftVisibleColumnIds.size === 0) {
      setPresetError('Select at least one column.');
      return;
    }

    setIsSavingPreset(true);
    setPresetError(null);
    try {
      const preset = await createColumnPreset({
        name,
        visibleColumnIds: [...draftVisibleColumnIds],
        isDefault: presets.length === 0,
      });
      setPresets((current) =>
        [
          ...current.map((item) =>
            preset.isDefault ? { ...item, isDefault: false } : item,
          ),
          preset,
        ].sort((left, right) => {
          if (left.isDefault !== right.isDefault) return left.isDefault ? -1 : 1;
          return left.name.localeCompare(right.name);
        }),
      );
      setSelectedPresetId(preset.id);
      setPresetName(preset.name);
    } catch (error) {
      setPresetError(
        error instanceof Error ? error.message : 'Unable to save preset.',
      );
    } finally {
      setIsSavingPreset(false);
    }
  }

  async function updateSelectedPresetColumns() {
    if (!selectedPreset) return;
    if (draftVisibleColumnIds.size === 0) {
      setPresetError('Select at least one column.');
      return;
    }

    setIsSavingPreset(true);
    setPresetError(null);
    try {
      const preset = await updateColumnPreset(selectedPreset.id, {
        visibleColumnIds: [...draftVisibleColumnIds],
      });
      updatePresetInState(preset);
    } catch (error) {
      setPresetError(
        error instanceof Error ? error.message : 'Unable to update preset.',
      );
    } finally {
      setIsSavingPreset(false);
    }
  }

  async function renameSelectedPreset() {
    if (!selectedPreset) return;
    const name = presetName.trim();
    if (!name) {
      setPresetError('Enter a preset name.');
      return;
    }

    setIsSavingPreset(true);
    setPresetError(null);
    try {
      const preset = await updateColumnPreset(selectedPreset.id, { name });
      updatePresetInState(preset);
      setPresetName(preset.name);
    } catch (error) {
      setPresetError(
        error instanceof Error ? error.message : 'Unable to rename preset.',
      );
    } finally {
      setIsSavingPreset(false);
    }
  }

  async function makeSelectedPresetDefault() {
    if (!selectedPreset) return;

    setIsSavingPreset(true);
    setPresetError(null);
    try {
      const preset = await updateColumnPreset(selectedPreset.id, {
        isDefault: true,
      });
      updatePresetInState(preset);
    } catch (error) {
      setPresetError(
        error instanceof Error ? error.message : 'Unable to set default preset.',
      );
    } finally {
      setIsSavingPreset(false);
    }
  }

  async function removeSelectedPreset() {
    if (!selectedPreset) return;
    const confirmed = window.confirm(`Delete "${selectedPreset.name}"?`);
    if (!confirmed) return;

    setIsSavingPreset(true);
    setPresetError(null);
    try {
      await deleteColumnPreset(selectedPreset.id);
      setPresets((current) =>
        current.filter((preset) => preset.id !== selectedPreset.id),
      );
      if (selectedPreset.isDefault) {
        resetColumnChoices();
      } else {
        setSelectedPresetId('');
        setPresetName('');
      }
    } catch (error) {
      setPresetError(
        error instanceof Error ? error.message : 'Unable to delete preset.',
      );
    } finally {
      setIsSavingPreset(false);
    }
  }

  const columnChooserControl = (
    <>
      <div>
        <button
          type="button"
          onClick={openColumnChooser}
          className="inline-flex h-8 items-center gap-2 rounded border border-[var(--border-subtle)] bg-[var(--surface-card)] px-3 text-xs font-medium text-[var(--text-primary)] shadow-sm hover:bg-[var(--surface-muted)]">
          <Columns3 className="h-4 w-4" aria-hidden="true" />
          Columns
        </button>
      </div>

      {isColumnChooserOpen ? (
        <div className="absolute right-0 top-10 z-30 w-[460px] max-w-[calc(100vw-2rem)] overflow-hidden rounded border border-[var(--border-subtle)] bg-[var(--surface-card)] shadow-xl">
          <div className="flex h-11 items-center justify-between border-b border-[var(--border-subtle)] px-3">
            <div className="text-sm font-semibold tracking-tight">Columns</div>
            <button
              type="button"
              onClick={() => setIsColumnChooserOpen(false)}
              className="grid h-7 w-7 place-items-center rounded text-[var(--text-secondary)] hover:bg-[var(--surface-muted)]"
              aria-label="Close columns menu">
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
          <div className="border-b border-[var(--border-subtle)] p-3">
            <div className="mb-2 flex items-center gap-2">
              <select
                value={selectedPresetId}
                onChange={(event) => selectPreset(event.target.value)}
                disabled={isLoadingPresets || isSavingPreset}
                className="h-8 min-w-0 flex-1 rounded border border-[var(--border-default)] bg-[var(--surface-card)] px-2 text-xs text-[var(--text-primary)]">
                <option value="">
                  {isLoadingPresets ? 'Loading presets...' : 'Unsaved columns'}
                </option>
                {presets.map((preset) => (
                  <option key={preset.id} value={preset.id}>
                    {preset.isDefault ? '★ ' : ''}
                    {preset.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={makeSelectedPresetDefault}
                disabled={!selectedPreset || selectedPreset.isDefault || isSavingPreset}
                className="grid h-8 w-8 place-items-center rounded border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:bg-[var(--surface-muted)] disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Set selected preset as default">
                <Star className="h-4 w-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={removeSelectedPreset}
                disabled={!selectedPreset || isSavingPreset}
                className="grid h-8 w-8 place-items-center rounded border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:bg-[var(--surface-muted)] disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Delete selected preset">
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={presetName}
                onChange={(event) => setPresetName(event.target.value)}
                placeholder="Preset name"
                disabled={isSavingPreset}
                className="h-8 min-w-0 flex-1 rounded border border-[var(--border-default)] bg-[var(--surface-card)] px-2 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]"
              />
              <button
                type="button"
                onClick={savePresetAsNew}
                disabled={isSavingPreset}
                className="inline-flex h-8 items-center rounded bg-[var(--brand-primary)] px-2.5 text-xs font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50">
                Save as
              </button>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <button
                type="button"
                onClick={updateSelectedPresetColumns}
                disabled={!selectedPreset || isSavingPreset}
                className="inline-flex h-7 items-center rounded px-2 text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-muted)] disabled:cursor-not-allowed disabled:opacity-40">
                Update preset
              </button>
              <button
                type="button"
                onClick={renameSelectedPreset}
                disabled={!selectedPreset || isSavingPreset}
                className="inline-flex h-7 items-center rounded px-2 text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-muted)] disabled:cursor-not-allowed disabled:opacity-40">
                Rename
              </button>
              {selectedPreset?.isDefault ? (
                <span className="ml-auto text-[11px] font-medium text-[var(--brand-primary)]">
                  Default
                </span>
              ) : null}
            </div>
            {presetError ? (
              <div className="mt-2 text-xs text-[var(--score-weak)]">
                {presetError}
              </div>
            ) : null}
          </div>
          <div className="border-b border-[var(--border-subtle)] p-3">
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-tertiary)]"
                aria-hidden="true"
              />
              <input
                type="search"
                value={columnSearchQuery}
                onChange={(event) => setColumnSearchQuery(event.target.value)}
                placeholder="Search columns..."
                className="h-8 w-full rounded border border-[var(--border-default)] bg-[var(--surface-card)] pl-8 pr-8 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]"
              />
              {columnSearchQuery ? (
                <button
                  type="button"
                  onClick={() => setColumnSearchQuery('')}
                  className="absolute right-1 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded text-[var(--text-tertiary)] hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)]"
                  aria-label="Clear column search">
                  <X className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              ) : null}
            </div>
            <div className="mt-1.5 text-[11px] text-[var(--text-tertiary)]">
              {columnSearchQuery
                ? `${filteredColumnCount} matching column${
                    filteredColumnCount === 1 ? '' : 's'
                  }`
                : `${totalDraftSelectedCount} of ${ALL_COLUMNS.length} columns selected`}
            </div>
          </div>
          {!columnSearchQuery.trim() ? (
            <div className="border-b border-[var(--border-subtle)] px-3 py-2">
              <div className="column-group-tabs scrollbar-hide flex gap-1 overflow-x-auto pb-1">
                {COLUMN_CHOOSER_GROUPS.map((group) => {
                  const selectedCount = group.columns.filter((column) =>
                    draftVisibleColumnIds.has(column.columnId),
                  ).length;
                  const isActive = group.group === activeColumnGroup;

                  return (
                    <button
                      key={group.group}
                      type="button"
                      onClick={() => setActiveColumnGroup(group.group)}
                      className={`flex h-8 shrink-0 items-center gap-1.5 rounded px-2.5 text-xs font-medium ${
                        isActive
                          ? 'bg-[var(--brand-primary)] text-white'
                          : 'text-[var(--text-secondary)] hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)]'
                      }`}>
                      <span>{group.group}</span>
                      <span
                        className={`rounded px-1.5 py-0.5 font-mono text-[10px] ${
                          isActive
                            ? 'bg-white/20 text-white'
                            : 'bg-[var(--surface-muted)] text-[var(--text-tertiary)]'
                        }`}>
                        {selectedCount}/{group.columns.length}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}
          <div className="max-h-[420px] overflow-y-auto p-3">
            {visibleColumnGroups.map((group) => {
              const groupSelectedCount = group.columns.filter((column) =>
                draftVisibleColumnIds.has(column.columnId),
              ).length;

              return (
              <fieldset key={group.group} className="mb-4 last:mb-0">
                <legend className="mb-3 flex w-full items-center gap-2 text-xs font-semibold uppercase text-[var(--text-tertiary)]">
                  <span className="min-w-0 flex-1 truncate">
                    {group.group}
                    <span className="ml-2 font-mono text-[10px] font-medium normal-case text-[var(--text-secondary)]">
                      {groupSelectedCount}/{group.columns.length}
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={() => selectDraftGroup(group)}
                    className="rounded px-1.5 py-0.5 text-[10px] font-medium normal-case text-[var(--text-secondary)] hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)]">
                    Select all
                  </button>
                  <button
                    type="button"
                    onClick={() => deselectDraftGroup(group)}
                    className="rounded px-1.5 py-0.5 text-[10px] font-medium normal-case text-[var(--text-secondary)] hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)]">
                    Deselect all
                  </button>
                </legend>
                <div className="grid grid-cols-2 gap-1.5">
                  {group.columns.map((column) => (
                    <label
                      key={column.columnId}
                      className="flex min-h-8 items-center gap-2 rounded px-2 text-xs text-[var(--text-primary)] hover:bg-[var(--surface-muted)]">
                      <input
                        type="checkbox"
                        checked={draftVisibleColumnIds.has(column.columnId)}
                        onChange={() => toggleDraftColumn(column.columnId)}
                        className="h-4 w-4 accent-[var(--brand-primary)]"
                      />
                      <span className="truncate">{column.label}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
            );
            })}
            {visibleColumnGroups.length === 0 ? (
              <div className="py-8 text-center text-sm text-[var(--text-tertiary)]">
                No columns match your search.
              </div>
            ) : null}
          </div>
          <div className="flex h-12 items-center justify-between border-t border-[var(--border-subtle)] px-3">
            <button
              type="button"
              onClick={resetColumnChoices}
              className="inline-flex h-8 items-center gap-2 rounded px-2 text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-muted)]">
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              Reset
            </button>
            <button
              type="button"
              onClick={applyColumnChoices}
              className="inline-flex h-8 items-center gap-2 rounded bg-[var(--brand-primary)] px-3 text-xs font-semibold text-white hover:opacity-90">
              <Check className="h-4 w-4" aria-hidden="true" />
              Apply
            </button>
          </div>
        </div>
      ) : null}
    </>
  );

  return (
    <div className="relative h-full">
      {columnControlsTarget ? (
        createPortal(columnChooserControl, columnControlsTarget)
      ) : (
        <div className="absolute right-3 top-3 z-20">
          {columnChooserControl}
        </div>
      )}
      <div className="h-full">
        <AgGridReact<RankingRow>
          theme={isDark ? gridThemeDark : gridThemeLight}
          rowData={rows}
          columnDefs={columns}
          defaultColDef={{
            sortable: true,
            resizable: true,
          }}
          rowSelection={{
            mode: 'multiRow',
            enableClickSelection: true,
            enableSelectionWithoutKeys: true,
            checkboxes: true,
            headerCheckbox: true,
            selectAll: 'currentPage',
          }}
          pagination
          paginationPageSize={25}
          paginationPageSizeSelector={false}
          selectionColumnDef={{
            pinned: 'left',
            lockPinned: true,
            width: 48,
          }}
          getRowId={(params) => params.data.ticker}
          onGridReady={(event) => setApi(event.api)}
          onSelectionChanged={onSelectionChanged}
          suppressCellFocus
          animateRows
          rowHeight={32}
          headerHeight={32}
        />
      </div>
    </div>
  );
}
