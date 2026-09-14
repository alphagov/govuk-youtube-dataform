const apiDtCutOffDate = '2026-03-01';

// Threads follower demographics arrive tall, one row per breakdown/dimension_value.
// Each API breakdown is surfaced as its own typed column in stg_threads_follower_demographics,
// and adding an entry here is the only change needed to give a new breakdown a column.
// tgt_threads_follower_demographics_pivoted_breakdown_check reads that staging table and fails
// if the API starts returning a breakdown that is not listed, so a new one cannot be silently
// dropped by the pivot.
// city and country are deliberately left as one row per value rather than one column per value:
// they only return the top ~45 per pull and that set churns, so a column per value would mean
// the table's schema changing whenever a city enters or leaves the top 45.
const threadsDemographicBreakdowns = [
  {breakdown: "age",     column: "age_group"},
  {breakdown: "gender",  column: "gender"},
  {breakdown: "country", column: "country_code"},
  {breakdown: "city",    column: "city"}
];

// Drives the reporting-shaped tgt_threads_follower_demographics_pivoted, one row per
// (date, threads_user_id) with every demographic flattened into columns.
// The age and gender vocabularies are closed sets that appear in full on every snapshot, and
// tgt_threads_follower_demographics_pivoted gives each value its own column. Listing them here is
// what lets tgt_threads_follower_demographics_pivoted_vocabulary_check fail when the API returns an
// age band or gender code that has no column, rather than letting it vanish silently into the pivot.
// The vocabulary check is the only consumer: the model itself spells its columns out longhand.
const threadsDemographicPivot = {
  fixed: [
    {breakdown: "age", column: "age_group", prefix: "age", values: [
      {value: "13-17", suffix: "13_17"},
      {value: "18-24", suffix: "18_24"},
      {value: "25-34", suffix: "25_34"},
      {value: "35-44", suffix: "35_44"},
      {value: "45-54", suffix: "45_54"},
      {value: "55-64", suffix: "55_64"},
      {value: "65+",   suffix: "65_plus"}
    ]},
    {breakdown: "gender", column: "gender", prefix: "gender", values: [
      {value: "F", suffix: "f"},
      {value: "M", suffix: "m"},
      {value: "U", suffix: "u"}
    ]}
  ]
};

