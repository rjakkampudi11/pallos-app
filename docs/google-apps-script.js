const SHEET_NAME = "Waitlist";
const NOTIFY_EMAIL = "pallosagent@gmail.com";
const SHARED_SECRET = "REPLACE_WITH_A_LONG_RANDOM_SECRET";

function safeCell(value) {
  const text = String(value || "").trim();
  return /^[=+\-@]/.test(text) ? "'" + text : text;
}

function jsonResponse(body) {
  return ContentService.createTextOutput(JSON.stringify(body)).setMimeType(ContentService.MimeType.JSON);
}

// Apps Script invokes this global entry point by name.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function doPost(event) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);

  try {
    const data = JSON.parse(event.postData.contents || "{}");
    if (data.secret !== SHARED_SECRET) return jsonResponse({ ok: false, error: "Unauthorized" });

    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = spreadsheet.getSheetByName(SHEET_NAME);
    if (!sheet) return jsonResponse({ ok: false, error: "Waitlist tab not found" });

    const requestId = Utilities.getUuid();
    const row = [
      new Date(),
      safeCell(data.firstName),
      safeCell(data.email),
      safeCell(data.role),
      safeCell(data.tool),
      safeCell(data.concern),
      safeCell(data.stage),
      safeCell(data.building),
      safeCell(data.source),
      "Pending",
      requestId,
    ];

    sheet.appendRow(row);
    const rowNumber = sheet.getLastRow();

    try {
      MailApp.sendEmail({
        to: NOTIFY_EMAIL,
        subject: "New Pallos Agent waitlist signup — " + safeCell(data.firstName),
        body: [
          "A new person joined the Pallos Agent waitlist.",
          "",
          "Name: " + safeCell(data.firstName),
          "Email: " + safeCell(data.email),
          "Role: " + safeCell(data.role),
          "AI tool: " + safeCell(data.tool),
          "Biggest concern: " + safeCell(data.concern),
          "Project stage: " + safeCell(data.stage),
          "Building: " + safeCell(data.building),
          "Request ID: " + requestId,
        ].join("\n"),
        name: "Pallos Agent Waitlist",
      });
      sheet.getRange(rowNumber, 10).setValue("Yes");
    } catch (error) {
      sheet.getRange(rowNumber, 10).setValue("Failed");
      throw error;
    }

    return jsonResponse({ ok: true, requestId: requestId });
  } catch (error) {
    return jsonResponse({ ok: false, error: String(error) });
  } finally {
    lock.releaseLock();
  }
}
