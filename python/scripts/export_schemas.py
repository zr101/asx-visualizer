#!/usr/bin/env python3
"""
Export the published data contract as JSON Schema.

These schemas are the handoff between the pipeline and the frontend. The
TypeScript types are generated from them, so the two sides cannot drift without
CI noticing - which is the whole point, because every previous drift showed up
as a silently blank column rather than an error.

Usage:
    python python/scripts/export_schemas.py [--check]

`--check` regenerates into memory and exits non-zero if anything differs from
what is on disk. That is what CI runs.
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

sys.path.append(str(Path(__file__).parent.parent))

from src.contracts.payloads import PUBLISHED  # noqa: E402


def _strip_property_titles(node) -> None:
    """Remove the per-field `title` Pydantic adds automatically.

    The generator hoists every titled property into its own exported type alias,
    so leaving them produces a wall of `export type Advancers = number` before
    the interface anyone actually wants to read.
    """
    if isinstance(node, dict):
        for properties in ("properties", "patternProperties"):
            for schema in node.get(properties, {}).values():
                if isinstance(schema, dict):
                    schema.pop("title", None)
        for value in node.values():
            _strip_property_titles(value)
    elif isinstance(node, list):
        for item in node:
            _strip_property_titles(item)


def render(name: str, model: type) -> str:
    schema = model.model_json_schema(by_alias=True, mode="serialization")
    _strip_property_titles(schema)
    # The top-level title drives the generated TypeScript type name. Files get a
    # `File` suffix; a model that is a row keeps its own name.
    pascal = "".join(part.capitalize() for part in name.split("_"))
    schema["title"] = pascal if pascal.endswith("Row") else f"{pascal}File"
    return json.dumps(schema, indent=2, sort_keys=True) + "\n"


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true",
                        help="fail if the written schemas are out of date")
    args = parser.parse_args()

    out_dir = Path(__file__).parent.parent.parent / "schemas"
    out_dir.mkdir(exist_ok=True)

    stale: list[str] = []
    for name, model in sorted(PUBLISHED.items()):
        path = out_dir / f"{name}.schema.json"
        rendered = render(name, model)

        if args.check:
            current = path.read_text() if path.exists() else ""
            if current != rendered:
                stale.append(path.name)
            continue

        path.write_text(rendered)
        print(f"  {path.name:26s} {len(rendered.encode()) / 1024:6.1f} KB")

    if args.check:
        if stale:
            print("Schemas are out of date: " + ", ".join(stale))
            print("Run: python python/scripts/export_schemas.py")
            return 1
        print(f"{len(PUBLISHED)} schemas up to date")
        return 0

    print(f"\nWrote {len(PUBLISHED)} schemas to {out_dir.relative_to(out_dir.parent)}/")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
