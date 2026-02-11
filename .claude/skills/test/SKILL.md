---
name: test
description: Build and execute pytest test cases covering security, functionality, and integration contract verification. Use when you need to generate or run the test suite.
disable-model-invocation: false
argument-hint: "[optional: focus area or file path]"
---

# Test Agent

You are a Python test engineer for the Jersey Production Design project. Your job is to generate comprehensive pytest test cases and execute them. Tests must cover three pillars: **security**, **functionality**, and **integration contract verification**.

If `$ARGUMENTS` is provided, focus testing on that specific area or file. Otherwise, run a full test sweep.

## Project Context

- **Main source**: `reference/jersey_agent_v2.py` — CLI tool that reads roster data (XLSX/CSV) and team config (JSON), generates print-ready vector PDFs via ReportLab.
- **Config schema**: `reference/team_config_v2.json` — defines team name, font, CMYK colors, layout options.
- **Test directory**: `tests/` — all tests go here.
- **Key classes**: `PlayerEntry` (player data), `TeamConfig` (team styling).
- **Key functions**: `parse_color_type`, `parse_pronouns`, `find_column_index`, `parse_roster_rows`, `load_roster_csv`, `load_roster_xlsx`, `load_roster`, `load_config`, `measure_faux_smallcaps`, `auto_scale_name`, `render_faux_smallcaps`, `render_jersey_number`, `draw_player_entry`, `generate_pdf`, `print_qa_report`.

## Step 1: Set Up Test Infrastructure

Create these files if they do not already exist:

### `tests/__init__.py`
Empty file to make tests a package.

### `tests/conftest.py`
Shared fixtures:

```python
import sys
import os
import json
import pytest

# Ensure project root is on sys.path so `reference.jersey_agent_v2` can be imported
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from reference.jersey_agent_v2 import PlayerEntry, TeamConfig

@pytest.fixture
def sample_player():
    return PlayerEntry(
        derby_name="Bruise Lee",
        derby_number="42",
        pronouns="she/her",
        color_type="reversible",
        product_name="Jersey",
        size="M",
    )

@pytest.fixture
def sample_player_no_pronouns():
    return PlayerEntry(
        derby_name="MAXIMUS",
        derby_number="007",
        pronouns=None,
        color_type="dark",
    )

@pytest.fixture
def sample_player_mixed_number():
    return PlayerEntry(
        derby_name="StarCrash",
        derby_number="A42B",
        pronouns="they/them",
        color_type="light",
    )

@pytest.fixture
def sample_config():
    return TeamConfig(
        team_name="Paris Mountain Punishers",
        font_name="Helvetica",
        font_file="",
        dark_text_cmyk=(0, 0, 0, 5),
        light_text_cmyk=(40, 40, 40, 100),
        dark_bg_cmyk=(40, 40, 40, 100),
        number_over_name=True,
    )

@pytest.fixture
def sample_config_json(tmp_path):
    """Write a valid team config JSON and return the path."""
    config = {
        "team_name": "Test Team",
        "font_name": "TestFont",
        "font_file": "test_font.ttf",
        "colors": {
            "dark_jersey_text": {"cmyk": [0, 0, 0, 5]},
            "light_jersey_text": {"cmyk": [40, 40, 40, 100]},
            "dark_background": {"cmyk": [40, 40, 40, 100]},
        },
        "layout": {"number_over_name": True},
    }
    path = tmp_path / "team_config.json"
    path.write_text(json.dumps(config))
    return str(path)

@pytest.fixture
def sample_csv_roster(tmp_path):
    """Write a valid CSV roster and return the path."""
    content = (
        "Derby Name,Derby Number,Pronouns,Color\n"
        "Bruise Lee,42,she/her,Reversible\n"
        "MAXIMUS,007,none,Dark\n"
        "StarCrash,A42B,they/them,Light\n"
    )
    path = tmp_path / "roster.csv"
    path.write_text(content, encoding="utf-8")
    return str(path)

@pytest.fixture
def minimal_csv_roster(tmp_path):
    """CSV with only required columns (name + number)."""
    content = (
        "Name,Number\n"
        "TestPlayer,99\n"
    )
    path = tmp_path / "minimal.csv"
    path.write_text(content, encoding="utf-8")
    return str(path)
```

