# Explicit product refresh

Open a saved CJ candidate's Variant prices & shipping estimates page. The new
Georgian "განაახლე პროდუქტის მონაცემები" button refreshes variants/inventory,
then at most three distinct previously saved routes. It does not invent a market,
origin or postcode and does not change financial inputs/evidence. Review and
apply a new quote separately through the existing confirmation form.

The plan uses the latest 100 stored quotes, grouping methods by exact variant,
market, origin, destination and postcode. The newest quote represents each route.
Limits/omissions are stated. The plan is captured before refresh so removed
variants can be reported and then skipped. A changed destination is rejected.
Prices/stock changes are summarized for up to 100 variants. Shipping summaries
compare an old method with the lowest newly saved method; differing method/time
means these are not necessarily like-for-like quotes or delivered totals.

Native owner-only server actions enforce access independently on each step.
Every operation uses the existing database-backed shared CJ cooldown reservation.
The browser waits 31 seconds after a step completes before requesting a route.
Other tabs/workers share the cooldown: contention stops this flow, without retries.
The existing two-endpoint variant operation keeps its internal pacing.

No new database tables, migrations, dependencies, AI calls or worker processes.
This is an explicit browser workflow, not a durable scheduled job. Closing the
page/Stop cancels remaining steps; a request already sent may finish and save.
Partial successful refreshes remain stored. Reload to inspect saved results after
an interrupted connection before running again. Reload does not resume or retry.
Old quotes remain immutable history; a no-method response does not make them fresh.
Prices and stock are provider reports, not reservations or final order guarantees.

Validation uses mock provider services, route-plan tests, owner/cooldown/identity
checks, and a browser test that intercepts all mutation requests to prove double
launch/cancel behavior without calling CJ. A complete live run depends on the
owner's actual saved routes, account access, fresh inventory and supplier service.
