const {targetAlwaysNullChecks, stagingAlwaysNullChecks} = require('includes/constants');

// Fails if any listed column is 100% NULL across every row in the recent window
// (catches columns that have silently gone dead, e.g. tgt_facebook_videos_combined.title).
// A real bounded date filter already satisfies requirePartitionFilter on target
// tables, so no tautological guard is needed here.
function alwaysNullAssertion(check) {
  const {table, dateColumn, windowInterval, columns} = check;
  assert(`${table}_always_null_check`)
    .description(`Fails if any column in ${table} is 100% NULL across all rows in the last ${windowInterval.toLowerCase()}`)
    .query(ctx => `
      WITH counts AS (
        SELECT
          COUNT(*) AS total_rows,
          ${columns.map(c => `COUNT(${c}) AS ${c}`).join(',\n          ')}
        FROM ${ctx.ref(table)}
        WHERE ${dateColumn} >= DATE_SUB(CURRENT_DATE(), ${windowInterval})
      )
      SELECT column_name, 
      non_null_count as valid_row_count,
      total_rows
      FROM counts
      UNPIVOT(non_null_count FOR column_name IN (${columns.join(', ')}))
      WHERE total_rows > 0 AND non_null_count = 0
    `);
}

[...targetAlwaysNullChecks, ...stagingAlwaysNullChecks].forEach(alwaysNullAssertion);
