"""Import smoke test.

Every module must import cleanly, and every script must be loadable without
running. The analysis tests import `src.analysis.*` directly, so a broken
`src.storage` package left the whole entry-point layer dead while the suite
stayed green - which is exactly what happened when `database.py` was deleted
and its re-export in `storage/__init__.py` was not.
"""
from __future__ import annotations

import importlib
import pkgutil
from pathlib import Path

import pytest

import src

MODULES = [
    name for _, name, _ in pkgutil.walk_packages(src.__path__, prefix="src.")
]

SCRIPTS = sorted((Path(__file__).parent.parent / "scripts").glob("*.py"))


@pytest.mark.parametrize("module", MODULES)
def test_module_imports(module):
    importlib.import_module(module)


@pytest.mark.parametrize("script", SCRIPTS, ids=lambda p: p.name)
def test_script_imports(script):
    """Compile and exec the script's imports without invoking main()."""
    spec = importlib.util.spec_from_file_location(f"_script_{script.stem}", script)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    assert hasattr(module, "main"), f"{script.name} has no main()"
