export type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; errors: string[] };

export type ScoringConfigPayload = {
  blend_weight_3yr: number;
  blend_weight_5yr: number;
  short_record_penalty: number;
  gpa_risk_weight: number;
  gpa_return_weight: number;
  market_cap_divisor: number;
  turnover_threshold: number;
  turnover_divisor: number;
  risk_weights: Record<string, number>;
  return_weights: Record<string, number>;
  relative_return_weights: Record<string, number>;
};

const SIMPLE_CONFIG_RULES = {
  blend_weight_3yr: { min: 0, max: 1 },
  blend_weight_5yr: { min: 0, max: 1 },
  short_record_penalty: { min: 0, max: 1 },
  gpa_risk_weight: { min: 0, max: 10 },
  gpa_return_weight: { min: 0, max: 10 },
  market_cap_divisor: { min: 1, max: 1_000_000_000 },
  turnover_threshold: { min: 0, max: 10_000 },
  turnover_divisor: { min: -10_000, max: 10_000 },
} as const;

const RISK_WEIGHT_KEYS = [
  "beta",
  "r_squared",
  "up_capture",
  "down_capture",
  "sharpe",
  "tracking_error",
  "sortino",
  "treynor",
  "info_ratio",
  "kurtosis",
  "drawdown",
  "skewness",
] as const;

const RETURN_WEIGHT_KEYS = [
  "alpha",
  "yield",
  "relative_return",
  "price",
  "fee",
] as const;

const RELATIVE_RETURN_WEIGHT_KEYS = [
  "return_3yr",
  "return_5yr",
  "return_1yr",
  "return_ytd",
  "return_qtd",
  "return_10yr",
  "batting_avg_3yr",
  "batting_avg_5yr",
] as const;

const CONFIG_OBJECT_KEYS = {
  risk_weights: RISK_WEIGHT_KEYS,
  return_weights: RETURN_WEIGHT_KEYS,
  relative_return_weights: RELATIVE_RETURN_WEIGHT_KEYS,
} as const;

const CONFIG_KEYS = new Set([
  ...Object.keys(SIMPLE_CONFIG_RULES),
  ...Object.keys(CONFIG_OBJECT_KEYS),
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function validateNumber(
  value: unknown,
  key: string,
  min: number,
  max: number,
  errors: string[],
) {
  if (!validNumber(value)) {
    errors.push(`${key} must be a finite number.`);
    return null;
  }
  if (value < min || value > max) {
    errors.push(`${key} must be between ${min} and ${max}.`);
    return null;
  }
  return value;
}

function validateWeightMap(
  value: unknown,
  key: keyof typeof CONFIG_OBJECT_KEYS,
  errors: string[],
) {
  if (!isRecord(value)) {
    errors.push(`${key} must be an object of numeric weights.`);
    return null;
  }

  const allowedKeys = new Set<string>(CONFIG_OBJECT_KEYS[key]);
  const unknownKeys = Object.keys(value).filter((item) => !allowedKeys.has(item));
  if (unknownKeys.length > 0) {
    errors.push(`${key} contains unsupported keys: ${unknownKeys.join(", ")}.`);
  }

  const weights: Record<string, number> = {};
  for (const weightKey of CONFIG_OBJECT_KEYS[key]) {
    const weight = validateNumber(value[weightKey], `${key}.${weightKey}`, 0, 3, errors);
    if (weight !== null) weights[weightKey] = weight;
  }
  return weights;
}

export function validateScoringConfigPayload(
  body: unknown,
): ValidationResult<ScoringConfigPayload> {
  const errors: string[] = [];

  if (!isRecord(body)) {
    return { ok: false, errors: ["Request body must be a JSON object."] };
  }

  const unknownKeys = Object.keys(body).filter((key) => !CONFIG_KEYS.has(key));
  if (unknownKeys.length > 0) {
    errors.push(`Unsupported config keys: ${unknownKeys.join(", ")}.`);
  }

  const config = {} as ScoringConfigPayload;
  for (const [key, rule] of Object.entries(SIMPLE_CONFIG_RULES)) {
    const value = validateNumber(body[key], key, rule.min, rule.max, errors);
    if (value !== null) {
      config[key as keyof typeof SIMPLE_CONFIG_RULES] = value;
    }
  }

  const riskWeights = validateWeightMap(body.risk_weights, "risk_weights", errors);
  if (riskWeights) config.risk_weights = riskWeights;

  const returnWeights = validateWeightMap(body.return_weights, "return_weights", errors);
  if (returnWeights) config.return_weights = returnWeights;

  const relativeReturnWeights = validateWeightMap(
    body.relative_return_weights,
    "relative_return_weights",
    errors,
  );
  if (relativeReturnWeights) {
    config.relative_return_weights = relativeReturnWeights;
  }

  const blendTotal = config.blend_weight_3yr + config.blend_weight_5yr;
  if (Number.isFinite(blendTotal) && blendTotal <= 0) {
    errors.push("At least one blend weight must be greater than 0.");
  }

  const gpaTotal = config.gpa_risk_weight + config.gpa_return_weight;
  if (Number.isFinite(gpaTotal) && gpaTotal <= 0) {
    errors.push("At least one GPA weight must be greater than 0.");
  }

  if (config.turnover_divisor === 0) {
    errors.push("turnover_divisor cannot be 0.");
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return { ok: true, value: config };
}

export function parseJsonError(error: unknown) {
  return error instanceof SyntaxError
    ? "Request body must be valid JSON."
    : "Unable to read request body.";
}

export function validateIsoDate(value: unknown, fieldName: string) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return `${fieldName} is required (format: YYYY-MM-DD).`;
  }

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  const isValid =
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day;

  return isValid ? null : `${fieldName} must be a valid calendar date.`;
}

export const MAX_UPLOAD_FILES = 10;
export const MAX_UPLOAD_FILE_BYTES = 25 * 1024 * 1024;

const ACCEPTED_UPLOAD_EXTENSIONS = [".xlsx", ".csv"] as const;

export function validateCsvUploadFiles(files: File[]) {
  const errors: string[] = [];

  if (files.length === 0) {
    errors.push("No files provided.");
  }

  if (files.length > MAX_UPLOAD_FILES) {
    errors.push(`Upload at most ${MAX_UPLOAD_FILES} files at a time.`);
  }

  for (const file of files) {
    const name = file.name.toLowerCase();
    const ok = ACCEPTED_UPLOAD_EXTENSIONS.some((ext) => name.endsWith(ext));
    if (!ok) {
      errors.push(`${file.name}: only .xlsx or .csv files are accepted.`);
    }
    if (file.size === 0) {
      errors.push(`${file.name}: file is empty.`);
    }
    if (file.size > MAX_UPLOAD_FILE_BYTES) {
      errors.push(`${file.name}: file exceeds the 25 MB limit.`);
    }
  }

  return errors;
}