## Step 2: Security Tests

Create `tests/test_security.py`. These tests verify the application handles adversarial, malformed, and boundary inputs safely.

Test cases to implement:

### Input Sanitization
- **Path traversal in config paths**: Verify `load_config` with paths containing `../` sequences does not silently succeed on unexpected files. Test that it raises appropriate errors for nonexistent paths.
- **Path traversal in roster paths**: Same for `load_roster`.
- **Malicious content in roster fields**: Names/numbers containing shell metacharacters (`; rm -rf /`, `$(command)`, backticks), HTML/script injection (`<script>alert(1)</script>`), and null bytes (`\x00`). Verify these are stored as-is in `PlayerEntry` (no execution) and do not crash the parser.
- **Oversized input fields**: Names and numbers with 10,000+ characters. Verify no memory crash or hang — the function should complete.
- **Unicode edge cases**: Names with RTL characters, zero-width joiners, emoji, combining diacriticals. Verify no crash.

### Config Validation
- **Missing required fields**: Config JSON missing `team_name`, missing `colors`, missing `font_file`. Verify appropriate `KeyError` or `ValueError` raised.
- **Wrong types in config**: CMYK values as strings instead of numbers, negative CMYK values, CMYK values > 100. Verify the code either handles gracefully or raises a clear error.
- **Malformed JSON**: Truncated JSON, JSON with trailing commas, empty file. Verify `json.JSONDecodeError` raised.

### File Handling
- **Nonexistent roster file**: Verify `FileNotFoundError` is raised.
- **Nonexistent config file**: Same.
- **Empty CSV file**: Verify `ValueError("CSV file is empty")` is raised.
- **CSV with no header row**: Verify `ValueError("Could not find header row")` is raised.
- **Binary file passed as CSV**: Pass a file with binary content. Verify it raises an error, not a crash.

## Step 3: Functionality Tests

Create `tests/test_data_models.py`, `tests/test_parsing.py`, and `tests/test_text_rendering.py`.

### `tests/test_data_models.py` — PlayerEntry and TeamConfig

- `display_number()`: normal number, leading asterisk stripped, leading zeros preserved, whitespace stripped
- `has_pronouns()`: with valid pronouns, with None, with empty string, with whitespace-only
- `has_mixed_number()`: digits only, letters only, mixed alphanumeric, empty string
- `has_mixed_case_name()`: ALL CAPS, all lower, Mixed Case, single char
- `TeamConfig.dark_color()`: verify CMYK 0-100 values correctly convert to 0.0-1.0 `CMYKColor`
- `TeamConfig.light_color()`: same
- `TeamConfig.dark_bg()`: same
- Edge: CMYK boundary values (0, 0, 0, 0) and (100, 100, 100, 100)

### `tests/test_parsing.py` — Roster and Config Parsing

- `parse_color_type()`: "Reversible", "LIGHT", "dark", "Light Jersey", unknown value defaults to "reversible"
- `parse_pronouns()`: valid pronouns returned, "none" returns None, "leave blank" returns None, "n/a" returns None, empty string returns None, None returns None
- `find_column_index()`: exact match, partial match, case insensitivity, exclusion works, no match returns None, multiple candidates picks first
- `parse_roster_rows()`:
  - Normal roster with all columns
  - Missing optional columns (no pronouns, no color) use defaults
  - Deduplication: same name+number+color_type appears twice, only first kept
  - Rows with empty name or number are skipped
  - Row with name "none" (case-insensitive) is skipped
