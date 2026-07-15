const apiDtCutOffDate = '2026-03-01';

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
  }
];

module.exports = { apiDtCutOffDate, targetAlwaysNullChecks, stagingAlwaysNullChecks };
