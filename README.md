# Sectional Driveaway Profit Optimizer

A responsive logistics workspace with a load board, personal driver profiles, cost settings, a 1–7 day connected route planner, saved plans, expense reports, and shared teams.

## Working capabilities

- ChatGPT sign-in and persistent Cloudflare D1 storage.
- Separate personal profiles and shared workspaces; switch between teams.
- Create additional workspaces from the sidebar, with or without sample loads. Keep one workspace for demos and another for real dispatching under the same account.
- Owners can reset a workspace to demo data from Settings. This deletes every load and saved plan in that workspace and restores the illustrative sample loads; members and preferences are kept.
- Owners manage invitations and membership. Dispatchers edit loads and plans. Viewers read shared data and manage their own profile.
- Single-use invitation links expire after seven days. Site access is a separate outer sharing boundary; grant teammates access to the Site before sending an invitation.
- Manual load entry, detailed estimates, driver assignment, and delivery statuses.
- CSV import with preview, validation, duplicate order checks, and CSV export.
- Fuel, deadhead, lodging, food, tolls, return transportation, and other expenses.
- Geographic route overview, candidate next pickups, and bounded route search with three strategies.
- In-app profit alerts, saved route snapshots, and JSON plan downloads.
- Driving-hours checks: each load shows wheel time and the minimum legal driving days under DOT property-carrying, DOT passenger-carrying, or rideshare (Uber/Lyft) limits. Drivers log on-duty hours for the last eight days in their profile to see what remains in the 60/7 or 70/8 cycle; the planner warns when a route needs more hours than remain.
- Way home after delivery: each load records flight, train, bus, rental car, rideshare, team pickup, or a nearby next load plus the airport or station used. Drivers can set a preferred way home, which nudges the profit match without excluding loads.
- Fuel & IFTA: a fuel log with jurisdiction, gallons, totals, DEF, odometer, receipt status, and linked load; a quarterly IFTA worksheet of miles and tax-paid gallons per jurisdiction with CSV export; and reminders for loads on the road without a logged fill-up, missing receipts, and filing deadlines.
- Load cards carry the carrier's reference number, pickup and delivery facility names and street addresses with directions links, unit count, and tow type (N/A, tow-behind, decked, saddle mount). The load board can show miles from your current location when you allow the browser to share it.
- Trip packet: every load has a paperwork checklist (pickup inspection, bill of lading, photos, delivery receipt, fuel, toll, lodging, return ticket, other receipts) with amounts and notes. Fuel receipts fill in from logged fuel stops. Delivered and in-transit loads show packet progress, and missing required documents appear in Alerts. Photo and PDF uploads are planned once file storage is connected.
- DEF estimate: choose a truck preset (or a custom dosing rate) in Settings, and each diesel fill-up suggests how many gallons of diesel exhaust fluid to add.
- Shared data refreshes every 30 seconds when no edit dialog is open. Version checks reject conflicting load edits.

## Data and estimate limits

New workspaces start with clearly marked illustrative loads. Remove them in Settings before dispatching actual work. Load dates are availability-from dates; a load remains available until a team member updates its status. Imported miles, trip days, rates, and costs are user-supplied.

IFTA jurisdiction miles come from trip-sheet miles entered on each load; without them the load's miles are split evenly between the origin and destination states (deadhead goes to the origin state) and flagged as estimated. The worksheet does not apply tax rates, surcharges, or credits. Driving-hour estimates convert miles to time at the driver's average-speed setting and do not replace an ELD or logbook. DEF suggestions use a rule-of-thumb dosing rate (about 2–3% of diesel); confirm with the truck's gauge.

Connections estimate road miles from geographic distance × 1.2. The optimizer evaluates at most 20,000 connected combinations and does not guarantee a global optimum. It excludes assigned, in-transit, delivered, and cancelled loads. It counts meals during waiting, lodging across the plan, and only the final return trip. Maximum expense per load uses a conservative standalone estimate. Confirm dates, routes, pickup windows, legal driving limits, and transportation costs with the provider.

This version does not connect to live load boards, GPS devices, airline pricing, accounting systems, billing, email delivery, or an AI dispatcher. No credentials from third-party load boards are collected.

## Development

Use Node 22.13 or newer and `npm install`. `npm run dev` starts the Sites/Vinext development server. Local sign-in uses the Sites plugin's test identity; production uses the authenticated gateway headers from Sites.

Generate schema migrations with `npm run db:generate`. For local persistence, start `npm run dev` once so Miniflare creates the local D1 file, then run `npm run db:local` to apply the migrations to it (requires the `sqlite3` CLI, which ships with macOS). Sign in locally at `/signin-with-chatgpt?return_to=/` to get the simulated `seedy@sites.test` identity. Sites packages the Drizzle migrations for deployment.

Run `npm test` for the financial and planner cases. Run `npx tsc --noEmit` and `npx oxlint app lib db tests` for application checks. The untouched generated component catalog has pre-existing lint findings under the global `npm run lint` command.

Build using `npm run build`. The Site is registered in `.openai/hosting.json` and must be deployed through the Sites workflow.

## Map data

Geographic state boundaries derive from the [PublicaMundi MappingAPI US states GeoJSON](https://github.com/PublicaMundi/MappingAPI/blob/master/data/geojson/us-states.json). `lib/map-data.json` contains projected geographic paths. Route connections are schematic and do not show live GPS positions or turn-by-turn road routing.
