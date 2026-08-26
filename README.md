# Tatkal Ticket Booking

A Chrome extension (Manifest V3) that speeds up IRCTC Tatkal booking with automated form filling, timed refreshing, and fast clicks to help secure confirmed tickets.

> ⚠️ For personal/educational use. Use responsibly and in accordance with IRCTC's terms of service.

## Requirements

- Google Chrome **120+** (or a Chromium-based browser)

## Installation (Load Unpacked)

1. Download or clone this repository:
   ```bash
   git clone https://github.com/Aditya-00786/irctc-tatkal-ticket-booking.git
   ```
2. Open Chrome and go to `chrome://extensions`.
3. Toggle **Developer mode** on (top-right).
4. Click **Load unpacked** and select the cloned project folder (the one containing `manifest.json`).
5. The **Tatkal Ticket Booking** icon will appear in your toolbar. Pin it for quick access.

## Setup

Click the extension icon to open the popup, then fill in each section and click **Save Settings**:

1. **Login & Train Details** — Enter your IRCTC login and the train/journey details. Use the **Go to IRCTC Website** button to look up any info you need. All data is stored in Chrome local storage on your machine.
2. **Payment** — Defaults to Paytm UPI (fastest). Enable **Pay & Book (Show QR Code Page)** if you want to reach the final QR payment screen.
3. **Timers**
   - **Tatkal Start Timer** — `09:59:53` for AC classes, `10:59:53` for Sleeper (defaults recommended).
   - **Refresh Time** — how often availability is refreshed (default `5000` ms).
   - **Login Minutes Before** — logs in this many minutes before the start timer (default `2`).
4. **Passengers** — Add passengers under the **Passengers List** tab (name, age, gender, seat preference), then tick the checkbox to include them. Alternatively use the **Master Data** tab with first names matching your IRCTC master list.
   - ⚠️ Use **either** New Passenger data **or** Master Data — not both.

## Usage

1. Turn on the **Auto Booking** switch. When on, the extension runs automatically on the IRCTC site and logs in at the configured time before the Tatkal window.
2. On the IRCTC site during booking:
   - **Login:** enter the captcha and press **Enter**.
   - **Review & Captcha page:** check the shown seat availability, enter the captcha, and press **Enter** to confirm.
3. The extension handles the rest automatically.

For a detailed walkthrough, open [`how-to-use.html`](how-to-use.html) in your browser.

## Project Structure

| File | Purpose |
|------|---------|
| `manifest.json` | Extension manifest (MV3) |
| `sw.js` | Background service worker |
| `content.js` | Content script injected on irctc.co.in |
| `popup.html` / `popup.js` / `popup.css` | Extension popup UI |
| `options.html` / `options.css` | Options page |
| `assets/` | Icons |
| `*.py` | Build/patch helper scripts |

## Permissions

The extension requests `storage`, `tabs`, `alarms`, and `notifications`, with host access to `irctc.co.in`, `api.ocr.space`, and `travel.paytm.com`.
