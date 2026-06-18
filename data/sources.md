# Source catalogue

This file lists the public sources Nirman Darpan draws from for each authority level. It's the working list the scheduled job and any future scrapers should target. Add or remove sources here, then update `scripts/sync.mjs` if behaviour needs to follow.

> **Note on confidence.** Domains listed here have been chosen because they're the official or widely-known publishing surface for the relevant authority. If a feed/page format changes, fix it here first and reflect downstream.

## Centre-level (Government of India)

| Authority | Surface | Use for |
|---|---|---|
| NHAI — National Highways Authority of India | `nhai.gov.in` | Highway projects, tender awards, package status, viaducts/tunnels |
| MoRTH — Ministry of Road Transport & Highways | `morth.nic.in` | Sanctioned outlays, ministry announcements |
| BRO — Border Roads Organisation | `bro.gov.in` | Border roads, Atal Tunnel, strategic highways |
| AAI — Airports Authority of India | `aai.aero` | Airport runway / terminal projects |
| Indian Railways / RVNL | `indianrailways.gov.in` · `rvnl.org` | Rail-line construction, station redev |
| SJVN Ltd (PSU) | `sjvn.nic.in` | Hydro projects on the Sutlej |
| HPPCL — HP Power Corp (joint) | `hppcl.in` | Renukaji, state-funded hydro |
| MoHFW — PMSSY | `pmssy.mohfw.gov.in` | AIIMS Bilaspur and related health infra |
| Ministry of Education | `education.gov.in` | IIT / IIM / centrally-funded campuses |
| Jal Shakti Ministry | `jaljeevanmission.gov.in` | Jal Jeevan Mission dashboard for HP |
| MoHUA Smart Cities Mission | `smartcities.gov.in` | Shimla Smart City |
| BBMB | `bbmb.gov.in` | Pong / Bhakra-related works |

## State-level (Government of Himachal Pradesh)

| Authority | Surface | Use for |
|---|---|---|
| HP State Portal | `himachal.nic.in` | Cabinet decisions, scheme announcements |
| HP Public Works Department | `hppwd.hp.gov.in` | Roads, bridges, flood restoration |
| HP Jal Shakti Vibhag (IPH) | `hpiph.hp.gov.in` | Water-supply, sewerage, JJM execution |
| HPSDMA — Disaster Management | `hpsdma.nic.in` | 2023 floods, monsoon damage, restoration |
| Shimla Jal Prabandhan Nigam | `sjpnl.in` | Shimla Water Augmentation |
| HP Education Department | `education.hp.gov.in` | Samagra Shiksha / school modernisation |
| HP Tourism Department | `himachaltourism.gov.in` | Tourism infra, Mandi greenfield airport stake |
| HPRTC | `hrtchp.com` | Bus stand redevelopment & transport |

## District-level

| Authority | Surface | Use for |
|---|---|---|
| Office of District Commissioner (per district) | `hp<district>.nic.in` family | Acquisition notices, local works |
| Municipal Councils (Solan, Mandi, etc.) | typically `mcsolan.org`, `mcshimla.in` etc. | Bus stands, town works, sewerage |
| Panchayati Raj — PMGSY OMMAS | `omms.nic.in` | Rural link-road status by district |

## Press (independent verification)

- The Tribune — `tribuneindia.com` (Shimla edition is the deepest on HP)
- Hindustan Times — `hindustantimes.com`
- The Indian Express — `indianexpress.com`
- The Hindu — `thehindu.com`
- Divya Himachal — `divyahimachal.com`
- Amar Ujala — `amarujala.com`

## Verified social handles to follow

- `@NHAI_Official`, `@MORTHIndia`, `@official_dgbr`
- `@JalShaktiHP`, `@HPPWDOfficial`, `@HPSDMA`
- `@HP_Tourism`, `@SmartShimla`, `@SJVN_Official`
- District handles where verified (`@KangraUpdates`, `@SolanMC`, etc.)

---

**Adding a source:** open a PR adjusting this file. The scheduled job will pick it up on the next Mon/Thu run after the corresponding fetch is wired in `scripts/sync.mjs`.
