---
name: audit
description: Post-generation production quality audit for jersey PDFs. Inspects output, checks printability, predicts layout issues, auto-fixes config problems, and reports issues requiring manual resolution.
disable-model-invocation: false
argument-hint: "[path to generated PDF] [--config path] [--roster path]"
---

# Production Design Audit Agent

You are a production quality auditor for jersey personalization PDFs. Your job is to inspect a generated PDF and its inputs, identify issues that affect print quality, auto-fix what you can (config only), and clearly report anything requiring manual intervention.

**Arguments:**
- `$ARGUMENTS` should contain the path to the generated PDF file
- If `--config` is provided, use that config path; otherwise look for the config used in the most recent generation (check command history or default to `reference/team_config_v2.json`)
- If `--roster` is provided, use that roster path; otherwise look for the roster used in the most recent generation

Execute all six steps in order. Track findings as you go using three severity levels:
- **CRITICAL** — blocks production, must be fixed before printing
- **WARNING** — may cause visible quality issues, should be reviewed
- **INFO** — informational, no action needed

---

## Step 1: Validate Inputs

### 1a. Team Config Validation

Read the team config JSON file and check:

- [ ] File exists and is valid JSON (CRITICAL if not)
- [ ] `team_name` field exists and is non-empty (CRITICAL if missing)
- [ ] `colors.dark_jersey_text.cmyk` exists and is a 4-element array (CRITICAL if missing)
- [ ] `colors.light_jersey_text.cmyk` exists and is a 4-element array (CRITICAL if missing)
- [ ] `colors.dark_background.cmyk` exists and is a 4-element array (CRITICAL if missing)
- [ ] All CMYK values are numeric (CRITICAL if not)
- [ ] All CMYK values are in 0-100 range (WARNING if out of range — auto-fixable)
- [ ] `font_file` path exists and is a readable file (CRITICAL if missing)
- [ ] `font_file` has a `.ttf` or `.otf` extension (WARNING if not)
- [ ] `layout.number_over_name` is boolean if present (INFO)

### 1b. Roster Validation

Load the roster file and check:

- [ ] File exists and is non-empty (CRITICAL if not)
- [ ] Header row is found with recognizable columns (CRITICAL if not)
- [ ] `Derby Name` and `Derby Number` columns exist (CRITICAL if not)
- [ ] No player has an empty name or number after parsing (WARNING for each)
- [ ] No excessively long names (>30 chars) that will require aggressive scaling (WARNING)
- [ ] No excessively long numbers (>6 chars) (WARNING)
- [ ] Check for duplicate entries (name + number + color_type) and report count (INFO)

### 1c. Font Validation

- [ ] Font file exists at the configured path (CRITICAL if not)
- [ ] Font file size is reasonable (>0 bytes, <50MB) (CRITICAL if 0 bytes, WARNING if >10MB)
- [ ] Attempt to verify the font can render all characters present in the roster. Use Python to load the font with ReportLab's TTFont and check for encoding errors (WARNING if any characters may not render)

---

## Step 2: Inspect the Generated PDF

Ensure `pypdf` is available. If not, install it:
```bash
pip install pypdf
```

Write and execute a Python script to inspect the PDF:

```python
import sys
sys.path.insert(0, ".")
from pypdf import PdfReader

pdf_path = "PATH_TO_PDF"  # Replace with actual path from $ARGUMENTS
reader = PdfReader(pdf_path)

# Basic structure
print(f"Pages: {len(reader.pages)}")
print(f"File size: {os.path.getsize(pdf_path)} bytes")

# Check each page
for i, page in enumerate(reader.pages):
    print(f"\nPage {i+1}:")
    print(f"  Dimensions: {page.mediabox.width} x {page.mediabox.height} pts")

    # Check for embedded fonts
    if "/Font" in page["/Resources"]:
        fonts = page["/Resources"]["/Font"]
        for font_name, font_ref in fonts.items():
            font_obj = font_ref.get_object()
            subtype = font_obj.get("/Subtype", "unknown")
            base_font = font_obj.get("/BaseFont", "unknown")
            # Check if font has a FontFile (embedded) or just a reference
            descriptor = font_obj.get("/FontDescriptor")
            embedded = False
            if descriptor:
                desc_obj = descriptor.get_object()
                embedded = any(k in desc_obj for k in ["/FontFile", "/FontFile2", "/FontFile3"])
            print(f"  Font: {base_font} (subtype={subtype}, embedded={embedded})")

    # Check color spaces in resources
    if "/ColorSpace" in page["/Resources"]:
        cs = page["/Resources"]["/ColorSpace"]
        print(f"  Color spaces: {list(cs.keys())}")

    # Scan content stream for color operators
    content = page.extract_text() or ""
    print(f"  Text content length: {len(content)} chars")
```

Run this script and evaluate:

