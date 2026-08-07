import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

type IncidentForEmail = {
  id: string;
  title: string;
  severity: "high" | "critical";
  summary: string;
  alert_sent_at: string | null;
};

type MonitorForEmail = { id: string; name: string; url: string; user_id: string; email_alerts: boolean };

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character] || character);
}

export async function sendIncidentEmail(supabase: SupabaseClient, monitor: MonitorForEmail, incident: IncidentForEmail) {
  if (!monitor.email_alerts || incident.alert_sent_at) return { status: "skipped" as const };
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { status: "not_configured" as const };

  async function recordFailure(message: string) {
    await supabase.from("pallos_incidents").update({ alert_error: message.slice(0, 500) }).eq("id", incident.id).eq("user_id", monitor.user_id);
    return { status: "failed" as const, error: message };
  }

  if (!/^re_[\x21-\x7e]+$/.test(apiKey)) return recordFailure("RESEND_API_KEY is not a complete Resend API key.");

  const { data, error } = await supabase.auth.admin.getUserById(monitor.user_id);
  const recipient = data.user?.email;
  if (error || !recipient) return { status: "failed" as const, error: error?.message || "The account has no alert email." };

  let response: Response;
  try {
    response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": `pallos-incident-${incident.id}`,
      },
      body: JSON.stringify({
        from: process.env.PALLOS_ALERT_FROM || "Pallos Alerts <onboarding@resend.dev>",
        to: [recipient],
        subject: `[${incident.severity.toUpperCase()}] ${incident.title}`,
        html: `<div style="font-family:Arial,sans-serif;max-width:620px;margin:auto;color:#172033"><p style="color:#526ce8;font-size:12px;font-weight:700;letter-spacing:.08em">PALLOS MONITOR</p><h1 style="font-size:26px">${escapeHtml(incident.title)}</h1><p style="line-height:1.6">${escapeHtml(incident.summary)}</p><div style="padding:14px;border:1px solid #dde2ea;border-radius:8px;background:#f7f9fc"><strong>${escapeHtml(monitor.name)}</strong><br/><span style="font-size:12px;color:#667085">${escapeHtml(monitor.url)}</span></div><p style="margin-top:24px"><a href="https://pallosagent.com/monitor" style="display:inline-block;padding:12px 16px;border-radius:7px;background:#526ce8;color:white;text-decoration:none;font-weight:700">Review incident</a></p><p style="margin-top:28px;color:#7b8492;font-size:12px">Pallos sends one alert per unresolved incident.</p></div>`,
      }),
    });
  } catch (caught) {
    return recordFailure(caught instanceof Error ? caught.message : "Resend could not be reached.");
  }

  if (!response.ok) {
    const detail = await response.text();
    return recordFailure(detail);
  }

  const sentAt = new Date().toISOString();
  await supabase.from("pallos_incidents").update({ alert_sent_at: sentAt, alert_recipient: recipient, alert_error: null }).eq("id", incident.id).eq("user_id", monitor.user_id);
  return { status: "sent" as const, recipient, sentAt };
}
