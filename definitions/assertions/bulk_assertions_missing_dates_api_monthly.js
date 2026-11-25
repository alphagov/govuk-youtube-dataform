const {apiDtCutOffDate} = require('includes/constants');

// Monthly API tables only hold data before the Data Transfer cutover. The listed months were never
// loaded, so they're accepted as known gaps and the check only fails if a new one appears.
const apiTables = [
  {
    table: "raw_demographic_information",
    knownGaps: ["2025-01-01", "2025-02-01", "2025-05-01", "2025-06-01", "2025-08-01"]
  },
  {
    table: "raw_engagement_and_content_location",
    knownGaps: ["2025-03-01", "2025-04-01", "2025-09-01", "2025-10-01", "2025-11-01"]
  }
];

apiTables.forEach(({table, knownGaps}) => {
  assert(`${table}_api_date_spine_check`)
    .description(`Fails if any month between 2025-01-01 and ${apiDtCutOffDate} is missing from ${table}, other than known gaps`)
    .query(ctx => `
      WITH date_spine AS (
        SELECT month
        FROM UNNEST(GENERATE_DATE_ARRAY(
          DATE('2025-01-01'),
          DATE_SUB(DATE('${apiDtCutOffDate}'), INTERVAL 1 MONTH),
          INTERVAL 1 MONTH
        )) AS month
        WHERE month NOT IN (${knownGaps.map(gap => `DATE('${gap}')`).join(', ')})
      ),
      dates_in_table AS (
        SELECT DISTINCT month
        FROM ${ctx.ref(table)}
      )
      SELECT spine.month AS missing_date
      FROM date_spine AS spine
      LEFT JOIN dates_in_table AS actual ON spine.month = actual.month
      WHERE actual.month IS NULL
    `);
});
