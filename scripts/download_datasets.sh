#!/usr/bin/env bash
# ============================================================================
# download_datasets.sh — Download datasets for SearchFlow analytics platform
#
# Datasets:
#   1. Hotel Booking Demand (CC BY 4.0) — downloaded via script, not committed
#   2. Booking.com WSDM 2021 (Research-only) — DO NOT commit raw data
#   3. Inside Airbnb NYC Reviews (CC BY 4.0) — large file, gitignored
#
# Usage:
#   chmod +x scripts/download_datasets.sh
#   ./scripts/download_datasets.sh
#
# Idempotent: skips downloads when files already exist.
# ============================================================================
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
RAW_DIR="$PROJECT_ROOT/data/raw"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

info()  { echo -e "${GREEN}[INFO]${NC}  $*"; }
warn()  { echo -e "${YELLOW}[WARN]${NC}  $*"; }
error() { echo -e "${RED}[ERROR]${NC} $*"; }

# ── 1. Hotel Booking Demand ─────────────────────────────────────────────────
# Source: TidyTuesday 2020-02-11 (originally from Antonio et al., 2019)
# License: CC BY 4.0
# Rows: ~119,390 | Columns: 32
HOTEL_CSV="$RAW_DIR/hotel_bookings.csv"
HOTEL_URL="https://raw.githubusercontent.com/rfordatascience/tidytuesday/master/data/2020/2020-02-11/hotels.csv"

if [[ -f "$HOTEL_CSV" ]]; then
    info "Hotel bookings already exists at $HOTEL_CSV — skipping."
else
    info "Downloading Hotel Booking Demand dataset..."
    mkdir -p "$RAW_DIR"
    if curl -fSL --progress-bar -o "$HOTEL_CSV" "$HOTEL_URL"; then
        info "Hotel bookings saved to $HOTEL_CSV ($(wc -l < "$HOTEL_CSV") lines)."
    else
        error "Failed to download hotel bookings from $HOTEL_URL"
        exit 1
    fi
fi

# ── 2. Booking.com WSDM 2021 Multi-Destination Trips ───────────────────────
# Source: https://github.com/bookingcom/ml-dataset-mdt
# License: Research-only (CC BY-NC 4.0). DO NOT commit raw data.
# Contains: train/test/ground_truth sets for multi-destination trip prediction
BOOKING_DIR="$RAW_DIR/booking_com"

if [[ -d "$BOOKING_DIR" && -n "$(ls -A "$BOOKING_DIR" 2>/dev/null)" ]]; then
    info "Booking.com dataset already exists at $BOOKING_DIR — skipping."
else
    info "Cloning Booking.com WSDM 2021 dataset..."
    mkdir -p "$BOOKING_DIR"
    if git clone --depth 1 https://github.com/bookingcom/ml-dataset-mdt "$BOOKING_DIR"; then
        info "Booking.com dataset cloned to $BOOKING_DIR."
        warn "Research-only license (CC BY-NC 4.0) — do NOT commit raw data."
    else
        warn "Failed to clone Booking.com dataset."
        warn "Try manually: git clone https://github.com/bookingcom/ml-dataset-mdt $BOOKING_DIR"
    fi
fi

# ── 3. Inside Airbnb NYC Reviews ───────────────────────────────────────────
# Source: https://data.insideairbnb.com/ (New York City)
# License: CC BY 4.0 (but large file — gitignored)
# Contains: ~1M+ reviews with listing_id, date, reviewer info, comments
AIRBNB_DIR="$RAW_DIR/airbnb_reviews"
AIRBNB_CSV="$AIRBNB_DIR/reviews_nyc.csv"

if [[ -f "$AIRBNB_CSV" && -s "$AIRBNB_CSV" ]]; then
    info "Airbnb NYC reviews already exists at $AIRBNB_CSV — skipping."
else
    info "Downloading Inside Airbnb NYC reviews..."
    mkdir -p "$AIRBNB_DIR"

    # Inside Airbnb updates paths by date. Try recent quarters.
    # Pattern: data.insideairbnb.com/united-states/ny/new-york-city/YYYY-MM-DD/visualisations/reviews.csv
    BASE_URL="https://data.insideairbnb.com/united-states/ny/new-york-city"
    DATE_PATHS=(
        "2025-03-06"
        "2024-12-04"
        "2024-09-04"
        "2024-06-07"
        "2024-03-07"
        "2023-12-04"
    )

    DOWNLOADED=false
    for DATE_PATH in "${DATE_PATHS[@]}"; do
        URL="$BASE_URL/$DATE_PATH/visualisations/reviews.csv"
        info "  Trying $DATE_PATH..."
        if curl -fSL --progress-bar -o "$AIRBNB_CSV" "$URL" 2>/dev/null; then
            if [[ -s "$AIRBNB_CSV" ]]; then
                info "Airbnb NYC reviews saved to $AIRBNB_CSV ($(wc -l < "$AIRBNB_CSV") lines)."
                DOWNLOADED=true
                break
            fi
        fi
    done

    # Fallback: try the gzipped version
    if [[ "$DOWNLOADED" == false ]]; then
        warn "CSV download failed. Trying gzipped version..."
        for DATE_PATH in "${DATE_PATHS[@]}"; do
            URL="$BASE_URL/$DATE_PATH/data/reviews.csv.gz"
            info "  Trying $DATE_PATH (gzipped)..."
            if curl -fSL --progress-bar -o "$AIRBNB_DIR/reviews.csv.gz" "$URL" 2>/dev/null; then
                if [[ -s "$AIRBNB_DIR/reviews.csv.gz" ]]; then
                    gunzip -c "$AIRBNB_DIR/reviews.csv.gz" > "$AIRBNB_CSV"
                    rm -f "$AIRBNB_DIR/reviews.csv.gz"
                    info "Airbnb NYC reviews saved to $AIRBNB_CSV ($(wc -l < "$AIRBNB_CSV") lines)."
                    DOWNLOADED=true
                    break
                fi
            fi
        done
    fi

    if [[ "$DOWNLOADED" == false ]]; then
        warn "All automatic download attempts failed (site may return 403)."
        warn ""
        warn "Manual download instructions:"
        warn "  1. Visit https://insideairbnb.com/get-the-data/"
        warn "  2. Scroll to 'New York City, New York, United States'"
        warn "  3. Download 'reviews.csv' (the visualisations summary version)"
        warn "  4. Save as: $AIRBNB_CSV"
        warn ""
        warn "Or download the detailed version:"
        warn "  3. Download 'reviews.csv.gz' (the detailed version)"
        warn "  4. Run: gunzip -c reviews.csv.gz > $AIRBNB_CSV"
        # Create empty placeholder so the directory isn't bare
        touch "$AIRBNB_CSV"
    fi
fi

# ── Summary ─────────────────────────────────────────────────────────────────
echo ""
info "=== Dataset Status ==="
[[ -f "$HOTEL_CSV" && -s "$HOTEL_CSV" ]]      && info "  Hotel Bookings:    OK ($(wc -l < "$HOTEL_CSV") lines)" || warn "  Hotel Bookings:    MISSING"
[[ -d "$BOOKING_DIR" && -n "$(ls -A "$BOOKING_DIR" 2>/dev/null)" ]] && info "  Booking.com MDT:   OK" || warn "  Booking.com MDT:   MISSING"
[[ -f "$AIRBNB_CSV" && -s "$AIRBNB_CSV" ]]    && info "  Airbnb NYC:        OK ($(wc -l < "$AIRBNB_CSV") lines)" || warn "  Airbnb NYC:        MISSING (see manual instructions above)"
echo ""
