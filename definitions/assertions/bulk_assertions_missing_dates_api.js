const apiTables = [
  //"raw_demographic_information", // monthly, uses month instead of date
  //"raw_engagement_and_content_location", // monthly, uses month instead of date
  "raw_operating_system_and_device",
  "raw_playback_details",
  "raw_playback_location",
  "raw_traffic_sources",
  "raw_user_activity"
];

apiTables.forEach(tableName => {
  assert(`${tableName}_api_date_spine_check`)
    .description(`Fails if any date between 2025-01-01 and 2026-01-01 are missing from ${tableName}`)
    .query(ctx => `
      WITH date_spine AS (
        SELECT date
        FROM UNNEST(GENERATE_DATE_ARRAY(
          DATE('2025-01-01'),
          DATE('2026-01-01')
        )) AS date
      ),
      dates_in_table AS (
        SELECT DISTINCT  date
        FROM ${ctx.ref(tableName)}
      )
      SELECT spine.date AS missing_date
      FROM date_spine AS spine
      LEFT JOIN dates_in_table AS actual ON spine.date = actual.date
      WHERE actual.date IS NULL
    `);
});