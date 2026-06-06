# SEO and growth reference (TrackTub)

## Positioning → SEO keyword map

| Message | Target keywords (long-tail) | Page |
|---------|----------------------------|------|
| Guest-ready compliance | STR hot tub checklist, vacation rental hot tub turnover | Landing |
| Dispute trail | hot tub condition documentation rental, proof before check-in | Landing + blog |
| Multi-property | property manager hot tub log, multiple Airbnb hot tubs | Landing |

Avoid bidding on: “hot tub app”, “spa maintenance” (consumer/hobby intent).

## Technical SEO checklist

```
Landing (/)
  [ ] title 50–60 chars, description 150–160 chars
  [ ] single h1, keyword in first 100 words naturally
  [ ] Open Graph + Twitter card images (1200×630)
  [ ] JSON-LD SoftwareApplication
  [ ] internal link to /pilot or #book-pilot

Site-wide
  [ ] sitemap.xml (marketing pages only)
  [ ] robots.txt disallow /api /dashboard /field
  [ ] canonical URLs on all public pages
  [ ] mobile viewport + accessible contrast (WCAG AA aim)
  [ ] Core Web Vitals: compress hero, lazy-load below fold

App (noindex)
  [ ] /login /dashboard /field/* → robots noindex
```

## Content pillars (blog or `/resources`)

1. **Turnover SOP** — “Hot tub turnover checklist for STR cleaners” (lead magnet PDF)
2. **Dispute prevention** — “What to photograph before guest check-in”
3. **Scaling** — “Managing 10+ vacation rentals with hot tubs”

One pillar post per month minimum during validation; interlink to landing CTA.

## Where to post (ranked for STR operators)

| Priority | Channel | Why | How often |
|----------|---------|-----|-----------|
| 1 | Local/regional STR Facebook groups | Operators congregate; tub amenity common in mountain/coastal markets | 1 value post/week; no link dump first visit |
| 2 | BiggerPockets Short-Term Rental forum | PMs with portfolios | 1 thread/month; answer others first |
| 3 | LinkedIn (personal + company page) | Find “vacation rental manager [city]” | 3 posts/week; 10 connection requests/day |
| 4 | Regional host meetups (Eventbrite, Meetup) | High trust; offer free 15-min tub audit | 1 event/month attend or sponsor coffee |
| 5 | YouTube / Loom | Demo turnover flow in 90 sec | 2 videos/month embedded on landing |
| 6 | Instagram (optional) | Visual proof story resonates | 3 reels/month; link in bio to landing |
| 7 | Reddit | Low conversion for B2B; use only for **learning**, not primary GTM | Comment helpfully; rare soft mention |
| 8 | X/Twitter | Secondary; follow STR influencers | Engage, don’t cold-spam |

## How to post (format rules)

**Facebook group post (value-first):**
```
Quick question for hosts with hot tubs: how do you prove the tub was guest-ready 
before check-in—photos in a group chat, checklist, or nothing formal?

I'm researching whether a simple turnover log (photos + timestamps per property) 
would save headaches. Not selling yet—would a 15-min call help if you run 3+ listings?
```

**LinkedIn post:**
- Hook: dispute or bad review story (anonymized)
- Body: 3-bullet problem → what you’re building → ask for DMs from operators with 3+ tubs
- CTA: Comment “TUB” for interview link (tracks interest)

**Do not:** mass DM strangers on Airbnb; buy email lists; post affiliate spam in groups (get banned).

## Growth / attention (B2B appropriate)

| Tactic | Effort | Expected outcome |
|--------|--------|-------------------|
| Free “tub audit” call (15 min) | High touch | 30% book rate from warm leads |
| Case study PDF from concierge pilot | Medium | Landing social proof |
| Partner: local hot tub service company co-referral | Medium | Credibility + warm intros |
| Waitlist + monthly operator newsletter | Low | Nurture maybes |
| Referral: one free month per referred operator | Low | After first paid pilot |

**Follower count is not the metric.** Track: interviews booked, pilots paid, staff weekly turnovers.

## Metrics dashboard (validation)

| Metric | Target | Tool |
|--------|--------|------|
| Landing → pilot/waitlist | ≥5% | Analytics event |
| Outreach → interview booked | ≥15% | `interview-log.csv` |
| Interviews → pilot_yes | ≥25% | log `signals` column |
| Pilots → month-2 renewal | ≥1 of 3 | concierge guide |
| Staff turnovers/property/week | ≥1 active | app DB later |

## Kill / pivot (restate)

After **20 interviews** and **3 paid concierge pilots**: zero renewals + no staff usage → pivot to service companies or shutdown product effort.

## Marketing plan document template

When writing `docs/marketing/seo-and-growth-plan.md`, use:

```markdown
# TrackTub SEO & growth plan
## Executive summary
## ICP and messaging
## SEO (technical + content calendar)
## Channel playbook (where / how / what)
## Interview recruitment (15–20)
## Outreach compliance (Airbnb policy)
## Metrics and go/no-go gates
## 90-day calendar (week by week)
## Appendix: feature ↔ message map
```
