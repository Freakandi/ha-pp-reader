"""Integrity checks for the bundled dashboard artifacts."""

from __future__ import annotations

import re
from pathlib import Path

MODULE_EXPORT_PATTERN = re.compile(
    r"export \* from ['\"]\./(?P<bundle>dashboard\.[0-9A-Za-z_-]+\.js)['\"];?"
)


def test_dashboard_bundle_artifacts_present() -> None:
    """Ensure the hashed dashboard bundle and source map exist and are referenced."""
    repo_root = Path(__file__).resolve().parents[2]
    bundle_directory = (
        repo_root
        / "custom_components"
        / "pp_reader"
        / "www"
        / "pp_reader_dashboard"
        / "js"
    )

    module_path = bundle_directory / "dashboard.module.js"
    module_contents = module_path.read_text(encoding="utf8")

    match = MODULE_EXPORT_PATTERN.search(module_contents)
    assert match is not None, (
        "dashboard.module.js must re-export a hashed dashboard bundle"
    )

    bundle_name = match.group("bundle")
    bundle_path = bundle_directory / bundle_name

    assert bundle_path.exists(), f"hashed dashboard bundle {bundle_name} is missing"
    assert bundle_path.stat().st_size > 0, "dashboard bundle should not be empty"

    bundle_source = bundle_path.read_text(encoding="utf8")

    source_map_path = bundle_path.with_suffix(bundle_path.suffix + ".map")
    assert source_map_path.exists(), "source map for the dashboard bundle is missing"

    expected_source_map_reference = f"//# sourceMappingURL={source_map_path.name}"
    assert expected_source_map_reference in bundle_source, (
        "bundle should reference its source map for debugging"
    )

    hashed_candidates = sorted(
        entry.name
        for entry in bundle_directory.iterdir()
        if entry.is_file()
        and entry.name.startswith("dashboard.")
        and entry.name.endswith(".js")
    )
    assert bundle_name in hashed_candidates, (
        "resolved bundle should be among the available hashed dashboard artifacts"
    )
