"use client";

import { useEffect, useState } from "react";
import { CheckCircle, MinusCircle, WarningCircle, X } from "@phosphor-icons/react";
import { finalizeSecurityAssessment, type AssessmentCheck, type SecurityAssessment } from "@/lib/security-assessment";

function CheckList({ title, checks }: { title: string; checks: AssessmentCheck[] }) {
  const [showAll, setShowAll] = useState(false);
  useEffect(() => {
    if (!showAll) return;
    const close = (event: KeyboardEvent) => event.key === "Escape" && setShowAll(false);
    document.addEventListener("keydown", close);
    return () => document.removeEventListener("keydown", close);
  }, [showAll]);
  if (checks.length === 0) return null;
  const visibleChecks = checks.slice(0, 5);
  const renderCheck = (item: AssessmentCheck) => <details key={item.id} className={`assessment-check ${item.status}`}>
    <summary>{item.status === "passed" ? <CheckCircle weight="fill" /> : item.status === "failed" ? <WarningCircle weight="fill" /> : <MinusCircle />}<span><strong>{item.title}</strong><small>{item.status === "not_tested" ? "Unknown / not tested" : item.status === "passed" ? "Passed" : `${item.severity} severity`}</small></span></summary>
    <div><p>{item.explanation}</p>{item.evidence ? <p><b>Evidence:</b> {item.evidence}</p> : null}{item.remediation ? <p><b>How to fix:</b> {item.remediation}</p> : null}</div>
  </details>;
  return <section className="assessment-list"><h4>{title}<span>{checks.length}</span></h4>{visibleChecks.map(renderCheck)}{checks.length > 5 ? <button className="assessment-view-all" type="button" onClick={() => setShowAll(true)}>View all {checks.length}</button> : null}{showAll ? <div className="assessment-modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setShowAll(false)}><section className="assessment-modal" role="dialog" aria-modal="true" aria-labelledby={`assessment-${checks[0].status}-title`}><header><div><span>FULL CHECK LIST</span><h3 id={`assessment-${checks[0].status}-title`}>{title} <small>{checks.length}</small></h3></div><button type="button" aria-label="Close full check list" onClick={() => setShowAll(false)}><X /></button></header><div className="assessment-modal-list">{checks.map(renderCheck)}</div></section></div> : null}</section>;
}

export function SecurityAssessmentPanel({ assessment, compact = false }: { assessment: SecurityAssessment | null | undefined; compact?: boolean }) {
  if (!assessment) return <section className="security-assessment unavailable"><MinusCircle /><div><strong>Assessment not available</strong><p>This result predates the assessment layer. Run a new scan after applying the database migration.</p></div></section>;
  const calibrated = finalizeSecurityAssessment(assessment.checks);
  const passed = calibrated.checks.filter((item) => item.status === "passed");
  const failed = calibrated.checks.filter((item) => item.status === "failed");
  const unknown = calibrated.checks.filter((item) => item.status === "not_tested");
  return <section className={`security-assessment ${compact ? "compact" : ""}`}>
    <div className="assessment-score"><div className={`score-ring ${calibrated.grade.toLowerCase().replaceAll(" ", "-")}`}><strong>{calibrated.score}</strong><span>/100</span></div><div><span>SECURITY ASSESSMENT</span><h3>{calibrated.grade}</h3><p>{calibrated.summary}</p></div><dl><div><dt>Passed</dt><dd>{passed.length}</dd></div><div><dt>Risks</dt><dd>{failed.length}</dd></div><div><dt>Untested</dt><dd>{unknown.length}</dd></div><div><dt>Coverage</dt><dd>{calibrated.coverage}%</dd></div></dl></div>
    {compact ? null : <div className="assessment-columns"><CheckList title="Passed checks" checks={passed} /><CheckList title="Risk signals" checks={failed} /><CheckList title="Unknown / not tested" checks={unknown} /></div>}
  </section>;
}
