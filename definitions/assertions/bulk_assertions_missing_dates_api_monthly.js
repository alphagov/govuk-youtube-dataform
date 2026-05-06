const apiTables = [
  "raw_demographic_information", // monthly, uses month instead of date
  "raw_engagement_and_content_location" // monthly, uses month instead of date
];

apiTables.forEach(tableName => {
  assert(`${tableName}_api_date_spine_check`)
    .description(`Fails if any date between 2025-01-01 and 2026-02-01 are missing from ${tableName}`)
    .query(ctx => `
      WITH date_spine AS (
        SELECT month
       FROM Unnest(generate_date_array('2025-01-01', current_date(), interval 1 month)) AS month
      ),
      dates_in_table AS (
        SELECT DISTINCT  month
        FROM ${ctx.ref(tableName)}
      )
      SELECT spine.month AS missing_date
      FROM date_spine AS spine
      LEFT JOIN dates_in_table AS actual ON spine.month = actual.month
      WHERE actual.month IS NULL
    `);
});