# NQ K-line Trainer (v1.0)

Replay real CME E-mini / Micro E-mini Nasdaq-100 futures (NQ / MNQ) 1-minute data (2018-10 to 2026-11, 2,083 trading sessions) and practise intraday execution, stop/target management, and Topstep-style risk discipline on PC and iPhone.

## Quick Start

- **PC (Local with auto-saved `journal/` folder):** double-click `start_nq_trainer.bat` (opens `http://127.0.0.1:8766`).
- **iPhone / GitHub Pages (Static PWA):** push this folder to a public GitHub repository (e.g. `Truckitty/nq-trainer`) and enable GitHub Pages (`Deploy from a branch -> main / root`). Open the URL in iPhone Safari -> Share -> **Add to Home Screen**. The first launch caches the offline yearly bundles (~13 MB gzipped; Wi-Fi recommended), and all practice records stay isolated under the `nqkt_*` storage namespace so it safely coexists with `gold-trainer` under the same `github.io` domain.

## Key Features

- **Real NQ / MNQ Contract Specs:** `0.25` tick size, 2-decimal pricing, `MNQ` ($0.50/tick, $2/pt) & `NQ` ($5/tick, $20/pt), realistic slippage & commission calculation.
- **Two Locked Practice Modes:** Discipline Mode (fixed size) and Combat Mode (Topstep-style scaling, add/reduce, keep-risk pyramiding, trailing drawdown, live liquidation line).
- **Enhanced Interaction:** Quick SL/TP preset chips (`0.5E-2E`, `1R-3R`), one-tap Chart Click-to-Order mode (`pick price on chart`), draggable Order/SL/TP lines with live P&L labels, 1m-4h timeframes, EMA / BOLL / MACD / ICT Killzones + OB + FVG / Previous Day High-Low (`PDH/L`), and `?` shortcut overlay.
- **Quantitative Journal & Profiles:** Multiple save slots (survive updates), shadow opposite-direction "Direction Value" with 95% CI & t-stat, skip counterfactual evaluation, A/B Killzones experiment mode, and CSV/JSON backup.

## Licenses

- Charting: TradingView Lightweight Charts (Apache License 2.0, see `lib/`).
- Killzones overlay: port of LuxAlgo's "ICT Killzones Toolkit" (CC BY-NC-SA 4.0, non-commercial use only).