// Columns checked for "100% NULL across all rows in the window" per target table,
// i.e. every column from that model's config.columns except keys/discriminators
// (surrogate ids, date/month, video_id/page_id/post_id/channel_id, associated_post_id,
// data_source) which can't legitimately be null.
const targetAlwaysNullChecks = [
  {
    table: "tgt_channel_combined",
    dateColumn: "date",
    windowInterval: "INTERVAL 14 DAY",
    columns: ["live_or_on_demand", "subscribed_status", "playback_location",
      "traffic_source", "device_type", "operating_system", "views", "engaged_views",
      "watch_time_minutes", "average_view_duration_seconds",
      "average_view_duration_percentage", "red_views", "red_watch_time_minutes"]
  },
  {
    table: "tgt_facebook_page_combined",
    dateColumn: "date",
    windowInterval: "INTERVAL 14 DAY",
    columns: ["name", "fan_count", "followers_count", "talking_about_count",
      "page_daily_follows_unique", "page_daily_unfollows_unique", "page_follows",
      "page_media_view", "page_post_engagements", "page_total_media_view_unique",
      "page_views_total"]
  },
  {
    table: "tgt_facebook_posts_combined",
    dateColumn: "date",
    windowInterval: "INTERVAL 14 DAY",
    columns: ["message", "created_time", "post_type", "permalink_url",
      "reaction_like", "reaction_love", "reaction_wow", "reaction_haha",
      "reaction_sad", "reaction_angry", "unique_users_comment", "unique_users_like",
      "unique_users_share", "clicks_link", "clicks_other", "clicks_photo_view",
      "post_clicks", "post_media_view", "post_total_media_view_unique"]
  },
  {
    table: "tgt_facebook_reels_combined",
    dateColumn: "date",
    windowInterval: "INTERVAL 14 DAY",
    columns: ["title", "description", "created_time", "length",
      "blue_reels_play_count", "fb_reels_replay_count", "fb_reels_total_plays",
      "reaction_anger", "reaction_haha", "reaction_like", "reaction_love",
      "reaction_sorry", "reaction_wow", "comments", "shares",
      "average_retention_pct", "avg_retention_5s", "avg_retention_10s",
      "avg_retention_15s", "avg_retention_20s", "avg_retention_25s",
      "avg_retention_30s"]
  },
  {
    table: "tgt_facebook_videos_combined",
    dateColumn: "date",
    windowInterval: "INTERVAL 14 DAY",
    columns: ["title", "description", "created_time", "length",
      "post_impressions_unique", "post_video_avg_time_watched",
      "post_video_followers", "post_video_view_time"]
  },
  {
    table: "tgt_video_by_content_type",
    dateColumn: "date",
    windowInterval: "INTERVAL 14 DAY",
    columns: ["content_type", "views", "engaged_views", "watch_time_minutes",
      "red_views", "red_watch_time_minutes", "average_view_duration_seconds",
      "average_view_duration_percentage"]
  },
  {
    table: "tgt_video_by_country",
    dateColumn: "date",
    windowInterval: "INTERVAL 14 DAY",
    columns: ["country_code", "country", "views", "engaged_views",
      "watch_time_minutes", "comments", "likes", "shares", "red_views",
      "red_watch_time_minutes"]
  },
  {
    table: "tgt_video_by_device_os",
    dateColumn: "date",
    windowInterval: "INTERVAL 14 DAY",
    columns: ["device_type", "operating_system", "views", "engaged_views",
      "watch_time_minutes"]
  },
  {
    table: "tgt_video_by_traffic_source",
    dateColumn: "date",
    windowInterval: "INTERVAL 14 DAY",
    columns: ["traffic_source_type_name", "views", "engaged_views",
      "watch_time_minutes"]
  },
  {
    table: "tgt_video_demographics",
    dateColumn: "date",
    windowInterval: "INTERVAL 14 DAY",
    columns: ["age_group", "gender", "views_percentage"]
  },
  {
    table: "tgt_video_demographics_monthly",
    dateColumn: "month",
    windowInterval: "INTERVAL 2 MONTH",
    columns: ["age_group", "gender", "views_percentage"]
  },
  {
    table: "tgt_video_performance_daily",
    dateColumn: "date",
    windowInterval: "INTERVAL 14 DAY",
    columns: ["video_title", "views", "engaged_views", "watch_time_minutes",
      "comments", "likes", "dislikes", "shares", "red_views",
      "red_watch_time_minutes", "average_view_duration_seconds",
      "average_view_duration_percentage"]
  },
  {
    table: "tgt_video_performance_monthly",
    dateColumn: "month",
    windowInterval: "INTERVAL 2 MONTH",
    columns: ["video_title", "views", "engaged_views", "watch_time_minutes",
      "comments", "likes", "dislikes", "shares", "red_views",
      "red_watch_time_minutes", "average_view_duration_seconds",
      "average_view_duration_percentage"]
  },
  // Threads pulls are irregular, hence INTERVAL 21 DAY. The _daily_change and
  // days_since_previous_snapshot columns are NULL only on an entity's first
  // snapshot, so they are non-NULL somewhere in any window covering two or more
  // pulls and are safe to check. gif_url and hide_status are deliberately absent:
  // they are 100% NULL in the source today and would fail on day one.
  {
    table: "tgt_threads_account_combined",
    dateColumn: "date",
    windowInterval: "INTERVAL 21 DAY",
    columns: ["username", "name", "biography", "profile_picture_url",
      "is_verified", "followers_count", "followers_count_daily_change",
      "days_since_previous_snapshot", "likes_daily", "quotes_daily",
      "replies_daily", "reposts_daily", "views_daily"]
  },
  {
    table: "tgt_threads_media_combined",
    dateColumn: "date",
    windowInterval: "INTERVAL 21 DAY",
    columns: ["text", "media_type", "media_product_type", "media_label",
      "permalink", "shortcode", "published_at", "is_quote_post", "has_replies",
      "link_attachment_url", "alt_text", "poll_attachment", "topic_tag",
      "clicks", "likes", "quotes", "replies", "reposts", "shares", "views",
      "clicks_daily_change", "likes_daily_change", "quotes_daily_change",
      "replies_daily_change", "reposts_daily_change", "shares_daily_change",
      "views_daily_change", "days_since_previous_snapshot"]
  },
  {
    table: "tgt_threads_replies_combined",
    dateColumn: "date",
    windowInterval: "INTERVAL 21 DAY",
    columns: ["media_type", "text", "replied_at", "shortcode", "permalink",
      "has_replies", "is_reply", "root_post_id", "replied_to_id",
      "is_reply_to_own_post", "root_post_text", "root_post_permalink",
      "root_post_published_at", "root_post_media_type"]
  },
  {
    // Every column is populated on every row: all 7 age bands and 3 genders appear on every
    // snapshot, and country/city return 45 values per pull so slots 1-5 always fill.
    // Listed out longhand to match the model, which is also written longhand.
    table: "tgt_threads_follower_demographics_pivoted",
    dateColumn: "date",
    windowInterval: "INTERVAL 21 DAY",
    columns: ["age_13_17_follower_count", "age_18_24_follower_count",
      "age_25_34_follower_count", "age_35_44_follower_count",
      "age_45_54_follower_count", "age_55_64_follower_count",
      "age_65_plus_follower_count", "age_total_follower_count",
      "age_13_17_follower_percentage", "age_18_24_follower_percentage",
      "age_25_34_follower_percentage", "age_35_44_follower_percentage",
      "age_45_54_follower_percentage", "age_55_64_follower_percentage",
      "age_65_plus_follower_percentage", "age_total_follower_percentage",
      "gender_f_follower_count", "gender_m_follower_count",
      "gender_u_follower_count", "gender_total_follower_count",
      "gender_f_follower_percentage", "gender_m_follower_percentage",
      "gender_u_follower_percentage", "gender_total_follower_percentage",
      "country_code_1", "country_name_1", "country_code_2", "country_name_2",
      "country_code_3", "country_name_3", "country_code_4", "country_name_4",
      "country_code_5", "country_name_5",
      "country_code_1_follower_count", "country_code_2_follower_count",
      "country_code_3_follower_count", "country_code_4_follower_count",
      "country_code_5_follower_count", "country_code_total_follower_count",
      "country_code_1_follower_percentage", "country_code_2_follower_percentage",
      "country_code_3_follower_percentage", "country_code_4_follower_percentage",
      "country_code_5_follower_percentage", "country_code_total_follower_percentage",
      "country_follower_distribution_json",
      "city_1", "city_2", "city_3", "city_4", "city_5",
      "city_1_follower_count", "city_2_follower_count", "city_3_follower_count",
      "city_4_follower_count", "city_5_follower_count", "city_total_follower_count",
      "city_1_follower_percentage", "city_2_follower_percentage",
      "city_3_follower_percentage", "city_4_follower_percentage",
      "city_5_follower_percentage", "city_total_follower_percentage",
      "city_follower_distribution_json"]
  }
];

