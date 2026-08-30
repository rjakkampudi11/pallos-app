import { CheckCircle, MinusCircle, WarningCircle } from "@phosphor-icons/react";
import type { AssessmentCheck, SecurityAssessment } from "@/lib/security-assessment";

function CheckList({ title, checks }: { title: string; checks: AssessmentCheck[] }) {
  if (checks.length === 0) return null;
  return <section className="assessment-list"><h4>{title}<span>{checks.length}</span></h4>{checks.map((item) => <details key={item.id} className={`assessment-check ${item.status}`}>
    <summary>{item.status === "passed" ? <CheckCircle weight="fill" /> : item.status === "failed" ? <WarningCircle weight="fill" /> : <MinusCircle />}<span><strong>{item.title}</strong><small>{item.status === "not_tested" ? "Unknown / not tested" : item.status === "passed" ? "Passed" : `${item.severity} severity`}</small></span></summary>
    <div><p>{item.explanation}</p>{item.evidence ? <p><b>Evidence:</b> {item.evidence}</p> : null}{item.remediation ? <p><b>How to fix:</b> {item.remediation}</p> : null}</div>
  </details>)}</section>;
}

export function SecurityAssessmentPanel({ assessment, compact = false }: { assessment: SecurityAssessment | null | undefined; compact?: boolean }) {
  if (!assessment) return <section className="security-assessment unavailable"><MinusCircle /><div><strong>Assessment not available</strong><p>This result predates the assessment layer. Run a new scan after applying the database migration.</p></div></section>;
  const passed = assessment.checks.filter((item) => item.status === "passed");
  const failed = assessment.checks.filter((item) => item.status === "failed");
  const unknown = assessment.checks.filter((item) => item.status === "not_tested");
  return <section className={`security-assessment ${compact ? "compact" : ""}`}>
    <div className="assessment-score"><div className={`score-ring ${assessment.grade.toLowerCase().replaceAll(" ", "-")}`}><strong>{assessment.score}</strong><span>/100</span></div><div><span>SECURITY ASSESSMENT</span><h3>{assessment.grade}</h3><p>{assessment.summary}</p></div><dl><div><dt>Passed</dt><dd>{passed.length}</dd></div><div><dt>Risks</dt><dd>{failed.length}</dd></div><div><dt>Untested</dt><dd>{unknown.length}</dd></div><div><dt>Coverage</dt><dd>{assessment.coverage}%</dd></div></dl></div>
    {compact ? null : <div className="assessment-columns"><CheckList title="Passed checks" checks={passed} /><CheckList title="Risk signals" checks={failed} /><CheckList title="Unknown / not tested" checks={unknown} /></div>}
  </section>;
}
