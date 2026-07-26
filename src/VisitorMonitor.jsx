import {
  CaretDown,
  CaretUp,
  Eye,
  EyeSlash,
  Pulse,
} from "@phosphor-icons/react";
import { useMemo, useState } from "react";

import {
  buildVisitorMonitorModel,
  summarizeClickActivity,
} from "./visitor-monitor-model.js";
import { useVisitorMonitor } from "./use-visitor-monitor.js";
import { describeHeatCell } from "./visitor-analytics.js";

const SECTION_LABELS = {
  hero: "HERO",
  approach: "APPROACH",
  work: "SELECTED WORK",
  experience: "EXPERIENCE",
  contact: "LET’S TALK",
};

const LEGACY_SECTION_LAYOUT = [
  { id: "hero", label: "HERO", start: 0, end: 0.186 },
  { id: "approach", label: "APPROACH", start: 0.186, end: 0.363 },
  { id: "work", label: "SELECTED WORK", start: 0.363, end: 0.661 },
  { id: "experience", label: "EXPERIENCE", start: 0.661, end: 0.866 },
  { id: "contact", label: "LET’S TALK", start: 0.866, end: 1 },
];

function formatDuration(startedAt, lastSeenAt) {
  const seconds = Math.max(0, Math.floor((lastSeenAt - startedAt) / 1000));
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(
    seconds % 60,
  ).padStart(2, "0")}`;
}

function HeatGrid({ heatmap, sections }) {
  const [hoveredCell, setHoveredCell] = useState(null);
  const maximum = Math.max(1, ...Object.values(heatmap));
  const pageSections = sections.length ? sections : LEGACY_SECTION_LAYOUT;
  const details = hoveredCell
    ? describeHeatCell(
        hoveredCell.key,
        hoveredCell.samples,
        pageSections,
      )
    : null;

  return (
    <div className="visitor-heatmap" aria-label="单次访问鼠标停留热区">
      <div className="visitor-heatmap__sections" aria-hidden="true">
        {pageSections.map((section, index) => (
          <span
            key={section.id}
            className={`visitor-heatmap__section visitor-heatmap__section--${
              index + 1
            }`}
            style={{
              top: `${section.start * 100}%`,
              height: `${(section.end - section.start) * 100}%`,
            }}
          >
            <b>{section.label}</b>
          </span>
        ))}
      </div>
      <div className="visitor-heatmap__cells">
        {Array.from({ length: 144 }, (_, index) => {
          const key = `${index % 12}:${Math.floor(index / 12)}`;
          const samples = heatmap[key] ?? 0;
          const strength = samples / maximum;
          return (
            <span
              key={key}
              className={samples ? "has-heat" : ""}
              style={{ "--heat": Math.max(0.025, strength) }}
              onPointerEnter={() =>
                samples && setHoveredCell({ key, samples })
              }
              onPointerLeave={() => setHoveredCell(null)}
            />
          );
        })}
      </div>
      <span className="visitor-heatmap__scan" aria-hidden="true" />
      {details && (
        <span className="visitor-heatmap__tooltip">
          <strong>{details.sectionLabel}</strong>
          <span>
            {(details.dwellMs / 1000).toFixed(1)}S · {details.samples} SAMPLES
          </span>
        </span>
      )}
    </div>
  );
}

export function VisitorMonitorView({
  mode,
  snapshot,
  expanded,
  isOwner,
  selectedSessionId,
  onToggleExpanded,
  onModeChange,
  onSelectSession,
}) {
  const model = useMemo(
    () =>
      buildVisitorMonitorModel({
        mode,
        snapshot,
        isOwner,
        selectedSessionId,
      }),
    [isOwner, mode, selectedSessionId, snapshot],
  );
  const current = model.current;
  const clickActivity = summarizeClickActivity(current.events).slice(0, 4);

  return (
    <aside
      className={`visitor-monitor visitor-monitor--${mode} ${
        expanded ? "visitor-monitor--expanded" : ""
      }`}
      aria-label="实时访问监控"
    >
      <button
        className="visitor-monitor__bar"
        type="button"
        onClick={onToggleExpanded}
        aria-expanded={expanded}
      >
        <span className="visitor-monitor__signal">
          <Pulse size={14} weight="bold" aria-hidden="true" />
          LIVE SIGNAL
        </span>
        <span className="visitor-monitor__bar-meta">
          <span className="visitor-monitor__private">
            {snapshot.activeCount} ONLINE
          </span>
          {expanded ? (
            <CaretDown size={13} aria-hidden="true" />
          ) : (
            <CaretUp size={13} aria-hidden="true" />
          )}
        </span>
      </button>

      {expanded && (
        <div className="visitor-monitor__body">
          <div className="visitor-monitor__private">
            <div className="visitor-monitor__overview">
              <div>
                <span>CURRENT SESSION</span>
                <strong>
                  {current.visitorLabel}
                  <small> / VISIT {String(current.visitNumber).padStart(2, "0")}</small>
                </strong>
              </div>
              <span
                className={`visitor-monitor__presence ${
                  current.active ? "is-active" : ""
                }`}
              >
                {current.active ? "LIVE" : "ENDED"}
              </span>
            </div>

            <div className="visitor-monitor__metrics">
              <div>
                <span>SECTION</span>
                <strong>
                  {SECTION_LABELS[current.currentSection] ??
                    current.currentSection.toUpperCase()}
                </strong>
              </div>
              <div>
                <span>DEPTH</span>
                <strong>{current.maxScrollDepth}%</strong>
              </div>
              <div>
                <span>DURATION</span>
                <strong>
                  {formatDuration(current.startedAt ?? 0, current.lastSeenAt ?? 0)}
                </strong>
              </div>
            </div>

            <HeatGrid
              heatmap={current.heatmap}
              sections={current.sections ?? []}
            />

            <div className="visitor-monitor__timeline">
              <span className="visitor-monitor__eyebrow">CLICK ACTIVITY</span>
              {(clickActivity.length
                ? clickActivity
                : [{ label: "NO CLICKS YET", count: 0, lastClickedAt: 0 }]
              ).map((event, index) => (
                <div
                  className="visitor-monitor__event"
                  key={`${event.label}-${index}`}
                >
                  <i />
                  <span>{event.label}</span>
                  {event.count > 0 && <strong>×{event.count}</strong>}
                </div>
              ))}
            </div>

            <div className="visitor-monitor__history">
              <span className="visitor-monitor__eyebrow">
                VISIT HISTORY · {snapshot.totalSessions}
              </span>
              {model.sessions.slice(0, 3).map((session) => (
                <button
                  className={`visitor-monitor__visit ${
                    session.id === current.id ? "is-selected" : ""
                  }`}
                  key={session.id}
                  type="button"
                  onClick={() => onSelectSession(session.id)}
                >
                  <span>{session.visitorLabel}</span>
                  <span>#{String(session.visitNumber).padStart(2, "0")}</span>
                  <span>{session.maxScrollDepth}%</span>
                </button>
              ))}
            </div>
          </div>

          {model.masked && (
            <div className="visitor-monitor__mask">
              <EyeSlash size={18} aria-hidden="true" />
              <strong>{model.maskLabel}</strong>
              <span>VISITOR DATA IS HIDDEN</span>
            </div>
          )}

          {model.modeAction && (
            <button
              className="visitor-monitor__mode"
              type="button"
              onClick={() => onModeChange(model.modeAction.nextMode)}
            >
              {mode === "open" ? (
                <EyeSlash size={13} aria-hidden="true" />
              ) : (
                <Eye size={13} aria-hidden="true" />
              )}
              {model.modeAction.label}
            </button>
          )}
        </div>
      )}
    </aside>
  );
}

export function VisitorMonitor() {
  const [expanded, setExpanded] = useState(true);
  const [selectedSessionId, setSelectedSessionId] = useState(null);
  const monitor = useVisitorMonitor();

  return (
    <VisitorMonitorView
      {...monitor}
      expanded={expanded}
      selectedSessionId={selectedSessionId}
      onToggleExpanded={() => setExpanded((value) => !value)}
      onModeChange={monitor.setMode}
      onSelectSession={setSelectedSessionId}
    />
  );
}
