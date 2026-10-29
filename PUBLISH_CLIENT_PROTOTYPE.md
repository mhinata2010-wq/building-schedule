# Publish client prototype

This change publishes the client-requested Phase 1 workflow on GitHub Pages without carrying the merge conflicts from the earlier migration PR.

## Client workflow
1. Draw a Gantt bar directly on the schedule.
2. Edit task name, dates, and predecessor.
3. Reuse the same task data to generate the network schedule.
4. Persist the prototype state in the browser.

## Scope
This is a reviewable prototype. Collaboration, authentication, history, permissions, and Supabase sync remain outside this publishing fix.