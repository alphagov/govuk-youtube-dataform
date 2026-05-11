const pChannelTables = [
  "raw_p_channel_basic_a3_govuk_tb",
  "raw_p_channel_combined_a3_govuk_tb",
  "raw_p_channel_demographics_a1_govuk_tb",
  "raw_p_channel_device_os_a3_govuk_tb",
  "raw_p_channel_playback_location_a3_govuk_tb",
  "raw_p_channel_reach_combined_a1_govuk_tb",
  "raw_p_channel_sharing_service_a1_govuk_tb",
  "raw_p_channel_traffic_source_a3_govuk_tb",
];

pChannelTables.forEach(tableName => {
  assert(`${tableName}_date_spine_check`)
    .description(`Fails if any date between 2026-02-01 and two days ago is missing from ${tableName}`)
    .query(ctx => `
      WITH date_spine AS (
        SELECT date
        FROM UNNEST(GENERATE_DATE_ARRAY(
          DATE('2026-02-01'),
          DATE_SUB(CURRENT_DATE(), INTERVAL 2 DAY)
        )) AS date
      ),
      dates_in_table AS (
        SELECT DISTINCT date
        FROM ${ctx.ref(tableName)}
      )
      SELECT spine.date AS missing_date
      FROM date_spine AS spine
      LEFT JOIN dates_in_table AS actual ON spine.date = actual.date
      WHERE actual.date IS NULL
    `);
});