# Multi-location research log

Tracks the per-entry research into whether each mappable resource has **multiple physical sites**, so the work is auditable and continuable (by another agent or a manual reviewer).

## Model

Every mappable entry (diagnosis, schools, development, communities, equipment) can carry:

- `locations[]` — **additional** physical sites beyond the primary (top-level `city`/`address`/`lat`/`lng`). Each: `label?`, `city`, `address?`, `lat?`, `lng?`, `contact?`, `priceNotes?`, `note?`.
- `locationStatus` — the research outcome, one of:
  - **`multiple-confirmed`** — extra site(s) found and verified; they're in `locations[]`.
  - **`single-confirmed`** — verified this is the only public site for this service.
  - **`unsure`** — couldn't determine (site down, ambiguous, only third-party claims).

An entry with **no** `locationStatus` has **not been researched yet** for multiple locations.

## Method

Per the project honesty rules (`docs/curation-methodology.md`):

- Only sites operated **by the same institution** count — not partners it refers to, not a same-named institution in another town. (This is the [MARS lesson](#mars-lesson).)
- Verify on the institution's **own** site (kapcsolat / elérhetőségek / telephelyek) or an authoritative registry (KIR for schools). Third-party directories are a lead, not proof.
- New site addresses are geocoded via Nominatim (1 req/s, honest UA), same as primary addresses.
- A hospital/clinic is **one** site even if it spans several buildings; only a genuinely separate address where the *same ADHD/autism service* is also delivered counts as an extra location.

<a name="mars-lesson"></a>
## MARS lesson (why this log exists)

The task was prompted by "MARS Alapítvány is in many places." Investigation showed **MARS Autistákért Alapítvány** is a Budapest advocacy/info foundation (nem diagnosztizál); its "diagnózisközpont kereső" is a **national referral directory of 24 independent providers**, not MARS branches. The two former `mars-alapitvany-*` entries were mis-attributed and were re-mapped to their true institutions:

- `mars-alapitvany-salgotarjan` → **Nógrád Vármegyei Szent Lázár Kórház** (`szent-lazar-korhaz-salgotarjan`)
- `mars-alapitvany-gardony` → **Tóparti Pedagógiai Szakszolgálat és Szakambulancia** (`toparti-szakszolgalat-gardony`)

## Status by entry

### diagnosis (28) — researched 2026-07-06 (all)

**Multiple-confirmed (5):**

| Slug | Extra site(s) | Source |
|---|---|---|
| cerebrum-neuropszichologia | Cerebrum Kecskemét, Vízmű u. 104. | neuro-pszichologia.hu/kecskemet |
| orenda-pszichologiai-kozpont | Gyermek: 1122 Bp, Krisztina krt. 19. (primary = felnőtt, Attila út 129.) | orendaterapia.hu/kapcsolat |
| panorama-poliklinika | Buda: 1126 Bp, Derkovits u. 7. (primary = Pest, Ilosvai Selymes u. 81.) | panoramaklinika.hu/…/kapcsolat |
| semmelweis-adhd-ambulancia | Felnőtt ADHD szakambulancia: 1092 Bp, Márton u. 39. (HQ = Balassa u. 6.) | semmelweis.hu/pszichiatria/…/adhd-ambulancia |
| sofi-gyula-eger | 1015 Bp, Csalogány u. 44. + 1181 Bp, Sina Simon sétány 8. (primary = Eger) | drsofigyula.hu |

**Unsure (1):**

| Slug | Why | 
|---|---|
| bacs-kiskun-kecskemet | County hospital has Kalocsa + Kiskunfélegyháza campuses, but could not confirm the child-psychiatry ambulancia runs there (kmk.hu 503 at check-time). Left `unsure` rather than count unverified sites. |

**Single-confirmed (22):** adhd-kozpont, autizmus-alapitvany-ambulancia, bethesda-adhd-ambulancia, csolnoky-veszprem, debrecen-autizmus-ambulancia, hetenyi-szolnok, istenhegyi-elmenyklinika, josa-andras-nyiregyhaza, kaposi-mor-korhaz, leda-medical-zalaegerszeg, nagykallo-adhd-szakambulancia, neuroharmonia-szekszard, nyiro-gyula-opai, peterfy-adhd-ambulancia, petz-aladar-gyor, pszichologusunk-szekesfehervar, pte-gyermekklinika, szte-adhd-szakambulancia, velkey-gyek-miskolc, vadaskert-alapitvany, szent-lazar-korhaz-salgotarjan (re-mapped), toparti-szakszolgalat-gardony (re-mapped).

**Address corrections made during this pass** (verified against each institution's own site — the diagnostic service runs at a different address than was on file):

- `debrecen-autizmus-ambulancia`: 4026 Bethlen u. 11-17. → **4031 Debrecen, Bartók Béla út 3.** (Kenézy campus, Gyermekpszichiátria I. épület).
- `peterfy-adhd-ambulancia`: 1076 Péterfy Sándor u. 8-20. → **1074 Budapest, Alsó erdősor utca 7.** (the ADHD ambulancia's actual telephely).

**Flags for later review (not changed):**

- `autizmus-alapitvany-ambulancia`: the diagnostic Ambulancia may be at **Delej u. 21**, not the on-file 24-26 (which is the foundation's main office/school). Same block, ~50 m; left as-is pending confirmation.
- `nagykallo-adhd-szakambulancia`: the source URL `adhdterapia.hu/vizsgalatihelyszinek` is a **referral directory** of independent hospitals (the MARS pattern again), not branches — correctly *not* attributed as extra sites.

### schools (23)

_pending_

### development (15)

_pending_

### communities (8)

_pending_