// Same shape as targetAlwaysNullChecks, but for unpartitioned staging tables.

const stagingAlwaysNullChecks = [
  {
    table: "stg_facebook_page_insights",
    dateColumn: "date",
    windowInterval: "INTERVAL 14 DAY",
    columns: ["page_daily_follows_unique", "page_daily_unfollows_unique",
      "page_follows", "page_media_view", "page_post_engagements",
      "page_total_media_view_unique", "page_views_total"]
  },
  {
    table: "stg_api_device_os",
    dateColumn: "date",
    windowInterval: "INTERVAL 14 DAY",
    columns: ["device_type_name", "operating_system_name", "views",
      "engaged_views", "watch_time_minutes"]
  },
  {
    table: "stg_api_playback_details",
    dateColumn: "date",
    windowInterval: "INTERVAL 14 DAY",
    columns: ["content_type", "views", "engaged_views", "red_views",
      "watch_time_minutes", "red_watch_time_minutes",
      "average_view_duration_seconds", "average_view_duration_percentage"]
  },
  {
    table: "stg_api_playback_location",
    dateColumn: "date",
    windowInterval: "INTERVAL 14 DAY",
    columns: ["playback_location_type", "content_type", "views", "engaged_views",
      "watch_time_minutes"]
  },
  {
    table: "stg_api_traffic_sources",
    dateColumn: "date",
    windowInterval: "INTERVAL 14 DAY",
    columns: ["traffic_source_type_name", "content_type", "views",
      "engaged_views", "watch_time_minutes"]
  },
  {
    table: "stg_api_user_activity",
    dateColumn: "date",
    windowInterval: "INTERVAL 14 DAY",
    columns: ["engaged_views", "views", "red_views", "comments", "likes",
      "dislikes", "shares", "watch_time_minutes", "red_watch_time_minutes",
      "average_view_duration_seconds", "average_view_duration_percentage"]
  },
  {
    table: "stg_dt_channel_basic",
    dateColumn: "date",
    windowInterval: "INTERVAL 14 DAY",
    columns: ["live_or_on_demand", "subscribed_status", "country_code", "views",
      "engaged_views", "comments", "likes", "dislikes", "shares",
      "watch_time_minutes", "average_view_duration_seconds",
      "average_view_duration_percentage", "red_views", "red_watch_time_minutes"]
  },
  {
    table: "stg_dt_channel_basic_by_country",
    dateColumn: "date",
    windowInterval: "INTERVAL 14 DAY",
    columns: ["live_or_on_demand", "subscribed_status", "country_code", "views",
      "engaged_views", "comments", "likes", "dislikes", "shares",
      "watch_time_minutes", "average_view_duration_seconds",
      "average_view_duration_percentage", "red_views", "red_watch_time_minutes"]
  },
  {
    table: "stg_dt_channel_combined",
    dateColumn: "date",
    windowInterval: "INTERVAL 14 DAY",
    columns: ["live_or_on_demand", "subscribed_status", "playback_location",
      "traffic_source", "device_type", "operating_system", "views",
      "engaged_views", "watch_time_minutes", "average_view_duration_seconds",
      "average_view_duration_percentage", "red_views", "red_watch_time_minutes"]
  },
  {
    table: "stg_dt_device_os",
    dateColumn: "date",
    windowInterval: "INTERVAL 14 DAY",
    columns: ["live_or_on_demand", "subscribed_status", "country_code",
      "device_type_name", "operating_system_name", "views", "engaged_views",
      "watch_time_minutes", "average_view_duration_seconds",
      "average_view_duration_percentage", "red_views", "red_watch_time_minutes"]
  },
  {
    table: "stg_dt_playback_location",
    dateColumn: "date",
    windowInterval: "INTERVAL 14 DAY",
    columns: ["live_or_on_demand", "subscribed_status", "country_code",
      "playback_location_type_name", "playback_location_type",
      "playback_location_detail", "views", "engaged_views",
      "watch_time_minutes", "average_view_duration_seconds",
      "average_view_duration_percentage", "red_views", "red_watch_time_minutes"]
  },
  {
    table: "stg_dt_traffic_sources",
    dateColumn: "date",
    windowInterval: "INTERVAL 14 DAY",
    columns: ["live_or_on_demand", "subscribed_status", "country_code",
      "traffic_source_type", "traffic_source_detail", "views", "engaged_views",
      "watch_time_minutes", "average_view_duration_seconds",
      "average_view_duration_percentage", "red_views", "red_watch_time_minutes"]
  },
  {
    table: "stg_facebook_page_info",
    dateColumn: "date",
    windowInterval: "INTERVAL 14 DAY",
    columns: ["name", "fan_count", "followers_count", "talking_about_count"]
  },
  {
    table: "stg_facebook_post_activity",
    dateColumn: "date",
    windowInterval: "INTERVAL 14 DAY",
    columns: ["unique_users_comment", "unique_users_like", "unique_users_share"]
  },
  {
    table: "stg_facebook_post_clicks_by_type",
    dateColumn: "date",
    windowInterval: "INTERVAL 14 DAY",
    columns: ["clicks_link", "clicks_other", "clicks_photo_view"]
  },
  {
    table: "stg_facebook_post_insights",
    dateColumn: "date",
    windowInterval: "INTERVAL 14 DAY",
    columns: ["post_clicks", "post_media_view", "post_total_media_view_unique"]
  },
  {
    table: "stg_facebook_post_reactions",
    dateColumn: "date",
    windowInterval: "INTERVAL 14 DAY",
    columns: ["reaction_like", "reaction_love", "reaction_wow", "reaction_haha",
      "reaction_sad", "reaction_angry"]
  },
  {
    table: "stg_facebook_posts",
    dateColumn: "date",
    windowInterval: "INTERVAL 14 DAY",
    columns: ["message", "created_time", "post_type", "permalink_url"]
  },
  {
    table: "stg_facebook_video_insights",
    dateColumn: "date",
    windowInterval: "INTERVAL 14 DAY",
    columns: ["blue_reels_play_count", "fb_reels_replay_count",
      "fb_reels_total_plays", "post_impressions_unique",
      "post_video_avg_time_watched", "post_video_followers",
      "post_video_view_time"]
  },
  {
    table: "stg_facebook_video_reel_reactions",
    dateColumn: "date",
    windowInterval: "INTERVAL 14 DAY",
    columns: ["reaction_anger", "reaction_haha", "reaction_like", "reaction_love",
      "reaction_sorry", "reaction_wow"]
  },
  {
    table: "stg_facebook_video_reel_retention",
    dateColumn: "date",
    windowInterval: "INTERVAL 14 DAY",
    columns: ["average_retention_pct", "avg_retention_5s", "avg_retention_10s",
      "avg_retention_15s", "avg_retention_20s", "avg_retention_25s",
      "avg_retention_30s"]
  },
  {
    table: "stg_facebook_video_reel_social_actions",
    dateColumn: "date",
    windowInterval: "INTERVAL 14 DAY",
    columns: ["comments", "shares"]
  },
  {
    table: "stg_facebook_videos",
    dateColumn: "date",
    windowInterval: "INTERVAL 14 DAY",
    columns: ["title", "description", "created_time", "length"]
  },
  {
    table: "stg_instagram_account",
    dateColumn: "date",
    windowInterval: "INTERVAL 21 DAY",
    columns: ["username", "name", "biography", "followers_count",
      "follows_count", "media_count"]
  },
  {
    table: "stg_instagram_account_insights",
    dateColumn: "date",
    windowInterval: "INTERVAL 21 DAY",
    columns: ["follower_count", "reach", "views"]
  },
  {
    table: "stg_instagram_media",
    dateColumn: "date",
    windowInterval: "INTERVAL 21 DAY",
    columns: ["caption", "media_type", "media_product_type", "media_label",
      "permalink", "published_at", "like_count", "comments_count"]
  },
  {
    table: "stg_instagram_media_insights",
    dateColumn: "date",
    windowInterval: "INTERVAL 21 DAY",
    columns: ["comments", "likes", "reach", "saved", "shares",
      "total_interactions", "views"]
  },
  // Threads pulls are irregular like Instagram's, hence INTERVAL 21 DAY rather
  // than Facebook's 14. Two source columns are deliberately absent from these
  // lists because they are 100% NULL for first run. 
  // Revisit once more data has landed.
  {
    table: "stg_threads_profile",
    dateColumn: "date",
    windowInterval: "INTERVAL 21 DAY",
    columns: ["username", "name", "biography", "profile_picture_url",
      "is_verified"]
  },
  {
    table: "stg_threads_account_lifetime",
    dateColumn: "date",
    windowInterval: "INTERVAL 21 DAY",
    columns: ["followers_count"]
  },
  {
    table: "stg_threads_account_insights",
    dateColumn: "date",
    windowInterval: "INTERVAL 21 DAY",
    columns: ["likes", "quotes", "replies", "reposts", "views"]
  },
  {
    table: "stg_threads_media",
    dateColumn: "date",
    windowInterval: "INTERVAL 21 DAY",
    columns: ["text", "media_type", "media_product_type", "media_label",
      "permalink", "shortcode", "published_at", "is_quote_post", "has_replies",
      "link_attachment_url", "alt_text", "poll_attachment", "topic_tag"]
  },
  {
    table: "stg_threads_media_insights",
    dateColumn: "date",
    windowInterval: "INTERVAL 21 DAY",
    columns: ["clicks", "likes", "quotes", "replies", "reposts", "shares",
      "views"]
  },
  {
    table: "stg_threads_replies",
    dateColumn: "date",
    windowInterval: "INTERVAL 21 DAY",
    columns: ["media_type", "text", "replied_at", "shortcode", "permalink",
      "has_replies", "is_reply", "root_post_id", "replied_to_id"]
  },
  {
    table: "stg_threads_follower_demographics",
    dateColumn: "date",
    windowInterval: "INTERVAL 21 DAY",
    columns: ["breakdown", "dimension_value", "age_group", "gender",
      "country_code", "city", "country_name", "follower_count"]
  }
];

module.exports = { apiDtCutOffDate, threadsDemographicBreakdowns, threadsDemographicPivot, targetAlwaysNullChecks, stagingAlwaysNullChecks };
