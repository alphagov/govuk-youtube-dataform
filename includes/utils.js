// aliasName defaults to metricRowCondition, for the common case where the raw
// metric/action value already matches the desired output column name. String
// conditions are quoted automatically; numeric conditions (e.g. a
// rank_in_breakdown slot number) are left unquoted.
const maxIfConditionValueNotNull = (metricColumnName, metricRowCondition, valueColumn, aliasName = metricRowCondition) => {
  const conditionLiteral = typeof metricRowCondition === 'number' ? metricRowCondition : `'${metricRowCondition}'`;
  return `MAX(IF(${metricColumnName} = ${conditionLiteral}, ${valueColumn}, NULL)) AS ${aliasName}`;
};

// Change in a cumulative lifetime metric since the entity's previous snapshot.
// Snapshot cadence is irregular (Threads pulls have been 1-5 days apart), so this
// is "change since the last pull", not strictly per-day, always check against
// daysSincePreviousSnapshot() so consumers can see the window each value covers.
// NULL on an entity's first snapshot, and legitimately negative when a lifetime
// counter goes down (unlikes, deletions), so it must not be clamped to zero.
const lifetimeDailyChange = (column, partitionColumns, dateColumn = 'date') =>
  `${column} - LAG(${column}) OVER (PARTITION BY ${partitionColumns.join(', ')} ORDER BY ${dateColumn}) AS ${column}_daily_change`;

// Gap in days between this snapshot and the entity's previous one. NULL on the
// first snapshot. Where an entity drops out of a snapshot entirely (e.g. a city
// falling out of the top-N follower demographics), LAG skips the missing dates so
// this correctly widens rather than reporting a bogus one-day change.
const daysSincePreviousSnapshot = (partitionColumns, dateColumn = 'date') =>
  `DATE_DIFF(${dateColumn}, LAG(${dateColumn}) OVER (PARTITION BY ${partitionColumns.join(', ')} ORDER BY ${dateColumn}), DAY) AS days_since_previous_snapshot`;

// Row-level sibling of maxIfConditionValueNotNull: splits a tall discriminator/value
// pair into one typed column per discriminator value without collapsing the grain,
// so exactly one of the emitted columns is populated on each row. Use this rather
// than maxIfConditionValueNotNull wherever the tall rows must survive the pivot.
// Mostly used for Non aggregates, compared to maxIfConditionaValueNotNull which is for aggregates

const ifConditionValue = (conditionColumn, conditionValue, valueColumn, aliasName) =>
  `IF(${conditionColumn} = '${conditionValue}', ${valueColumn}, NULL) AS ${aliasName}`;

// Reads a retention curve at an arbitrary interval offset, for sources that report
// retention in variable-width bins rather than per second (see
// stg_facebook_video_reel_retention). Call once with self() to bind everything to the
// dataset the model is being built into:

const retentionInterpolation = (selfTarget) => {
  // The UDF lives beside the model, so its address is the model's own address with the
  // table name swapped for the function name. self() returns `project.dataset.table`;
  // the regex strips both backticks so the path can be split, and the first two parts
  // are re-wrapped (the project id contains hyphens, so it must stay quoted).
  const [database, schema] = selfTarget.replace(/`/g, '').split('.');
  const udfName = `\`${database}.${schema}.InterpolateRetention\``;

  // The interpolation algorithm itself, held in its own const so createUdf below stays
  // short enough to read as an interface. Converts a target second into a fractional bin
  // position and linearly interpolates between the two bins either side of it.
  // bin_no arrives as FLOAT64, not INT64, deliberately: BigQuery passes an INT64 held
  // *inside a STRUCT or ARRAY* to JavaScript as a string, so with INT64 the `===`
  // comparisons below never match and the function returns NULL for every row.
  // JS is used instead of python due to the much higher computational overheads for python
  const INTERPOLATE_RETENTION_JS = `
  // No video length (so no bin size), or no curve to read: nothing to interpolate
  if (!bin_size || !retention_data || retention_data.length === 0) return null;

  var exact_bin = target_sec / bin_size;
  var lower_bin = Math.floor(exact_bin);
  var upper_bin = lower_bin + 1;

  var lower_val = null;
  var upper_val = null;
  for (var i = 0; i < retention_data.length; i++) {
    var row = retention_data[i];
    if (row.bin_no === lower_bin) lower_val = row.retention_pct;
    if (row.bin_no === upper_bin) upper_val = row.retention_pct;
  }

  // Lower bound missing means the target second is off the end of the curve
  if (lower_val === null) return null;
  // Upper bound missing means the target second sits in the final bin, so flatline
  if (upper_val === null) upper_val = lower_val;

  return lower_val + ((exact_bin - lower_bin) * (upper_val - lower_val));
`;

  return {
    // DDL for a pre_operations block.
    // This must be a PERSISTENT function, not CREATE TEMP FUNCTION. Dataform runs
    // pre_operations as a separate BigQuery job from the table build, and materialises
    // the table by submitting a plain SELECT with a destination table set on the job
    // config — which BigQuery only allows for a single statement, so the definition
    // cannot be prefixed to that query either. A temp function is scoped to the job that
    // created it and is therefore already gone by the time the query needs it
    // ("Function not found: InterpolateRetention"); a persistent function outlives the
    // job. CREATE OR REPLACE keeps re-running the model idempotent.
    createUdf: () => `
CREATE OR REPLACE FUNCTION ${udfName}(
  target_sec INT64,
  bin_size FLOAT64,
  retention_data ARRAY<STRUCT<bin_no FLOAT64, retention_pct FLOAT64>>
)
RETURNS FLOAT64
LANGUAGE js AS r"""${INTERPOLATE_RETENTION_JS}"""`,

    // One interpolated retention column at a fixed second offset. Expects `length`,
    // `bin_size_seconds` and `retention_data` in scope. NULL where the offset is past
    // the end of the video, and where length is unknown (bin_size_seconds NULL, caught
    // by the UDF's own guard).
    at: (targetSecond, aliasName) =>
      `CASE WHEN length < ${targetSecond} THEN NULL
        ELSE ${udfName}(${targetSecond}, bin_size_seconds, retention_data)
   END AS ${aliasName}`
  };
};

module.exports = {
  maxIfConditionValueNotNull,
  lifetimeDailyChange,
  daysSincePreviousSnapshot,
  ifConditionValue,
  retentionInterpolation
};