const tablesToCheck = [
"raw_demographic_information", 
"raw_engagement_and_content_location",
"raw_operating_system_and_device",
"raw_p_channel_basic_a3_govuk_tb",
"raw_p_channel_combined_a3_govuk_tb",
"raw_p_channel_demographics_a1_govuk_tb",
"raw_p_channel_device_os_a3_govuk_tb", 
"raw_p_channel_playback_location_a3_govuk_tb",
"raw_p_channel_reach_combined_a1_govuk_tb",
"raw_p_channel_sharing_service_a1_govuk_tb",
"raw_p_channel_traffic_source_a3_govuk_tb",
"raw_playback_details",
"raw_playback_location",
"raw_traffic_sources",
"raw_user_activity",
"raw_video_id_metadata_mapping"
]

tablesToCheck.forEach(tableName => {
  assert(`assert_not_empty_${tableName}`)
    .description(`Check that ${tableName} is not empty`)
    .query(ctx => `
      SELECT
        "Table is empty" AS error
      FROM (
        SELECT COUNT(*) AS row_count FROM ${ctx.ref(tableName)}
      )
      WHERE row_count = 0
    `);
});

