# Integration Notes

## YouTube Fast-Growing Channel Discovery (to integrate)

Date: 2026-02-19

### Agreed pipeline
1. Use `search.list` with `type=video` (not `type=channel`) to find recent momentum.
2. Query recent window with `publishedAfter` (e.g. last 7 days).
3. Prefer longer-form content with filters like:
   - `videoDuration=medium` or `videoDuration=long`
   - `order=viewCount`
   - `regionCode`, `relevanceLanguage`
4. Extract unique `videoId` from search results.
5. Call `videos.list` with `part=snippet,statistics,contentDetails` to get:
   - `snippet.channelId`
   - `statistics.viewCount`
   - `contentDetails.duration`
6. Filter noise:
   - remove very short videos (e.g. duration < 240s)
   - downrank hashtag-heavy / low-info titles
   - dedupe repeated channel spam
7. Aggregate by channel for 7-day metrics:
   - upload_count_7d
   - views_sum_7d
   - views_median_7d
8. Compute growth score (v1):

```text
GrowthScore =
0.45*log(views_sum_7d+1) +
0.30*log(views_median_7d+1) +
0.25*min(upload_count_7d,7)
```

### Important notes
- `search.list` response does NOT include `viewCount`; must enrich with `videos.list`.
- Channel `snippet.publishedAt` is channel creation time, not recent growth.
- Use daily/weekly snapshots to measure true growth over time.

### Next implementation in Team Content OS
- Add API route: `/api/youtube/discover`
- Add service: `src/lib/youtube/discovery.ts`
- Persist run + candidates tables
- Add dashboard section: "Fast-Growing Candidates"
