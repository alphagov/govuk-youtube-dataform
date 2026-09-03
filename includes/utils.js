// aliasName defaults to metricRowCondition, for the common case where the raw
// metric/action value already matches the desired output column name. String
// conditions are quoted automatically; numeric conditions (e.g. a "second"
// offset column) are left unquoted.
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

module.exports = {
  maxIfConditionValueNotNull,
  lifetimeDailyChange,
  daysSincePreviousSnapshot,
  ifConditionValue
};