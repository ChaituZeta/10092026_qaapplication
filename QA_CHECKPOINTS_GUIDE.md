# Enterprise SFMC eDM QA Checkpoints Stage-Wise Classification Guide

This guide organizes all **22 eDM QA Checkpoints** into logical QA execution stages, indicating whether each item can be **Automated**, **Semi-Automated**, or **Manual Verification**, along with concrete recommendations for implementation in the platform.

---

## Stage 1: Link & Tracking Validation (Automated / Semi-Automated)
*Focus: URL structure, tracking codes, AMPscript dynamic variables, and mandatory HTML tags.*

| # | Checkpoint Description | Type | Automation Status | Implementation Recommendation |
|---|------------------------|------|-------------------|--------------------------------|
| 1 | **UTM & SFMC Tracking Parameters** | Default / All URLs | **Automated** | Validate presence of `utm_source`, `utm_medium`, `utm_campaign`, `et_rid`, `et_cid`, `utm_id`, `jumpid`, `att1`, `hid`. |
| 2 | **GA Tracking Parameters** | Default / All URLs | **Automated** | Scan all template `<a>` hrefs to ensure Google Analytics `utm_*` tags are appended correctly. |
| 3 | **URL Cleanup (`%20` Spaces, Typos, Misplaced Store Place)** | Code Quality | **Automated** | Regex scan for unencoded spaces `%20`, double `hh` (e.g., `hhttps://`), and misplaced Store Place text inside hrefs. |
| 4 | **Anchor Tags (`#`) Positioned After Tracking** | Syntax / Tracking | **Automated** | Check that hash fragments `#laptop` sit at the very end of URLs, after `&%%=v(@tracking)=%%`. |
| 5 | **Alt & Alias Tags Enforcement** | Code Quality | **Automated** | Verify mandatory `alias` tags on all clickable links (e.g., `title_Image`, `title_CTA`). Ensure `alt` tags are present or blank per rules (Hero logo, Footer, Store Benefits). |
| 6 | **Mandatory HP Logo Verification** | Asset Integrity | **Automated** | Confirm the primary logo points to `https://image.hpnews.hp.com/lib/fe8f1573726d077475/m/1/948fb445-19d4-449e-af48-6f96388fe25b.png`. |
| 7 | **Clickable Phone Numbers (`tel:`)** | Interactive | **Automated** | Check if phone numbers use `tel:1800XXXX` format with corresponding AMPscript formatting. |
| 8 | **Unsubscribe Link Verification** | Compliance | **Semi-Automated** | Verify at least 2 functional unsubscribe links exist in the footer template and point to valid preferences centers. |

---

## Stage 2: Content, Typography & Brief Matching (Semi-Automated)
*Focus: Text accuracy, pricing integrity, legal compliance, and spelling.*

| # | Checkpoint Description | Type | Automation Status | Implementation Recommendation |
|---|------------------------|------|-------------------|--------------------------------|
| 9 | **Content Text vs Client Brief / Translation Doc** | Copy & Text | **Semi-Automated** | Compare eDM HTML text content against client brief / translation document strings. |
| 10 | **Product Prices (eDM vs Landing Page)** | Pricing | **Semi-Automated** | Extract price tags in eDM (e.g., `$1,299`) and cross-check against target landing page DOM prices. |
| 11 | **Terms & Conditions (T&C) Offer Dates** | Legal / Promo | **Semi-Automated** | Scan T&C text in footer for offer start/end dates and verify alignment with landing page offer dates. |
| 12 | **Superscript (`<sup>`) Tag Validation** | Formatting | **Automated** | Ensure all ASCII legal symbols (`©`, `®`, `™`, `*`) are wrapped inside `<sup>` tags (e.g., `<sup>©</sup>`). |
| 13 | **ASCII Characters Rendering Across Clients** | Rendering | **Automated** | Verify ASCII character encoding across Web and Outlook HTML parsers. |
| 14 | **English Spelling, Grammar & Widow Words** | Copy Quality | **Automated** | Run automated dictionary spellcheck scanner across all body text blocks to flag typos and isolated widow words. |

---

## Stage 3: Design, Visual & Layout Accuracy (Figma & Split-Screen ViewOnline)
*Focus: Visual fidelity, responsive layouts, color accuracy, and email rendering.*

| # | Checkpoint Description | Type | Automation Status | Implementation Recommendation |
|---|------------------------|------|-------------------|--------------------------------|
| 15 | **Split-Screen Side-by-Side Preview (Figma vs ViewOnline)** | Visual QA | **Interactive UI** | Side-by-side iframe workspace displaying live eDM `viewonline` link next to Figma prototype iframe/image. |
| 16 | **Background Color Consistency vs Figma** | Styling | **Semi-Automated** | Extract background hex codes (`#FFFFFF`, `#F4F4F4`) from eDM HTML and compare with Figma style tokens. |
| 17 | **Image Rendering & Duplicate Image Prevention** | Visual QA | **Automated** | Ensure no duplicate image source URLs (`src`) exist in the template and all images render properly. |
| 18 | **Mobile Image Alignment & Full-Width Aspect Ratio** | Responsive | **Manual / Visual** | Inspect mobile view rendering in Litmus / preview frame to ensure images scale full-width. |
| 19 | **Font Sizes & Typography Hierarchy vs Figma** | Typography | **Semi-Automated** | Inspect `font-size` CSS rules for Titles, Subtitles, Descriptions, and Prices against Figma spec. |
| 20 | **Litmus & Group Email Testing (Dark & Light Mode)** | Multi-Client | **Manual Review** | Open Litmus preview links to verify rendering across Outlook, Gmail, Apple Mail, Dark Mode, and Light Mode. |

---

## Stage 4: Landing Page, Stock & Voucher / AMPscript Logic (Interactive)
*Focus: Live promotional mechanics, stock status, and voucher code execution.*

| # | Checkpoint Description | Type | Automation Status | Implementation Recommendation |
|---|------------------------|------|-------------------|--------------------------------|
| 21 | **Landing Page Stock Availability (No Out of Stock)** | Stock Check | **Automated** | Perform HTTP HEAD / GET checks on product landing page URLs to detect "Out of Stock" or "OOS" badges. |
| 22 | **Voucher / Coupon Code Validation & AMPscript Logic** | Voucher / Cart | **Semi-Automated** | Verify coupon codes (e.g. `PAVLOVA`) apply cleanly on cart landing pages and match AMPscript variables (`SET @vouchersent = "..."`, `@vouchersent_2`, `@vouchersent_3`). |

---

## Recommended QA Stage Progression Workflow

```text
[ Stage 1: Automated Link & Tracking Scan ]
   │  ├── Check UTMs, GA, Anchor Tags (#), Alt/Alias, Phone (tel:), HP Logo
   ▼
[ Stage 2: Content & Copy Analysis ]
   │  ├── Spellcheck, T&C Dates, Superscript Tags (<sup>©</sup>), Pricing vs Brief
   ▼
[ Stage 3: Visual Figma vs ViewOnline Split-Screen ]
   │  ├── Compare Figma Design Side-by-Side with Live Render
   │  └── Verify Litmus Dark/Light Mode, Font Sizes & Background Colors
   ▼
[ Stage 4: Landing Page & Voucher Verification ]
   │  ├── Check Out-of-Stock (OOS) status on product pages
   │  └── Test AMPscript Vouchers (@vouchersent_1, 2, 3) & Cart Promo Codes
```
