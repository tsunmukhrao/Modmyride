import re


def estimate_shipping(postal_code: str) -> dict:
    pin = postal_code.strip()
    if not re.fullmatch(r"[1-9][0-9]{5}", pin):
        raise ValueError("Enter a valid six-digit Indian PIN code.")
    # Illustrative local project policy only; no carrier serviceability is implied.
    bands = {"1": 99.0, "2": 99.0, "3": 149.0, "4": 149.0, "5": 149.0, "6": 149.0, "7": 199.0, "8": 249.0, "9": 249.0}
    amount = bands[pin[0]]
    return {
        "postalCode": pin,
        "method": "Standard demo delivery",
        "amount": amount,
        "etaMinDays": 4,
        "etaMaxDays": 8,
        "currency": "INR",
        "isDemo": True,
    }