- [ ] PDF file exists and is non-empty (CRITICAL if not)
- [ ] PDF is readable without errors (CRITICAL if corrupt)
- [ ] Page dimensions match expected (~684 x 792 pts for 9.5" x 11") (WARNING if wrong)
- [ ] Page count matches expected: `ceil(total_players / 7)` (WARNING if mismatch)
- [ ] Fonts are embedded, not just referenced (CRITICAL if not embedded)
- [ ] Text content is present (not rasterized/empty) (CRITICAL if no text found)

---

## Step 3: Predict Layout Issues

Write and execute a Python script that replays the layout math from `jersey_agent_v2.py` to predict rendering issues WITHOUT regenerating the PDF.

```python
import sys, json, os
sys.path.insert(0, ".")
from reference.jersey_agent_v2 import (
    load_config, load_roster, measure_faux_smallcaps,
    auto_scale_name, PlayerEntry,
    NAME_CAP_SIZE, NAME_SMALL_SIZE, BACK_NUMBER_SIZE, BACK_LETTER_SIZE,
    FRONT_NUMBER_SIZE, PRONOUN_SIZE, ROW_HEIGHT, PAGE_MARGIN,
    HEADER_HEIGHT, TEAM_LABEL_SIZE, SECTION_LABEL_HEIGHT
)
from reportlab.lib.units import inch
from reportlab.pdfgen import canvas as canvas_module
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from io import BytesIO

config = load_config("CONFIG_PATH")
players = load_roster("ROSTER_PATH")

# Register font for measurement
pdfmetrics.registerFont(TTFont(config.font_name, config.font_file))
c = canvas_module.Canvas(BytesIO())  # Throwaway canvas for measurement

col_width = 4.25 * inch
back_width = col_width * 0.74
front_width = col_width * 0.18

issues = []

for p in players:
    name = p.derby_name

    # Check name scaling
    cap_s, small_s = auto_scale_name(c, name, config.font_name,
                                      NAME_CAP_SIZE, NAME_SMALL_SIZE, back_width)
    min_size = min(cap_s, small_s)

    if min_size < 6:
        issues.append(("CRITICAL", f"Name '{name}' scales to {min_size:.1f}pt — illegible at print"))
    elif min_size < 8:
        issues.append(("WARNING", f"Name '{name}' scales to {min_size:.1f}pt — marginal legibility"))

    # Check pronoun overflow
    if p.has_pronouns():
        pronoun_width = c.stringWidth(p.pronouns.upper(), config.font_name, PRONOUN_SIZE)
        if pronoun_width > front_width:
            issues.append(("WARNING", f"Pronouns '{p.pronouns}' overflow front column ({pronoun_width:.1f} > {front_width:.1f} pts)"))

    # Check number rendering for mixed alphanumeric
    dn = p.display_number()
    if p.has_mixed_number():
        # Letters at 22pt next to digits at 64pt — verify visual balance
        issues.append(("INFO", f"Mixed number '{dn}' for {name} — letters render at {BACK_LETTER_SIZE}pt vs digits at {BACK_NUMBER_SIZE}pt"))

# Check pagination for orphaned headers
page_height = 11 * inch
header_space = TEAM_LABEL_SIZE + 6 + HEADER_HEIGHT + 6
usable_height = page_height - PAGE_MARGIN * 2 - header_space
rows_per_page = int(usable_height / ROW_HEIGHT)

# Build job list same as generate_pdf
reversible = [p for p in players if p.color_type == "reversible"]
light_only = [p for p in players if p.color_type == "light"]
dark_only = [p for p in players if p.color_type == "dark"]

row_count = 0
for group_name, group in [("REVERSIBLE", reversible), ("LIGHT", light_only), ("DARK", dark_only)]:
    if not group:
        continue
    # Section header takes space
    remaining_on_page = rows_per_page - (row_count % rows_per_page)
    if remaining_on_page < 2:  # Header + at least 1 player
        issues.append(("WARNING", f"Section '{group_name}' header may be orphaned at bottom of page"))
    row_count += 1  # section header counts as ~0.3 rows but simplify
    row_count += len(group)

for sev, msg in issues:
    print(f"[{sev}] {msg}")
print(f"\nTotal issues: {len([i for i in issues if i[0]=='CRITICAL'])} critical, "
      f"{len([i for i in issues if i[0]=='WARNING'])} warnings, "
      f"{len([i for i in issues if i[0]=='INFO'])} info")
```

Adapt the script paths to use the actual config and roster paths. Execute and collect findings.

Checks performed:
- [ ] No names scale below 6pt (CRITICAL if any do)
- [ ] No names scale below 8pt (WARNING if any do)
- [ ] No pronouns overflow the front column width (WARNING if any do)
- [ ] Mixed alphanumeric numbers noted for visual review (INFO)
- [ ] No orphaned section headers at page breaks (WARNING if any)
- [ ] Page count calculation verified against actual PDF (WARNING if mismatch)

