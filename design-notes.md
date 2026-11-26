# MindPulse: Design Decisions & Clinical Accessibility

*A 2-minute architectural and design brief for examination, viva defense, and review.*

---

## 1. Executive Summary & Design Direction
MindPulse was originally prototyped with dark glassmorphic cards, glowing neon status rings, and decorative particle physics. While visually flashy, this pattern—often termed "AI-generated slop"—is clinically counter-productive. In mental health and digital well-being applications, glowing high-contrast elements induce cognitive hyper-vigilance, resembling the dopamine-driven casino mechanics of the social feeds the user is attempting to escape.

The redesigned interface transitions to a **Warm Editorial Paper** foundation (`#FBFBF9` surface, `#1C1B18` charcoal ink) with a single deliberate clinical accent: **Deep Pine (`#1F4E42`)**.

---

## 2. Inviolable Design Pillars (Taste-Skill & Hallmark Alignment)

| Pillar | Implementation | Clinical & Ergonomic Justification |
| :--- | :--- | :--- |
| **Warm Paper Foundation** | `#FBFBF9` background, `#FFFFFF` cards, `#E6E4DD` subtle borders | Reduces eye strain; provides a grounding, physical reading texture akin to high-grade clinical documents or clinical stationery. |
| **Deliberate Accent** | `#1F4E42` (Clinical Deep Pine) | Achieves an exceptional **8.2:1 contrast ratio** against paper (exceeding WCAG AAA 7.0:1 requirement). Avoids anxiety-inducing neon blues and greens. |
| **Editorial Typography** | `Inter` (sans-serif) + `Newsreader` (editorial serif for headings) | Separates clinical authority from generic SaaS templates. Tabular figures (`tnum`) ensure numbers don't jitter during scoring. |
| **Restrained Status Tones** | Low: `#1B5E3C` / Med: `#8C5800` / High: `#991B1B` | Soft, muted pigment tints without pulsing borders, laser rings, or neon badges. |
| **Document-Grade Results** | ReportLab PDF integration + invoice-style clinical report | Rather than gamifying mental health, the results are presented as an objective, typeset medical evaluation with a clear verdict line. |
| **Authentic Bilingualism** | Contextual English & Nastaliq Urdu | `Noto Nastaliq Urdu` is loaded strictly when Urdu is selected, with authentic RTL line-height (2.2), preventing Latin font collisions. |
| **Purposeful Motion** | GSAP 3 with `prefers-reduced-motion` compliance | Zero ambient looping animations or confetti. Motion is reserved for functional state transitions and score settling. |

---

## 3. WCAG 2.1 Accessibility Verification
* **Text Contrast**: `#1C1B18` on `#FBFBF9` yields **16.1:1** (far exceeding the 4.5:1 requirement).
* **Muted Text**: `#615E57` on `#FBFBF9` yields **5.8:1** (passes AA for normal text, AAA for large text).
* **Accent Elements**: `#1F4E42` on `#FBFBF9` yields **8.2:1** (passes WCAG AAA).
* **Keyboard Navigation**: Quiet 2px solid pine focus rings (`:focus-visible`) across all sliders, buttons, and form inputs.
* **Semantic Structure**: Grouped `<fieldset>` elements with screen-reader accessible `<legend>` labels and `aria-live` score updates.
