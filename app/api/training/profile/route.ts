export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const isFault = new URL(request.url).searchParams.get("fault") === "1";
  const headers = { "Cache-Control": "no-store" };

  if (isFault) {
    return Response.json({
      user_id: 1042,
      full_name: "Maya Chen",
      plan_name: { code: "growth", label: "Growth" },
      updated_at: new Date().toISOString(),
      deployment_region: "iad1",
    }, { headers });
  }

  return Response.json({
    user_id: "usr_demo_1042",
    full_name: "Maya Chen",
    plan_name: "growth",
    updated_at: new Date().toISOString(),
    subscription_status: "active",
  }, { headers });
}
