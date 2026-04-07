# SearchFlow Datasets

Three datasets power SearchFlow's analytics pipeline. Run the download script to fetch them all:

```bash
./scripts/download_datasets.sh
```

## 1. Hotel Booking Demand

- **Source:** [Antonio, Almeida & Nunes (2019)](https://doi.org/10.1016/j.dib.2018.11.126) via [TidyTuesday](https://github.com/rfordatascience/tidytuesday/tree/master/data/2020/2020-02-11)
- **License:** CC BY 4.0 — downloaded via `scripts/download_datasets.sh`
- **File:** `raw/hotel_bookings.csv`
- **Rows:** ~119,390 | **Columns:** 32

### Column Descriptions

| Column | Description |
|-|-|
| hotel | Hotel type: "Resort Hotel" or "City Hotel" |
| is_canceled | 1 if the booking was canceled, 0 otherwise |
| lead_time | Days between booking date and arrival date |
| arrival_date_year | Year of arrival (2015–2017) |
| arrival_date_month | Month of arrival |
| arrival_date_week_number | ISO week number of arrival |
| arrival_date_day_of_month | Day of the month of arrival |
| stays_in_weekend_nights | Weekend nights (Sat/Sun) in the stay |
| stays_in_week_nights | Week nights (Mon–Fri) in the stay |
| adults | Number of adults |
| children | Number of children |
| babies | Number of babies |
| meal | Meal plan: BB, HB, FB, SC/Undefined |
| country | Country of origin (ISO 3166-1 alpha-3) |
| market_segment | Market segment: Direct, Corporate, Online TA, Offline TA/TO, Groups, etc. |
| distribution_channel | Booking distribution channel |
| is_repeated_guest | 1 if guest has previous booking, 0 otherwise |
| previous_cancellations | Number of previous canceled bookings |
| previous_bookings_not_canceled | Number of previous non-canceled bookings |
| reserved_room_type | Code of reserved room type |
| assigned_room_type | Code of assigned room type (may differ from reserved) |
| booking_changes | Number of changes made to the booking |
| deposit_type | Deposit type: No Deposit, Non Refund, Refundable |
| agent | Travel agency ID |
| company | Company/entity ID that made or paid for the booking |
| days_in_waiting_list | Days the booking was on the waiting list |
| customer_type | Booking type: Transient, Contract, Group, Transient-Party |
| adr | Average Daily Rate (price per night) |
| required_car_parking_spaces | Number of car parking spaces required |
| total_of_special_requests | Number of special requests |
| reservation_status | Last reservation status: Check-Out, Canceled, No-Show |
| reservation_status_date | Date of the last status change |

## 2. Booking.com WSDM 2021 — Multi-Destination Trips

- **Source:** [bookingcom/ml-dataset-mdt](https://github.com/bookingcom/ml-dataset-mdt)
- **License:** CC BY-NC 4.0 (research only) — **not committed to repo**
- **Directory:** `raw/booking_com/`
- **Contents:** Train/test/ground truth sets for multi-destination trip prediction

This dataset contains anonymized multi-destination trip data used in the WSDM 2021 WebTour workshop challenge. It includes city IDs, country codes, hotel clusters, check-in/check-out dates, device classes, and affiliate IDs.

## 3. Inside Airbnb NYC Reviews

- **Source:** [Inside Airbnb](https://insideairbnb.com/get-the-data/) — New York City
- **License:** CC BY 4.0 — gitignored due to file size
- **File:** `raw/airbnb_reviews/reviews_nyc.csv`
- **Rows:** ~1M+ | **Columns:** 6 (listing_id, id, date, reviewer_id, reviewer_name, comments)

Contains all reviews for NYC Airbnb listings. Used for sentiment analysis and NLP feature extraction in the ML pipeline.

If automatic download fails (403 errors), download manually from the Inside Airbnb website and save to the path above.
