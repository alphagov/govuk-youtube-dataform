// Fails if a recent day is missing from the YouTube Data Transfer tables. Only the last two weeks
// are checked, so a gap is flagged while it can still be backfilled and then drops off. The sparse
// reports (demographics, sharing service) are left out because YouTube publishes them empty on quiet days.
const lagDays = 3;
const windowDays = 14;

const pChannelTables = [
  "raw_p_channel_basic_a3_govuk_tb",
  "raw_p_channel_combined_a3_govuk_tb",
  "raw_p_channel_device_os_a3_govuk_tb",
  "raw_p_channel_playback_location_a3_govuk_tb",
  "raw_p_channel_reach_combined_a1_govuk_tb",
  "raw_p_channel_traffic_source_a3_govuk_tb",
];

pChannelTables.forEach(tableName => {
  assert(`${tableName}_date_spine_check`)
    .description(`Fails if any of the last ${windowDays} expected days are missing from ${tableName}`)
    .query(ctx => `
      WITH date_spine AS (
        SELECT date
        FROM UNNEST(GENERATE_DATE_ARRAY(
          DATE_SUB(CURRENT_DATE(), INTERVAL ${lagDays + windowDays - 1} DAY),
          DATE_SUB(CURRENT_DATE(), INTERVAL ${lagDays} DAY)
        )) AS date
      ),
      dates_in_table AS (
        SELECT DISTINCT date
        FROM ${ctx.ref(tableName)}
        WHERE date >= DATE_SUB(CURRENT_DATE(), INTERVAL ${lagDays + windowDays - 1} DAY)
      )
      SELECT spine.date AS missing_date
      FROM date_spine AS spine
      LEFT JOIN dates_in_table AS actual ON spine.date = actual.date
      WHERE actual.date IS NULL
    `);
});
