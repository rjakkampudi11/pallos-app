const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function clean(value: unknown, limit = 300) {
  return typeof value === "string" ? value.trim().slice(0, limit) : "";
}

export async function POST(request: Request) {
  const webhookUrl = process.env.GOOGLE_APPS_SCRIPT_URL;
  const webhookSecret = process.env.WAITLIST_WEBHOOK_SECRET;

  if (!webhookUrl || !webhookSecret) {
    return Response.json({ error: "The waitlist connection is being finished. Please email pallosagent@gmail.com for early access." }, { status: 503 });
  }

  let input: Record<string, unknown>;
  try {
    input = await request.json();
  } catch {
    return Response.json({ error: "That submission could not be read." }, { status: 400 });
  }

  if (clean(input.companyWebsite)) {
    return Response.json({ ok: true });
  }

  const selectedTool = clean(input.tool, 80);
  const otherTool = clean(input.otherTool, 120);
  const projectUrl = clean(input.projectUrl, 500);
  const building = clean(input.building, 1200);
  const payload = {
    secret: webhookSecret,
    firstName: clean(input.firstName, 80),
    email: clean(input.email, 160).toLowerCase(),
    role: clean(input.role, 80),
    tool: selectedTool === "Other" && otherTool ? `Other: ${otherTool}` : selectedTool,
    concern: clean(input.concern, 120),
    stage: clean(input.stage, 80),
    building: projectUrl ? `${building}\nProject URL: ${projectUrl}` : building,
    consent: clean(input.consent, 10),
    source: "pallosagent.info",
  };

  if (!emailPattern.test(payload.email) || !payload.tool || (selectedTool === "Other" && !otherTool) || !building || payload.consent !== "yes") {
    return Response.json({ error: "Please complete the required fields with a valid email address." }, { status: 400 });
  }

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      cache: "no-store",
    });
    const result = await response.json().catch(() => ({ ok: response.ok }));
    if (!response.ok || !result.ok) throw new Error("Webhook rejected the submission.");
    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: "We could not save your request right now. Please try again or email pallosagent@gmail.com." }, { status: 502 });
  }
}
