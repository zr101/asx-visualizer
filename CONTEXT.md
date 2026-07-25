# ASX Market Intelligence

A point-in-time archive of every ASX-listed security, captured once per trading day, and the
analytical readings derived from it. The archive is the product: because nothing is ever
reconstructed from today's constituents backwards, securities that later delist stay in the
record with the prices they had while listed.

## Language

### The archive

**Archive**:
The complete set of captured trading days, one Parquet partition per Session.
_Avoid_: history, dataset, snapshots (the last named the retired JSON tree).

**Session**:
A single trading day's cross-section of the whole market, with row-local facts established.
_Avoid_: day, snapshot, cross-section (bare), frame.

**Carried-forward day**:
A captured day that merely repeats the previous Session because the market was shut; not a
Session, and excluded from the Archive.
_Avoid_: stale day, holiday, duplicate day.

**Listing**:
Any security returned by the daily scan — includes funds and depositary receipts.
_Avoid_: stock (reserve that for Common stock), security, row, ticker.

**Common stock**:
A Listing that is an operating company rather than a fund, ETF or depositary receipt.
_Avoid_: equity, share, stock (bare).

**Traded**:
A Listing whose close or volume moved since the previous Session. Roughly 16% of Common
stocks are untraded on a given day and still report the previous Session's change, so this
distinction is load-bearing for every count.
_Avoid_: active, live, moved.

### Populations

**Universe**:
A named population of Listings within a Session. Every published reading states which one it
was computed over.
_Avoid_: set, selection, filter, cohort.

**All**:
The Universe of every Listing in the Session.

**Stocks**:
The Universe of Common stocks. The correct denominator for breadth, sector and coverage
statistics — a fund mechanically tracking the market would damp any participation reading.

**Liquid**:
The Universe of Common stocks clearing a minimum average daily turnover. Used where microcap
noise would distort a cross-sectional comparison.
_Avoid_: investable, tradeable.

### Readings

**Reading**:
A value derived from one or more Sessions over a stated Universe. Readings are computed from
a Session, never from a raw frame.
_Avoid_: metric, stat, calculation, indicator (reserve that for vendor-supplied indicators).

**Row-local fact**:
A value depending only on a Listing's own row, plus the previous Session — `traded`, the
one-day return, and the derived ratios.
_Avoid_: enrichment, derived column.

**Cross-sectional Reading**:
A Reading whose value for one Listing depends on every other Listing in the Universe that
Session — the factor scores and RS rating. Distinct from a Row-local fact because it is
defined only over a stated Universe.
_Avoid_: rank, score (bare).

**Breadth**:
The Reading describing how much of a Universe participated in a move, as opposed to where the
market closed.

**Signal**:
A Reading that fires when a condition became true between two Adjacent Sessions. Requires
both, which is why none of it is computable from a single Session.
_Avoid_: alert, event, trigger.

**Adjacent Sessions**:
Two Sessions consecutive in the Archive, with no captured day between them. A Signal computed
across a gap would label a multi-day move as having happened today, so adjacency is a
precondition rather than an assumption.
_Avoid_: consecutive days, yesterday (a calendar day may be a Carried-forward day or missing).

## Relationships

- An **Archive** contains many **Sessions**, one per trading day; **Carried-forward days** are
  excluded from it.
- A **Session** contains many **Listings** and exposes three **Universes**: All, Stocks, Liquid.
- A **Session** establishes the **Row-local facts** for its Listings.
- A **Reading** is computed from one **Session**, from two **Adjacent Sessions** (a **Signal**),
  or from an **Archive** (a series), always over a stated **Universe**.
- **Traded** is a **Row-local fact** and is required before any count of advancers or decliners.
- Only an **Archive** can establish that two **Sessions** are **Adjacent**.

## Example dialogue

> **Dev:** "The sector table says 47% of Financials advanced, but breadth says 38% for the whole
> market. Same day — are those comparable?"
>
> **Domain expert:** "No, and that's a defect rather than a nuance. Breadth counts advancers over
> **Traded** Listings only. The sector table counts every Listing, including ones that never
> traded and are still reporting the previous **Session**'s move. They should both mean the same
> thing."
>
> **Dev:** "So which **Universe** is each over?"
>
> **Domain expert:** "Both should be **Stocks** — Common stocks only. Funds don't belong in a
> participation figure. And both should restrict the numerator to **Traded**."

## Flagged ambiguities

- ~~**"advancing_pct" means two different things in one payload.**~~ **Resolved.** Both
  Readings now mask the numerator by **Traded** and count only Traded listings in the
  denominator. Sector advancers summed to 392 against breadth's 306 in the same payload;
  they now reconcile exactly at 306. `sectors.of` also reports `traded_count` so the
  denominator is visible rather than implied.

- **"turnover" means three things.** Value traded today (`derived.py:90`), average daily value
  over 30 days (`universe.py:42-47`), and a sector's summed value traded (`sectors.py:93`).
  `emit.py:229` filters on the second and `:256` ranks on the first, two lines apart.
  **Unresolved.**

- **"stock" is used for both Listing and Common stock** throughout the codebase, including in
  `universe.common_stocks` (correct) and `Session.stocks` (correct) but also in variable names
  covering all Listings. Resolved above: **Listing** is the general term.
