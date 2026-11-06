# Slipbook (version 1)

Invoices, receipts and a sales record that work without internet. No account: the owner types a business
name once. Everything is stored on the phone.

## How it's used
1. A customer tells you what they want. Tap **New invoice**, type it in (or tap items from your **Price list**).
2. Tap **Send invoice**. The phone's share sheet opens with the PDF attached, so it goes straight to WhatsApp.
3. The customer pays by transfer and sends you the screenshot in the same chat. Optionally save it on the invoice with **Add screenshot**.
4. Tap **Confirm payment received**. A "Paid" stamp lands, the sale is recorded, and the invoice becomes a receipt.
5. Tap **Send receipt** to WhatsApp it back.

The **Sales** page shows what you're owed, what you've collected this month and all time, and a month-by-month list.

## Run it
```
npm install
npm run dev        # open the address it prints, on your phone or a narrow browser window
npm run build      # creates dist/ (a static site, no server needed)
```

## Offline
- After the first visit the site is cached by `public/sw.js` and opens without internet. On Android Chrome,
  use "Add to Home screen" to install it.
- Fonts are bundled (`@fontsource`), nothing is fetched from Google.
- Data is in the phone's IndexedDB (`src/lib/db.js`). The app asks the browser to keep it from being cleared.

## Backups (important)
Records live only on the phone. **Settings, Back up everything** saves one `.json` file the owner can keep in
Google Drive or send to themselves on WhatsApp. **Restore** (also on the first screen after reinstalling)
loads it back. The Sales page reminds the owner after 7 days. **Export sales (CSV)** opens in Excel or Sheets.

## Renaming the app
Edit `src/config.js`, the `<title>` in `index.html`, `public/manifest.webmanifest`, and `package.json`.

## Notes and known limits
- **Sharing a PDF straight into WhatsApp** uses the browser's share feature, which works on Android Chrome. Where
  it isn't available (desktop, some in-app browsers) the PDF is saved and a WhatsApp chat is opened with the message.
- **PDFs** show amounts as `NGN 1,500.00` because the PDF library's built-in fonts have no naira sign. The
  on-screen slip uses the real symbol.
- No invoice number can be reused: numbers come from a counter on the phone. After a restore the counter comes
  back with the backup. After a wipe with no backup it restarts, so set the next number in Settings.

## Build the Android app on GitHub (no Android Studio needed)
1. Create a GitHub repository and upload **the contents of this folder** (not the folder itself) to its main branch.
   Make sure the hidden `.github` folder goes up too. If your upload tool skips hidden folders, use GitHub Desktop
   or `git`, or create `.github/workflows/android.yml` in the GitHub website and paste the file in.
2. Open the repository's **Actions** tab. The workflow "Build Android app" runs on every push, and you can also run it
   by hand with "Run workflow". It takes a few minutes the first time.
3. When it finishes, open the repository's **Releases** page, **Latest build**, and download the `.apk` on your phone
   (or download it from the run page under Artifacts). Allow "Install unknown apps" for your browser when asked.

### Set up a signing key (do this before giving the app to anyone)
Without it the workflow builds a test APK signed with a throwaway key. That works for trying the app, but each build is
signed differently, so a new build can't be installed over the old one without uninstalling it, and that **deletes the
records stored on the phone**. A permanent key fixes this, and it will also be needed to recognise devices in version 1.5.
```
keytool -genkeypair -v -keystore slipbook.jks -alias slipbook -keyalg RSA -keysize 2048 -validity 10000
base64 -w0 slipbook.jks        # on a Mac: base64 -i slipbook.jks
```
In the repository go to Settings, Secrets and variables, Actions, and add four secrets:
`KEYSTORE_BASE64` (the long text from the second command), `KEYSTORE_PASSWORD`, `KEY_ALIAS` (slipbook) and `KEY_PASSWORD`.
**Keep `slipbook.jks` and its passwords somewhere safe.** If you lose them you can never publish an update that installs
over existing copies of the app. Never upload the `.jks` file to GitHub.

Tips: run `npm install` once on your computer and commit the `package-lock.json` it creates, so builds always use the
same package versions. The app id is in `capacitor.config.json` (`com.slipbook.app`), so change it before publishing.

In the installed app, sharing and saving files go through Android's share sheet (WhatsApp, Google Drive, Files),
because the app has no download bar. The code for that is `src/lib/native.js`.

## Roadmap
- **Version 1.5, paid activation:** first open needs internet, shows plans and your bank details, the user
  uploads proof of payment, you approve it in an online dashboard and the device is activated. Everything else
  stays offline.

## Files
```
src/
  config.js            app name and settings
  lib/db.js            IndexedDB wrapper
  lib/store.jsx        app state: profile, price list, invoices
  lib/pdf.js           invoice and receipt PDF
  lib/share.js         share sheet and WhatsApp fallback
  lib/backup.js        backup, restore, CSV
  lib/route.jsx        tiny hash router
  components/          Slip (the invoice/receipt), TabBar
  pages/               Onboarding, Home, InvoiceEditor, InvoiceDetail, Items, Settings
public/                manifest, service worker, icons
```
