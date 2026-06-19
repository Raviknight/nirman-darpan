# Outreach kit — getting Nirman Darpan in front of people

Everything in this file is ready to copy-paste. Steps marked **(I'll wire)** mean you take a small action, paste the result back into a chat with Claude, and the code change ships.

The site lives at **https://raviknight.github.io/nirman-darpan/** — that's the URL to share in every channel below.

---

## 1. Google Search Console (15 minutes, do this first)

This is what tells Google your site exists. Without it, organic reach stays near zero.

1. Open <https://search.google.com/search-console> in the same Google account you'd be okay being publicly associated with the site.
2. **Add property → URL prefix** → paste `https://raviknight.github.io/nirman-darpan/` → Continue.
3. Choose **HTML tag** verification method.
4. Google shows a line like:
   ```
   <meta name="google-site-verification" content="ABC123longstringXYZ" />
   ```
5. **(I'll wire)** Paste that exact line back to me in chat — I'll add it to `index.html`, commit, push. Verification then goes from pending → verified in ~30 seconds.
6. Once verified, in the same Search Console interface: **Sitemaps → add new sitemap** → enter `sitemap.xml` → Submit.
7. **Bing too:** <https://www.bing.com/webmasters>. Same flow; or click "Import from Search Console" which copies the verification + sitemap over in one shot. Bing Webmaster also gives Yahoo + DuckDuckGo coverage.

After this: search engines start indexing all 32 projects over the next 1–2 weeks.

---

## 2. Press pitch (copy-paste, send today)

The Tribune Shimla, Hindustan Times Shimla, Divya Himachal and Amar Ujala HP all publish civic-transparency stories regularly — they want this. Send one personalised email per outlet (don't BCC; reporters dislike mass mail).

### Verified contact addresses

| Outlet | Email | Note |
|---|---|---|
| The Tribune (Chandigarh / Shimla bureau) | `letters@tribunemail.com` *and* `shimlanews@tribunemail.com` | Letters desk for op-ed leads; Shimla bureau for reportage. Send to both. |
| Hindustan Times (Shimla) | `htshimla@hindustantimes.com` | Local bureau. |
| The Indian Express (Chandigarh edition covers HP) | `chandigarh@expressindia.com` | |
| The Hindu (national desk — they cover hill-state transparency) | `letters@thehindu.com` | |
| Divya Himachal | `editor@divyahimachal.com` | Hindi readership, very strong in HP. |
| Amar Ujala (HP edition) | `editor@amarujala.com` | Subject line in Hindi gets opened faster. |

> **Verify the address before sending.** Newsroom emails change. If a send bounces, check the outlet's "Contact us" page for the current bureau address.

### Draft email — English version

> **Subject:** An independent, citation-backed tracker for Himachal's ₹86,500-crore public-works pipeline

> Dear Editor,
>
> I have built an independent civic-transparency tracker for public works across Himachal Pradesh — **Nirman Darpan / निर्माण दर्पण** (https://raviknight.github.io/nirman-darpan/). It currently covers **32 projects across all 12 districts** — highways, hydropower, hospitals, railways, smart-city schemes — with citation-backed records of status, budgets, contractors, and aggregated press mentions per project.
>
> Public records are scattered across NHAI, HPPCL, SJVN, BRO, HP PWD and PMSSY portals; press follow-up is sporadic; citizens have nowhere to see the full picture for a single project. This site brings it into one place, with two principles:
>
> - Every claim has a source link. Per-project pages already aggregate press coverage from Indian newspapers in English and Hindi.
> - Citizen voices (votes, comments, accountability flags) are verified-identity only — no anonymous astroturfing.
>
> Three projects worth a look as starting points:
>
> - **Atal Tunnel, Rohtang:** https://raviknight.github.io/nirman-darpan/?project=ATAL-TUNNEL
> - **Kiratpur–Nerchowk NH-21:** https://raviknight.github.io/nirman-darpan/?project=KIRATPUR-NCK
> - **AIIMS Bilaspur:** https://raviknight.github.io/nirman-darpan/?project=AIIMS-BLP
>
> The project is independent of government and party-political affiliation. The code, data and methodology are public at <https://github.com/Raviknight/nirman-darpan>.
>
> I'd be happy to walk an interested reporter through the data, explain the methodology, or share specific findings — flagged projects, audit references, anomalies. If a story or column slot is a fit I'm reachable here: `ravikntsh@gmail.com`.
>
> Regards,
>
> Ravi Sharma

### Follow-up sequence

Most newsrooms run on chaos and a reporter who's interested won't necessarily reply on day one. Use this sequence:

**Day 7 — Single-line nudge.** Reply to your own original email, no new subject.

> Hi — quick nudge on the note below. Happy to walk you (or whichever reporter on the HP / state-government beat is the right fit) through any of the 32 projects, or pull together a one-page brief on a specific one. — Ravi

**Day 14 — One concrete hook.** New email, fresh subject, ONE specific story angle from the auto-detected accountability list.

> **Subject:** Audit / accident / delay story specific to <project> — Nirman Darpan data
>
> Hi —
>
> Following up on the launch note last week. One specific hook that may be worth a column or short piece — auto-surfaced from press coverage:
>
> - **<Project name>** ([link to /projects/<id>/])
> - **What the data shows:** <one sentence from the suggestion: "HC-ordered audit uncovered ₹22 cr in irregularities" / "Five tourists injured in highway accident" / etc.>
> - **Source the data points at:** <publisher of the matched article>
>
> Happy to pull the full evidence packet — contractor names, accountable leads, related accountability flags, any RTI references we hold — into a one-page brief by tomorrow if it's a fit.
>
> Regards,
> Ravi · ravikntsh@gmail.com

**Day 21 — Drop.** Do not chase a third time on the same outlet for the same initial pitch. Treat it as a "not now," not a "no." Rotate them back into the next pitch round when you have a meaningfully new story.

### Draft email — Hindi version (for Divya Himachal, Amar Ujala)

> **विषय:** हिमाचल प्रदेश की सार्वजनिक परियोजनाओं का स्वतंत्र निगरानी मंच — Nirman Darpan / निर्माण दर्पण

> आदरणीय संपादक जी,
>
> मैंने हिमाचल प्रदेश की सार्वजनिक निर्माण परियोजनाओं के लिए एक स्वतंत्र पारदर्शिता मंच विकसित किया है — **निर्माण दर्पण** (https://raviknight.github.io/nirman-darpan/)। इसमें **सभी 12 ज़िलों की 32 परियोजनाएँ** शामिल हैं — हाईवे, जलविद्युत, अस्पताल, रेल, स्मार्ट सिटी — और प्रत्येक के लिए स्रोत-सहित स्थिति, बजट, ठेकेदार और प्रेस-कवरेज एक जगह उपलब्ध है।
>
> सरकारी पोर्टल (NHAI, HPPCL, SJVN, BRO, HP PWD आदि) पर जानकारी बिखरी हुई है, और एक नागरिक को किसी एक परियोजना की पूरी तस्वीर नहीं मिल पाती। निर्माण दर्पण इन्हें एक स्थान पर लाता है — हर दावे के साथ स्रोत-लिंक, और नागरिक टिप्पणियाँ केवल सत्यापित निवासियों से।
>
> शुरू करने के लिए तीन प्रोजेक्ट:
>
> - **अटल टनल, रोहतांग:** https://raviknight.github.io/nirman-darpan/?project=ATAL-TUNNEL
> - **किरतपुर–नेरचौक NH-21:** https://raviknight.github.io/nirman-darpan/?project=KIRATPUR-NCK
> - **AIIMS बिलासपुर:** https://raviknight.github.io/nirman-darpan/?project=AIIMS-BLP
>
> यह परियोजना किसी भी सरकार या राजनीतिक दल से स्वतंत्र है। यदि किसी कहानी या स्तंभ के लिए उपयोगी हो, तो मैं डेटा और कार्यप्रणाली पर बात करने को तैयार हूँ।
>
> सादर,
>
> रवि शर्मा · `ravikntsh@gmail.com`

---

## 3. Civil-society organisations

These groups amplify civic-transparency tools to their established networks. One personalised email each.

| Organisation | Why fit | Contact |
|---|---|---|
| **MKSS (Mazdoor Kisan Shakti Sangathan)** | RTI movement origin org; deep network across India | `mkssrajasthan@gmail.com` (Rajasthan-rooted but national reach) |
| **ADR — Association for Democratic Reforms** | Civic-transparency tools, election & governance data | <https://adrindia.org/contact> |
| **Factly Media & Research** | Indian civic data journalism — they regularly cite open civic tools | `info@factly.in` |
| **DAKSH** | Justice / governance data org, Bengaluru — Wikipedia + LinkedIn | <https://dakshindia.org/contact-us/> |
| **Bharat Doot / SaransLogix** | HP-specific civic networks | Search "Bharat Doot Himachal" for current contact |
| **CMS (Centre for Media Studies)** | Civic governance research, Delhi-based | <https://www.cmsindia.org/contact-us> |

### Draft email — civil society

> **Subject:** A data tool for Himachal Pradesh public-works accountability — collaboration?
>
> Dear [Name / Team],
>
> I have built an independent, citation-backed tracker for public-works projects across Himachal Pradesh — Nirman Darpan (<https://raviknight.github.io/nirman-darpan/>). 32 projects, all 12 districts, with per-project press aggregation, audit references and a verified-resident comments / voting layer in active development.
>
> The site is open-source (MIT), data and methodology are public, and the architecture is designed to extend to more states or sectors with minimal change. Schema is OCDS-influenced.
>
> Three asks, any of which would be useful:
>
> 1. Adding Nirman Darpan to your civic-tech directory or "Tools we use" page — driving the right early readership.
> 2. A short post / share through your network — your audience overlaps strongly with ours.
> 3. Feedback on the accountability module's data model — happy to incorporate any standard your team would prefer.
>
> If a video call to walk you through the methodology helps, I'm reachable at `ravikntsh@gmail.com`.
>
> Warmly,
>
> Ravi Sharma · <https://github.com/Raviknight/nirman-darpan>

---

## 4. Wikipedia citation

This is **slow but extraordinarily durable** — Wikipedia citations rank in the top 10 of Google search for years.

### What to add

On the **External links** section of each article, append a bullet:

> * [Nirman Darpan project page on this work](https://raviknight.github.io/nirman-darpan/?project=<PROJECT_ID>) — independent civic tracker; status, budget, sources

Replace `<PROJECT_ID>` with the matching ID from the site (visible on each project card and modal).

### Articles where this fits naturally

| Wikipedia article | Project ID to link to |
|---|---|
| [Atal Tunnel](https://en.wikipedia.org/wiki/Atal_Tunnel) | `ATAL-TUNNEL` |
| [AIIMS Bilaspur](https://en.wikipedia.org/wiki/AIIMS_Bilaspur) | `AIIMS-BLP` |
| [Indian Institute of Technology Mandi](https://en.wikipedia.org/wiki/Indian_Institute_of_Technology_Mandi) | `IIT-MANDI` |
| [Parbati Hydroelectric Project](https://en.wikipedia.org/wiki/Parbati_Hydroelectric_Project) | `PARBATI-2` |
| [Koldam Hydroelectric Power Project](https://en.wikipedia.org/wiki/Koldam_Hydroelectric_Power_Project) | `KOLDAM-HEP` |
| [Renuka Dam](https://en.wikipedia.org/wiki/Renuka_Dam) | `RENUKA-DAM` |
| [Luhri Hydroelectric Project](https://en.wikipedia.org/wiki/Luhri_Hydroelectric_Project) | `LUHRI-1` |
| [Bhanupli–Bilaspur–Beri railway line](https://en.wikipedia.org/wiki/Bhanupali%E2%80%93Bilaspur%E2%80%93Beri_railway_line) | `BHANUPLI-RAIL` |
| [Shinku La Tunnel](https://en.wikipedia.org/wiki/Shinku_La_Tunnel) | `SHINKULA-TUNL` |
| [Kangra Airport](https://en.wikipedia.org/wiki/Kangra_Airport) | `KGR-AIRPORT` |

### How to actually add

1. Make a Wikipedia account (any name; takes 30 seconds) if you don't have one.
2. Open one article above, click **Edit** at the top, scroll to **External links**.
3. Add the bullet from the template above.
4. **Edit summary** field: `Adding independent civic tracker as external link`.
5. Save.

Do **one article a day**. Doing many at once gets flagged as link-spam. Spread it over two weeks.

---

## 5. Custom domain (₹600–1,500 / year, when ready)

A custom domain like `nirmandarpan.in` makes the site shareable, credible and indexable as a serious civic project rather than a hobbyist subpage.

### Quick recipe

1. Buy the domain at **Namecheap** or **BigRock** (cheaper than GoDaddy for `.in`).
2. At the registrar, add these DNS records:
   - `A` → `185.199.108.153`
   - `A` → `185.199.109.153`
   - `A` → `185.199.110.153`
   - `A` → `185.199.111.153`
   - `CNAME` for `www` → `raviknight.github.io`
3. On GitHub: repo → **Settings → Pages → Custom domain** → enter `nirmandarpan.in` → Save. Wait ~5 minutes; GitHub provisions a free SSL cert.
4. **(I'll wire)** Tell me the domain. I add a `CNAME` file to the repo root with that domain name in it, and update `SITE_BASE`, sitemap, OG tags etc. in one commit. Site moves over with zero downtime.

---

## 6. WhatsApp / personal — quick template

For sharing in a HP-civic group or with someone you know:

> Friends — I have built an independent, open-source tracker for public-works projects across Himachal Pradesh. 32 projects, all 12 districts, with citation-backed status, budgets and press coverage. Useful for anyone tracking infrastructure in HP — would love feedback. https://raviknight.github.io/nirman-darpan/

Three taps to forward. The site has share buttons inside each project for sending one specific project to a group.

---

## What I'm waiting on you for, in priority order

1. **Google Search Console verification meta tag** — paste it in chat, I wire and push. Single biggest organic-reach unlock.
2. **Decide on a custom domain name** — once you've bought it, paste the domain to me. I wire it.
3. **Send the press emails** — anything I can do here is already done; only your account / signature can send them.
4. **Pick one Wikipedia article a day for two weeks.**

Everything else (Brevo SMTP, Bing Webmaster, civil-society outreach, social-domain DKIM) is in this doc — work through at your pace.
