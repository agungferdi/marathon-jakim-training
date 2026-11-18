# Road to JAKIM 2027

A 29-week marathon training block for a sub-3:50 at the Jakarta International Marathon (Sunday 13 June 2027), built as a React calendar app.

- Every day of the calendar shows the session; click it for paces, heart-rate targets, the workout structure and coaching notes.
- Five runs a week: base runs Tue/Thu/Sat, speed on Wednesday, and a Sunday long run that alternates long slow distance with tempo long runs at race pace, building to 30 km.
- Paces and heart-rate zones come from two October 2026 races (HM Malioboro 1:52:34, JRF Marathon 4:06:52).

## Run it

```bash
cd app
npm install
npm run dev     # http://localhost:5173
npm test        # plan checks
npm run build
```

Add `?today=2027-03-03` to the URL to preview the app on another date. The plan itself lives in `app/src/plan/plan.ts`.
