// Checks the last few days of Meta data so problems with recent loads get flagged while they're fresh
const lagDays = 2;
const recentDays = 3;
const maxLifetimeDip = 0.5;
const minRecoveryShare = 0.9;
const minLifetimeValue = 100;
const minCatalogueShare = 0.9;

// All Meta raw tables, each loaded once a day
const recentDateTables = [
  "raw_facebook_page_info",
  "raw_facebook_page_insights",
  "raw_facebook_posts",
  "raw_facebook_post_activity",
  "raw_facebook_post_clicks_by_type",
  "raw_facebook_post_insights",
  "raw_facebook_post_reactions",
  "raw_facebook_videos",
  "raw_facebook_video_insights",
  "raw_facebook_video_reel_reactions",
  "raw_facebook_video_reel_retention",
  "raw_facebook_video_reel_social_actions",
  "raw_instagram_account",
  "raw_instagram_account_insights",
  "raw_instagram_media",
  "raw_instagram_media_insights",
  "raw_threads_profile",
  "raw_threads_account_lifetime",
  "raw_threads_account_insights",
  "raw_threads_follower_demographics",
  "raw_threads_media",
  "raw_threads_media_insights",
  "raw_threads_replies"
];

// Snapshot tables can't be backfilled, unlike the daily insights tables
const snapshotTables = recentDateTables.filter(table => ![
  "raw_facebook_page_insights",
  "raw_instagram_account_insights",
  "raw_threads_account_insights"
].includes(table));

// Post tables and their published date column
const publishedTables = [
  {table: "raw_facebook_posts", idColumn: "post_id", publishedColumn: "created_time"},
  {table: "raw_facebook_videos", idColumn: "video_id", publishedColumn: "created_time"},
  {table: "raw_instagram_media", idColumn: "media_id", publishedColumn: "timestamp"},
  {table: "raw_threads_media", idColumn: "media_id", publishedColumn: "timestamp"},
  {table: "raw_threads_replies", idColumn: "reply_id", publishedColumn: "timestamp"}
];

// Insights tables with lifetime totals
const lifetimeInsightTables = [
  {table: "raw_facebook_post_insights", idColumn: "post_id"},
  {table: "raw_facebook_video_insights", idColumn: "video_id"},
  {table: "raw_instagram_media_insights", idColumn: "media_id"},
  {table: "raw_threads_media_insights", idColumn: "media_id"}
];

// Replies get deleted too often to check for shrinking
const catalogueTables = publishedTables.filter(({table}) => table !== "raw_threads_replies");

const windowStart = `DATE_SUB(CURRENT_DATE(), INTERVAL ${lagDays + recentDays - 1} DAY)`;
const windowEnd = `DATE_SUB(CURRENT_DATE(), INTERVAL ${lagDays} DAY)`;
const lookbackStart = `DATE_SUB(CURRENT_DATE(), INTERVAL ${lagDays + recentDays + 7} DAY)`;

// Fails if a recent day is missing, e.g. a pipeline stopped
recentDateTables.forEach(table => {
  assert(`${table}_recent_dates_check`)
    .description(`Fails if any of the last ${recentDays} expected days are missing from ${table}`)
    .query(ctx => `
      WITH date_spine AS (
        SELECT date
        FROM UNNEST(GENERATE_DATE_ARRAY(${windowStart}, ${windowEnd})) AS date
      ),
      dates_in_table AS (
        SELECT DISTINCT target_date
        FROM ${ctx.ref(table)}
        WHERE target_date >= ${windowStart}
      )
      SELECT spine.date AS missing_date
      FROM date_spine AS spine
      LEFT JOIN dates_in_table AS actual ON spine.date = actual.target_date
      WHERE actual.target_date IS NULL
    `);
});

// Fails if one load wrote several dates, meaning a backfill copied today's figures onto past days
snapshotTables.forEach(table => {
  assert(`${table}_single_load_per_snapshot_check`)
    .description(`Fails if one load in the last ${recentDays} days wrote more than one target_date to ${table}`)
    .query(ctx => `
      SELECT
        DATE(ingestion_timestamp) AS load_date,
        COUNT(DISTINCT target_date) AS target_dates_loaded,
        MIN(target_date) AS first_target_date,
        MAX(target_date) AS last_target_date
      FROM ${ctx.ref(table)}
      WHERE ingestion_timestamp >= TIMESTAMP(${windowStart})
      GROUP BY load_date
      HAVING COUNT(DISTINCT target_date) > 1
    `);
});

// Fails if a post appears more than a day before it was published
publishedTables.forEach(({table, idColumn, publishedColumn}) => {
  assert(`${table}_not_before_published_check`)
    .description(`Fails if ${table} has a snapshot dated more than a day before the post was published`)
    .query(ctx => `
      SELECT ${idColumn}, target_date, ${publishedColumn} AS published_at
      FROM ${ctx.ref(table)}
      WHERE target_date >= ${windowStart}
        AND target_date < DATE_SUB(DATE(${publishedColumn}), INTERVAL 1 DAY)
    `);
});

// Fails if a lifetime total drops to zero or dips and bounces back; drops that stay down are Meta restating figures
lifetimeInsightTables.forEach(({table, idColumn}) => {
  assert(`${table}_lifetime_bad_pull_check`)
    .description(`Fails if a lifetime metric in ${table} dropped to 0, or dipped and recovered at the next snapshot`)
    .query(ctx => `
      WITH ordered AS (
        SELECT
          ${idColumn},
          metric,
          target_date,
          value,
          LAG(value) OVER snapshots AS previous_value,
          LEAD(value) OVER snapshots AS next_value
        FROM ${ctx.ref(table)}
        WHERE period = 'lifetime'
          AND target_date >= ${lookbackStart}
        WINDOW snapshots AS (PARTITION BY ${idColumn}, metric ORDER BY target_date)
      )
      SELECT *
      FROM ordered
      WHERE target_date >= ${windowStart}
        AND previous_value >= ${minLifetimeValue}
        AND (
          value = 0
          OR (value < previous_value * ${1 - maxLifetimeDip} AND next_value >= previous_value * ${minRecoveryShare})
        )
    `);
});

// Fails if a snapshot is missing a chunk of posts compared with the day before
catalogueTables.forEach(({table, idColumn}) => {
  assert(`${table}_catalogue_shrink_check`)
    .description(`Fails if a snapshot of ${table} lists under ${minCatalogueShare * 100}% of the previous snapshot's items`)
    .query(ctx => `
      WITH counts AS (
        SELECT target_date, COUNT(DISTINCT ${idColumn}) AS items
        FROM ${ctx.ref(table)}
        WHERE target_date >= ${lookbackStart}
        GROUP BY target_date
      ),
      compared AS (
        SELECT target_date, items, LAG(items) OVER (ORDER BY target_date) AS previous_items
        FROM counts
      )
      SELECT *
      FROM compared
      WHERE target_date >= ${windowStart}
        AND items < previous_items * ${minCatalogueShare}
    `);
});
