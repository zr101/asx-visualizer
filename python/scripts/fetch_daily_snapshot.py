#!/usr/bin/env python3
"""
Daily ASX Data Snapshot Script
Fetches all ASX stock data and saves to JSON/CSV/Database
"""
import json
import sys
from datetime import datetime
from pathlib import Path

import pandas as pd

# Add parent directory to path for imports
sys.path.append(str(Path(__file__).parent.parent))

from src.scrapers.tradingview import TradingViewScanner
from src.storage.database import Database

# Try to import rich for nice output, fall back to basic print
try:
    from rich.console import Console
    from rich.progress import track
    console = Console()
    HAS_RICH = True
except ImportError:
    HAS_RICH = False
    console = None

    def track(iterable, description=""):
        """Fallback for rich.progress.track"""
        print(description)
        return iterable


def log(message: str, style: str = ""):
    """Log a message with optional styling"""
    if HAS_RICH and console:
        console.print(message)
    else:
        # Strip rich markup for plain output
        clean_msg = message
        for tag in ["[bold blue]", "[/bold blue]", "[yellow]", "[/yellow]",
                    "[green]", "[/green]", "[bold green]", "[/bold green]",
                    "[red]", "[/red]"]:
            clean_msg = clean_msg.replace(tag, "")
        print(clean_msg)


def fetch_and_save_snapshot():
    """Main function to fetch daily snapshot"""

    log("[bold blue]Starting ASX Daily Snapshot[/bold blue]")

    # Initialize
    scanner = TradingViewScanner()
    db = Database()
    today = datetime.now().strftime("%Y-%m-%d")

    # Create directories
    project_root = Path(__file__).parent.parent.parent
    data_dir = project_root / "data" / "snapshots" / datetime.now().strftime("%Y/%m")
    data_dir.mkdir(parents=True, exist_ok=True)

    # Fetch all ASX stocks
    log("[yellow]Fetching all ASX stocks...[/yellow]")
    try:
        result = scanner.get_all_asx_stocks()
    except Exception as e:
        log(f"[red]Error fetching stocks: {e}[/red]")
        raise

    total_stocks = result["totalCount"]
    log(f"[green]Fetched {total_stocks} stocks[/green]")

    if total_stocks == 0:
        log("[red]No stocks fetched. Exiting.[/red]")
        return None

    # Convert to DataFrame
    df = pd.DataFrame([
        {"symbol": item["s"], **dict(zip(scanner.ALL_COLUMNS, item["d"]))}
        for item in result["data"]
    ])

    # Save JSON snapshot
    json_path = data_dir / f"{today}.json"
    with open(json_path, "w") as f:
        json.dump(result, f, indent=2)
    log(f"[green]Saved JSON: {json_path}[/green]")

    # Save CSV snapshot
    csv_path = data_dir / f"{today}.csv"
    df.to_csv(csv_path, index=False)
    log(f"[green]Saved CSV: {csv_path}[/green]")

    # Save to database
    rows_inserted = db.insert_snapshot(df, today)
    log(f"[green]Saved {rows_inserted} rows to database[/green]")

    # Generate summary
    summary = {
        "date": today,
        "total_stocks": total_stocks,
        "market_cap_total": float(df["market_cap_basic"].sum()) if "market_cap_basic" in df.columns else None,
        "avg_change": float(df["change"].mean()) if "change" in df.columns else None,
        "gainers": int(len(df[df["change"] > 0])) if "change" in df.columns else None,
        "losers": int(len(df[df["change"] < 0])) if "change" in df.columns else None,
        "unchanged": int(len(df[df["change"] == 0])) if "change" in df.columns else None,
    }

    # Add top/bottom performers if data available
    if "change" in df.columns and len(df) > 0:
        try:
            top_gainer_idx = df["change"].idxmax()
            summary["top_gainer"] = {
                "symbol": df.loc[top_gainer_idx, "symbol"],
                "name": df.loc[top_gainer_idx, "name"],
                "change": float(df.loc[top_gainer_idx, "change"])
            }
        except Exception:
            pass

        try:
            top_loser_idx = df["change"].idxmin()
            summary["top_loser"] = {
                "symbol": df.loc[top_loser_idx, "symbol"],
                "name": df.loc[top_loser_idx, "name"],
                "change": float(df.loc[top_loser_idx, "change"])
            }
        except Exception:
            pass

    if "volume" in df.columns and len(df) > 0:
        try:
            most_volume_idx = df["volume"].idxmax()
            summary["most_volume"] = {
                "symbol": df.loc[most_volume_idx, "symbol"],
                "name": df.loc[most_volume_idx, "name"],
                "volume": float(df.loc[most_volume_idx, "volume"])
            }
        except Exception:
            pass

    summary_path = data_dir / f"{today}-summary.json"
    with open(summary_path, "w") as f:
        json.dump(summary, f, indent=2)
    log(f"[green]Saved summary: {summary_path}[/green]")

    # Fetch and save presets
    log("\n[yellow]Fetching preset views...[/yellow]")
    presets_dir = data_dir / "presets"
    presets_dir.mkdir(exist_ok=True)

    for preset_name in track(scanner.PRESET_FILTERS.keys(), description="Fetching presets"):
        try:
            preset_data = scanner.get_preset(preset_name, limit=50)
            preset_path = presets_dir / f"{today}-{preset_name}.json"
            with open(preset_path, "w") as f:
                json.dump(preset_data, f, indent=2)
        except Exception as e:
            log(f"[red]Warning: Could not fetch preset {preset_name}: {e}[/red]")

    log("[bold green]Daily snapshot complete![/bold green]")

    # Print summary
    log("\n--- Summary ---")
    log(f"Date: {summary['date']}")
    log(f"Total stocks: {summary['total_stocks']}")
    if summary.get('avg_change') is not None:
        log(f"Average change: {summary['avg_change']:.2f}%")
    if summary.get('gainers') is not None:
        log(f"Gainers: {summary['gainers']} | Losers: {summary['losers']}")
    if summary.get('top_gainer'):
        log(f"Top gainer: {summary['top_gainer']['symbol']} ({summary['top_gainer']['change']:.2f}%)")
    if summary.get('top_loser'):
        log(f"Top loser: {summary['top_loser']['symbol']} ({summary['top_loser']['change']:.2f}%)")

    return summary


if __name__ == "__main__":
    fetch_and_save_snapshot()
