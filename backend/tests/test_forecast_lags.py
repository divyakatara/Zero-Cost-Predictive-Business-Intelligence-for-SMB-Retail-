"""TASK-19 (#20): forecast lag features reflect true historical values."""
from datetime import date, timedelta
from types import SimpleNamespace

from routes.inventory import build_forecast_row, build_training_frame

START = date(2023, 1, 1)


def _sales(quantities):
    """Daily sales rows (oldest first), shaped like models.Sale, with the stored
    lag columns deliberately wrong so the test proves they are not used."""
    return [
        SimpleNamespace(
            sale_date=START + timedelta(days=i),
            weekday=(START + timedelta(days=i)).weekday(),
            month=(START + timedelta(days=i)).month,
            is_weekend=(START + timedelta(days=i)).weekday() >= 5,
            promo=False,
            quantity_sold=qty,
            lag_1=None,
            lag_7=-1,
        )
        for i, qty in enumerate(quantities)
    ]


QUANTITIES = [41, 48, 54, 53, 57, 46, 38, 40, 45, 54, 60, 33, 47, 52]


def test_forecast_lag_7_is_the_quantity_seven_periods_before_the_forecast():
    data = build_training_frame(_sales(QUANTITIES))

    row = build_forecast_row(data)

    # Forecast period is index 14; 7 periods back is index 7.
    assert row["lag_7"] == QUANTITIES[14 - 7] == 40
    assert row["lag_1"] == QUANTITIES[-1] == 52


def test_training_lags_come_from_the_quantity_series_not_stored_columns():
    data = build_training_frame(_sales(QUANTITIES))

    # First 7 rows lack a full 7-period history and are dropped.
    assert len(data) == len(QUANTITIES) - 7
    for i, row in data.iterrows():
        original = i + 7
        assert row["quantity_sold"] == QUANTITIES[original]
        assert row["lag_1"] == QUANTITIES[original - 1]
        assert row["lag_7"] == QUANTITIES[original - 7]


def test_forecast_row_advances_the_weekday():
    data = build_training_frame(_sales(QUANTITIES))
    last_weekday = int(data["weekday"].iloc[-1])

    row = build_forecast_row(data)

    assert row["weekday"] == (last_weekday + 1) % 7
    assert row["is_weekend"] == (1 if row["weekday"] in (5, 6) else 0)