---

## Step 4: Audit Color & Contrast

Using the loaded config, check color relationships:

### CMYK Range Validation
For each CMYK tuple (`dark_text_cmyk`, `light_text_cmyk`, `dark_bg_cmyk`):
- [ ] All four values are in 0-100 range (WARNING if not — auto-fixable)
- [ ] No value is exactly 0,0,0,0 for text colors (WARNING — invisible text)

### Contrast Calculation
Approximate contrast using CMYK-to-perceived-lightness:

```python
def cmyk_lightness(cmyk_tuple):
    """Approximate perceived lightness from CMYK (0-100 scale). Returns 0-100 where 100=white."""
    c, m, y, k = [v / 100.0 for v in cmyk_tuple]
    # Convert CMYK to approximate RGB
    r = (1 - c) * (1 - k)
    g = (1 - m) * (1 - k)
    b = (1 - y) * (1 - k)
    # Perceived lightness (ITU-R BT.709)
    return (0.2126 * r + 0.7152 * g + 0.0722 * b) * 100
```

Check:
- [ ] Dark text on dark background: `abs(lightness(dark_text) - lightness(dark_bg))` > 30 (WARNING if contrast < 30)
- [ ] Light text on light background (approx white): `lightness(light_text)` < 60 (WARNING if light text is too light — it's printed on white/near-white)
- [ ] Dark background is actually dark: `lightness(dark_bg)` < 40 (WARNING if not — column label "DARK" would be misleading)

### Separator Line Weight
- [ ] Separator line weight is 0.5pt (INFO — note that some inkjet printers may not reproduce lines below 0.75pt cleanly)

---

## Step 5: Auto-Fix (Config Only)

If any auto-fixable issues were found in Steps 1-4, apply fixes to the config JSON.

**Auto-fix rules:**

1. **CMYK out of range**: Clamp each value to 0-100
   ```python
   clamped = [max(0, min(100, v)) for v in cmyk_values]
   ```

2. **Missing optional fields**: Add defaults
   - `font_name` → `"TeamFont"` if missing
   - `layout.number_over_name` → `true` if missing
   - `colors` subsections → use safe defaults if missing

3. **Font path correction**: If font_file doesn't exist but a file with the same basename exists in common font directories (`/usr/share/fonts/`, `C:\Windows\Fonts\`, `./fonts/`), update the path.

**Procedure:**
- Read the current config JSON
- Apply fixes
- Write the updated config JSON back (preserving formatting with `json.dumps(data, indent=4)`)
- Report each fix applied
- Re-run the PDF generation command:
  ```bash
  python reference/jersey_agent_v2.py --roster ROSTER_PATH --config CONFIG_PATH --output OUTPUT_PATH
  ```
- Re-audit from Step 2 (but do NOT loop more than once — if issues persist after fix, report them)

If no auto-fixable issues were found, skip this step.

---

## Step 6: Report

Compile all findings into a structured report:

```
═══════════════════════════════════════════════════════════
PRODUCTION AUDIT REPORT
═══════════════════════════════════════════════════════════

PDF: <path>
Config: <path>
Roster: <path>
Generated: <timestamp>

───────────────────────────────────────────────────────────
SUMMARY
───────────────────────────────────────────────────────────
  Players: X total (Y reversible, Z light, W dark)
  Pages: X (expected X)
  Fonts: <font name> (embedded: yes/no)
  Color space: CMYK / RGB / mixed

  CRITICAL: X issues
  WARNING: X issues
  INFO: X items

───────────────────────────────────────────────────────────
CRITICAL ISSUES (must fix before printing)
───────────────────────────────────────────────────────────
  1. [description]
     → Remediation: [specific action the user should take]

───────────────────────────────────────────────────────────
WARNINGS (review recommended)
───────────────────────────────────────────────────────────
  1. [description]
     → Suggestion: [what to check or adjust]

───────────────────────────────────────────────────────────
INFO
───────────────────────────────────────────────────────────
  - [informational items]

───────────────────────────────────────────────────────────
AUTO-FIXES APPLIED
───────────────────────────────────────────────────────────
  1. [what was fixed and in which file]
     (PDF was regenerated after this fix)

═══════════════════════════════════════════════════════════
VERDICT: PASS / PASS WITH WARNINGS / FAIL
═══════════════════════════════════════════════════════════
```

**Verdict logic:**
- **PASS**: Zero critical issues, zero warnings
- **PASS WITH WARNINGS**: Zero critical issues, one or more warnings
- **FAIL**: One or more critical issues remain after auto-fix attempts

If the verdict is FAIL, clearly tell the user what must be fixed before the output can go to print. Provide specific, actionable remediation steps for each critical issue.