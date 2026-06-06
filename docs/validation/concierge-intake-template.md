# Concierge intake (copy to Google Form or Notion)

## Property

- Property name
- Address
- Turnover date
- Submitted by (name)

## Photos (required)

1. Wide shot of tub area
2. Waterline / water clarity
3. Control panel / chemistry
4. Cover and filter area

## Notes

- Free text: smells, errors on panel, guest reported issues
- Urgent? (checkbox) → same-day review

## Backend tracking

Log each submission in `concierge-submissions.csv`:

```csv
received_at,org,property,submitter,urgent,tag_summary,action_taken
```