- `load_roster_csv()`: valid file parses correctly, header detection works
- `load_config()`:
  - Valid config loads all fields correctly
  - Default values used when optional fields missing (`font_name` defaults to "TeamFont", `number_over_name` defaults to True)
  - Color tuple construction is correct
- `load_roster()`: dispatches `.csv` correctly, dispatches `.xlsx` correctly, rejects `.txt` with `ValueError`

### `tests/test_text_rendering.py` — Text Measurement and Scaling

Use `unittest.mock.MagicMock` to mock `canvas.Canvas` and its `stringWidth` method.

- `measure_faux_smallcaps()`: uppercase chars use cap_size, lowercase chars use small_size, non-alpha uses small_size, total width is sum of individual widths
- `auto_scale_name()`: name fits within max_width returns original sizes, name exceeds max_width returns scaled-down sizes with 5% breathing room
- `render_jersey_number()`: digits use digit_size, letters use letter_size, centering calculation correct when center_width > 0

## Step 4: Integration Contract Tests

Create `tests/test_integration_contracts.py`. These verify that both sides of each integration boundary agree.

### Config JSON <-> load_config()
- Read `reference/team_config_v2.json` and verify every field the code accesses actually exists in the JSON schema.
- Verify `load_config()` output matches expected values from the JSON.
- Verify all CMYK arrays in the config have exactly 4 elements.
- Verify config field names used in code (`data["team_name"]`, `data.get("font_name")`, `colors.get("dark_jersey_text")`, etc.) all correspond to actual keys in the JSON structure.

### Roster Column Headers <-> find_column_index()
- Verify the candidate column names used in `parse_roster_rows()` (`"derby name"`, `"name"`, `"derby number"`, `"number"`, `"pronoun"`, `"color"`, `"product"`, `"size"`) match what `find_column_index()` searches for.
- Create a roster CSV with the exact headers the code expects, parse it, and verify all columns are found.
- Create a roster CSV with alternative headers (`Name` instead of `Derby Name`) and verify it still works via fallback.

### PlayerEntry <-> draw_player_entry()
- Verify every `PlayerEntry` method called in `draw_player_entry()` actually exists and returns the expected type:
  - `player.display_number()` returns str
  - `player.derby_name` is str
  - `player.has_pronouns()` returns bool
  - `player.pronouns` is Optional[str]
- Verify that `color_type` values produced by `parse_color_type()` ("reversible", "light", "dark") match the values checked in `generate_pdf()` for categorization.

### TeamConfig <-> generate_pdf()
- Verify `config.font_name`, `config.font_file`, `config.dark_color()`, `config.light_color()`, `config.dark_bg()`, `config.number_over_name` are all accessed in `generate_pdf()` and return correct types.
- Verify CMYK color conversion round-trip: config JSON values -> TeamConfig tuple -> CMYKColor object has correct component values.

### CLI Arguments <-> main()
- Verify argparse defines `--roster`, `--config`, `--font`, `--output`, `--no-qa` flags.
- Verify required args (`--roster`, `--config`) cause error when missing.

## Step 5: Run Tests

Execute:
```bash
python -m pytest tests/ -v --tb=short
```

- If `pytest` is not installed, install it: `pip install pytest`
- If tests fail, analyze failures, fix the test code, and re-run until all pass.
- If a test failure reveals a genuine bug in the source code, report it but do NOT fix the source — only fix the test expectations or skip the test with a clear reason.

## Step 6: Report Results

Provide a summary in this format:

```
## Test Results

### Security Tests
- X passed, Y failed
- Coverage: [list of areas covered]
- Issues found: [any genuine security concerns discovered]

### Functionality Tests
- X passed, Y failed
- Coverage: [list of areas covered]

### Integration Contract Tests
- X passed, Y failed
- Coverage: [list of integration boundaries verified]
- Mismatches found: [any contract violations discovered]

### Total: X passed, Y failed, Z skipped
```