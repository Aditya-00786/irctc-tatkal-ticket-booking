with open("/Users/adisid07/Downloads/irctc-tatkal-ticket-booking-v6.2.0.zip", "rb") as f:
    import zipfile
    z = zipfile.ZipFile(f)
    content = z.read("irctc-tatkal-ticket-booking-v6.2.0/app.bundle.js").decode("utf-8")

print("Upgradation in orig app:", "Upgradation" in content)
print("confirm in orig app:", "confirm" in content.lower())
print("berth in orig app:", "berth" in content.lower())
