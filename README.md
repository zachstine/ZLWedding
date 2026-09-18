# ZLWedding

## RSVP storage

The RSVP form sends the same answers independently to Firebase Cloud Firestore and a Google Apps Script web app that adds a row to the [wedding spreadsheet](https://docs.google.com/spreadsheets/d/1Cd2ESSzphdx18I8vQN9o7rVhzqjHQ__v-GSgjbJcouA/edit). Either destination can receive an RSVP if the other is temporarily unavailable. The sheet is a backup; Firestore is for a future RSVP view on the website. The form reports an error only if neither destination confirms the submission.

The Firestore rules in `firestore.rules` are deployed to project `zlwedding-80ad5`. They allow guests to create valid RSVP documents and prevent guests from reading or changing them. The Google Sheet should remain **Restricted**, because it contains guest names and email addresses.

## RSVP confirmation emails with EmailJS

EmailJS sends a copy of each saved RSVP to the guest through the connected Gmail service and the `ZLWedding` template. The service, template, and public key are configured in `emailjs-config.mjs`; no sending domain or Firebase function is needed. The site waits for Firestore or the Google Sheet to save the RSVP before calling EmailJS. The email lists the guest's attendance, guest count, dietary needs, Friday rehearsal dinner answer, after-reception answer, alcohol answer, and any message. This is a receipt of their answers, not an email-address verification link. A failed email does not erase a saved RSVP, and a successful submission asks guests to check their spam folder.

To change the EmailJS account or rebuild this setup:

1. In EmailJS, connect the email account you want to send from under **Email Services** and copy its **Service ID**.
2. Create an **Email Template** for the guest confirmation. Set **To Email** to `{{to_email}}`, and include these variables in the body:

   ```text
   Hi {{to_name}},

   Thank you for replying to our wedding invitation. Here is a copy of your selections:

   {{rsvp_details}}

   We look forward to celebrating with you!
   Zach & Lauren
   ```

   Keep the template's **From Email** as the connected email account. Save it and copy the **Template ID**. An EmailJS auto-reply is not needed because this template already goes to the guest. If using an HTML template, apply `white-space: pre-line` to the element containing `{{rsvp_details}}` so each answer appears on its own line.
3. Copy the **Public Key** from EmailJS **Account**. Put the Service ID, Template ID, and Public Key into `emailjs-config.mjs`. These are public website identifiers. Never put an email password or EmailJS Private Key in that file.
4. In EmailJS account security, allow the wedding website's origin if you use an origin allowlist. Publish the updated website.
5. Submit a test RSVP with an email address you control, then check the inbox and both RSVP destinations. Delete the test data afterward.

EmailJS may limit how often a connected personal account can send. The website shows a separate message if the RSVP was saved but the email could not be sent.

## Connect the Google Sheet

The Apps Script web app is already published and connected through `sheet-config.js`. This uses Google Apps Script and does not require the Firebase Blaze plan. If you change the script later, redeploy it from the Apps Script editor so the live version includes your changes.

1. Open the spreadsheet and choose **Extensions → Apps Script**.
2. Replace the default `Code.gs` with the contents of [`apps-script/Code.gs`](apps-script/Code.gs).
3. In **Project Settings**, enable **Show "appsscript.json" manifest file in editor**. Replace its contents with [`apps-script/appsscript.json`](apps-script/appsscript.json). Save both files.
4. Choose **Deploy → Manage deployments**, edit the existing web app, and select a new version. Keep **Execute as: Me** and **Who has access: Anyone**.
5. If you create a new deployment rather than updating the existing one, copy its `/exec` URL into [`sheet-config.js`](sheet-config.js) as `sheetWebAppUrl` and publish the updated website.

The Apps Script web app is public so wedding guests can submit without a Google account. The spreadsheet itself remains private. The endpoint adds validated RSVP rows and exposes only a yes/no receipt check for a submitted ID; it does not return sheet contents. It stores a submission ID in column A to avoid duplicate rows from retries and prefixes formula-like text so guest input stays plain text.

## Check the connection

Submit a test RSVP on the website. Check that a new document appears in Firestore and a matching answer row appears in `Sheet1`. A submission can reach either destination independently. If the sheet is not connected yet, the Firestore path still works. Delete the test document and sheet row afterward if desired.
