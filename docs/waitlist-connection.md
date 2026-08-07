# Connect the Pallos waitlist

The Google Sheet is already created. These steps connect the website to the sheet and email notifications.

1. Open the **Pallos Agent Waitlist** Google Sheet.
2. Open **Extensions → Apps Script**.
3. Replace the editor contents with `docs/google-apps-script.js` from this project.
4. Replace `REPLACE_WITH_A_LONG_RANDOM_SECRET` with a long private value.
5. Choose **Deploy → New deployment → Web app**.
6. Set **Execute as** to yourself and **Who has access** to Anyone.
7. Authorize the script and copy the Web app URL ending in `/exec`.
8. In Vercel, add `GOOGLE_APPS_SCRIPT_URL` with that URL.
9. Add `WAITLIST_WEBHOOK_SECRET` with the exact same private value used in the script.
10. Redeploy and submit one test signup. Confirm a row appears in the Waitlist tab and an email reaches `pallosagent@gmail.com`.

The secret is stored only on the server. Never put it in browser code or commit the real value to this project.
