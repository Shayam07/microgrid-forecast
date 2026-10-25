
import { useMemo, useRef, useState } from 'react';
import './App.css';

const HOURS = Array.from({ length: 24 }, (_, i) => i);

function makeForecast(inputs, offset = 0) {
  const start = new Date();
  start.setMinutes(0, 0, 0);

  return HOURS.map((hour) => {
    const time = new Date(start);
    time.setHours(start.getHours() + hour);

    const h = time.getHours();
    const eveningPeak = h >= 18 && h <= 22;
    const solar = Math.max(0, Math.sin(((h - 6) / 12) * Math.PI));

    // Demo-only estimate. Replace with real QuickML predictions.
    const demand =
      122 +
      Math.max(0, inputs.temperature - 25) * 2.3 +
      inputs.humidity * 0.12 -
      solar * inputs.solar * 0.045 +
      Math.sin((h / 24) * Math.PI * 2) * 20 +
      (eveningPeak ? 34 : 0) +
      offset;

    const prediction = Math.max(40, Math.round(demand));

    return {
      timestamp: time.toISOString().slice(0, 19).replace('T', ' '),
      hour: time.toLocaleTimeString([], {
        hour: '2-digit',
        hour12: true,
      }),
      demand: prediction,
      mode: prediction > 160 || eveningPeak
        ? 'Renewable Storage'
        : 'Main Grid',
      alert: prediction >= 200,
    };
  });
}

function Icon({ name, size = 20 }) {
  const paths = {
    bolt: <path d="m13 2-9 12h7l-1 8 10-12h-7z" />,
    sun: <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32 1.41 1.41M2 12h2m16 0h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </>,
    grid: <>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M3 9h18M3 15h18M9 3v18m6-18v18" />
    </>,
    alert: <>
      <path d="m10.3 3.9-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.7-3.1l-8-14a2 2 0 0 0-3.4 0Z" />
      <path d="M12 9v4m0 4h.01" />
    </>,
    clock: <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>,
    upload: <>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <path d="m17 8-5-5-5 5m5-5v12" />
    </>,
    arrow: <path d="m7 17 10-10M7 7h10v10" />,
  };

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}

function StatCard({ icon, label, value, note, tone }) {
  return (
    <div className="stat-card">
      <div className={`stat-icon ${tone}`}>
        <Icon name={icon} size={21} />
      </div>
      <p className="stat-label">{label}</p>
      <div className="stat-value">{value}</div>
      <p className="stat-note">{note}</p>
    </div>
  );
}

function DemandChart({ data }) {
  const width = 760;
  const height = 245;
  const left = 42;
  const right = 14;
  const top = 16;
  const bottom = 34;
  const min = 40;
  const max = Math.max(240, Math.ceil(
    Math.max(...data.map((d) => d.demand), 200) / 50
  ) * 50);
  const x = (i) =>
    left + (i / Math.max(data.length - 1, 1)) * (width - left - right);
  const y = (v) =>
    top + ((max - v) / (max - min)) * (height - top - bottom);

  const line = data.map((d, i) =>
    `${i === 0 ? 'M' : 'L'} ${x(i)} ${y(d.demand)}`
  ).join(' ');

  const area =
    `${line} L ${x(data.length - 1)} ${height - bottom} ` +
    `L ${x(0)} ${height - bottom} Z`;

  return (
    <div className="chart-wrap">
      <div className="chart-legend">
        <span><i className="legend-dot blue" /> Predicted demand</span>
        <span><i className="legend-line" /> 200 kW critical threshold</span>
      </div>
      <svg
        className="demand-chart"
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label="Hourly energy demand forecast chart"
      >
        {[50, 100, 150, 200, 250].filter(v => v <= max).map(v => (
          <g key={v}>
            <line
              x1={left}
              y1={y(v)}
              x2={width - right}
              y2={y(v)}
              className="grid-line"
            />
            <text x={left - 9} y={y(v) + 4} className="axis-label" textAnchor="end">
              {v}
            </text>
          </g>
        ))}

        <line
          x1={left}
          y1={y(200)}
          x2={width - right}
          y2={y(200)}
          className="threshold-line"
        />

        <path d={area} className="chart-area" />
        <path d={line} className="chart-line" />

        {data.map((d, i) => (
          <circle
            key={d.timestamp}
            cx={x(i)}
            cy={y(d.demand)}
            r={d.alert ? 4 : 2.5}
            className={d.alert ? 'chart-point alert-point' : 'chart-point'}
          >
            <title>{`${d.timestamp}: ${d.demand} kW`}</title>
          </circle>
        ))}

        {data.filter((_, i) => i % 3 === 0).map(d => {
          const i = data.indexOf(d);
          return (
            <text
              key={d.timestamp}
              x={x(i)}
              y={height - 10}
              className="axis-label"
              textAnchor="middle"
            >
              {d.hour}
            </text>
          );
        })}
      </svg>
      <div className="chart-foot">
        <span>Next 24 hours</span>
        <span>Demand in kW</span>
      </div>
    </div>
  );
}

function App() {
  const [inputs, setInputs] = useState({
    temperature: 32,
    humidity: 65,
    solar: 650,
  });
  const [offset, setOffset] = useState(0);
  const [uploaded, setUploaded] = useState(false);
  const [message, setMessage] = useState('');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All');
  const fileRef = useRef(null);

  const forecast = useMemo(
    () => makeForecast(inputs, offset),
    [inputs, offset]
  );

  const peak = Math.max(...forecast.map(d => d.demand));
  const average = Math.round(
    forecast.reduce((sum, d) => sum + d.demand, 0) / forecast.length
  );
  const renewableHours = forecast.filter(
    d => d.mode === 'Renewable Storage'
  ).length;
  const alerts = forecast.filter(d => d.alert);

  const filtered = forecast.filter(d => {
    const matchesSearch = d.timestamp.toLowerCase().includes(search.toLowerCase());
    const matchesFilter =
      filter === 'All' ||
      (filter === 'Alerts' && d.alert) ||
      d.mode === filter;
    return matchesSearch && matchesFilter;
  });

  function updateInput(name, value) {
    setInputs(prev => ({ ...prev, [name]: Number(value) }));
  }

  function runDemoForecast() {
    setOffset(Math.round(Math.random() * 12) - 6);
    setMessage(
      'Demo forecast refreshed. Connect the backend to use real QuickML predictions.'
    );
  }

  function handleCSV(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = () => {
      const lines = String(reader.result).trim().split(/\r?\n/);
      const headers = lines[0].split(',').map(v => v.trim().toLowerCase());
      const required = [
        'timestamp',
        'ambient_temp_c',
        'humidity_pct',
        'solar_irradiance_wm2',
      ];

      if (!required.every(col => headers.includes(col))) {
        setMessage(
          'CSV needs timestamp, ambient_temp_c, humidity_pct, and solar_irradiance_wm2 columns.'
        );
        return;
      }

      const rows = lines.slice(1).filter(Boolean);
      if (rows.length !== 24) {
        setMessage(`Your CSV has ${rows.length} data rows. Upload exactly 24 rows for a full forecast.`);
        return;
      }

      const idx = Object.fromEntries(headers.map((h, i) => [h, i]));
      const parsed = rows.map(row => {
        const cols = row.split(',');
        return {
          timestamp: cols[idx.timestamp]?.trim(),
          temperature: Number(cols[idx.ambient_temp_c]),
          humidity: Number(cols[idx.humidity_pct]),
          solar: Number(cols[idx.solar_irradiance_wm2]),
        };
      });

      if (parsed.some(r =>
        !r.timestamp ||
        !Number.isFinite(r.temperature) ||
        !Number.isFinite(r.humidity) ||
        !Number.isFinite(r.solar)
      )) {
        setMessage('CSV contains missing or invalid feature values.');
        return;
      }

      setInputs({
        temperature: parsed[0].temperature,
        humidity: parsed[0].humidity,
        solar: parsed[0].solar,
      });
      setUploaded(true);
      setMessage(
        'CSV validated. This preview still uses demo estimates; connect QuickML to predict from all 24 uploaded rows.'
      );
    };

    reader.readAsText(file);
    event.target.value = '';
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#" aria-label="GridWise home">
          <span className="brand-mark"><Icon name="bolt" size={24} /></span>
          <span>gridwise<span className="brand-period">.</span></span>
        </a>

        <div className="workspace-label">WORKSPACE</div>
        <nav className="nav-list">
          <a className="nav-item active" href="#dashboard">
            <span className="nav-symbol"><Icon name="grid" /></span>
            Overview
          </a>
          <a className="nav-item" href="#forecast">
            <span className="nav-symbol"><Icon name="clock" /></span>
            Demand forecast
          </a>
          <a className="nav-item" href="#controls">
            <span className="nav-symbol"><Icon name="sun" /></span>
            Energy controls
          </a>
          <a className="nav-item" href="#alerts">
            <span className="nav-symbol"><Icon name="alert" /></span>
            Alerts
            {alerts.length > 0 && <span className="nav-count">{alerts.length}</span>}
          </a>
        </nav>

        <div className="sidebar-bottom">
          <div className="connection-indicator"><span /> UI running</div>
          <div className="sidebar-project">HACKSPHERE 3.0</div>
          <p>Smart Energy Microgrid</p>
          <div className="sidebar-footer">Forecasting engine · Prototype</div>
        </div>
      </aside>

      <main className="main-content" id="dashboard">
        <header className="topbar">
          <div className="breadcrumb">Energy systems <span>/</span> Overview</div>
          <div className="topbar-right">
            <span className="environment-tag"><span /> DEMO MODE</span>
            <div className="avatar">GW</div>
          </div>
        </header>

        <div className="page-content">
          <section className="page-heading">
            <div>
              <div className="eyebrow">MICROGRID INTELLIGENCE</div>
              <h1>Energy overview</h1>
              <p>Forecast demand, anticipate peak loads, and plan energy modes.</p>
            </div>
            <button className="primary-button" onClick={runDemoForecast}>
              <Icon name="bolt" size={17} /> Refresh forecast
            </button>
          </section>

          {message && (
            <div className="notice" role="status">
              <span>{message}</span>
              <button onClick={() => setMessage('')} aria-label="Dismiss message">×</button>
            </div>
          )}

          <section className="stats-grid">
            <StatCard
              icon="bolt"
              label="Average forecast demand"
              value={`${average} kW`}
              note="Mean across 24 forecast hours"
              tone="blue-tone"
            />
            <StatCard
              icon="arrow"
              label="Peak forecast demand"
              value={`${peak} kW`}
              note={peak >= 200 ? 'Critical threshold reached' : 'Below critical threshold'}
              tone="orange-tone"
            />
            <StatCard
              icon="sun"
              label="Renewable storage hours"
              value={`${renewableHours}/24`}
              note="Based on demand and time rules"
              tone="green-tone"
            />
            <StatCard
              icon="alert"
              label="Critical overload alerts"
              value={alerts.length}
              note="Demand ≥ 200 kW"
              tone="red-tone"
            />
          </section>

          <section className="content-grid" id="forecast">
            <div className="panel chart-panel">
              <div className="panel-heading">
                <div>
                  <h2>Demand forecast</h2>
                  <p>Predicted hourly electricity demand</p>
                </div>
                <span className="small-pill">24 HOURS</span>
              </div>
              <DemandChart data={forecast} />
              <div className="chart-summary">
                <div>
                  <span className="summary-dot blue" />
                  <span>Average demand</span>
                  <strong>{average} kW</strong>
                </div>
                <div>
                  <span className="summary-dot orange" />
                  <span>Peak demand</span>
                  <strong>{peak} kW</strong>
                </div>
              </div>
            </div>

            <div className="panel mode-panel" id="controls">
              <div className="panel-heading">
                <div>
                  <h2>Energy mode</h2>
                  <p>Rule-based operating status</p>
                </div>
                <span className="live-dot" />
              </div>

              <div className={`mode-display ${forecast[0].mode === 'Main Grid' ? 'grid-mode' : 'storage-mode'}`}>
                <div className="mode-icon">
                  <Icon name={forecast[0].mode === 'Main Grid' ? 'grid' : 'sun'} size={25} />
                </div>
                <div>
                  <span className="mode-overline">CURRENT FORECAST HOUR</span>
                  <h3>{forecast[0].mode}</h3>
                  <p>{forecast[0].demand} kW predicted demand</p>
                </div>
              </div>

              <div className="rule-list">
                <div className="rule-row">
                  <span className="rule-bullet orange" />
                  <div>
                    <strong>Renewable Storage Mode</strong>
                    <p>Demand above 160 kW or between 18:00–22:00.</p>
                  </div>
                </div>
                <div className="rule-row">
                  <span className="rule-bullet blue" />
                  <div>
                    <strong>Main Grid Mode</strong>
                    <p>Demand at or below 160 kW outside the evening window.</p>
                  </div>
                </div>
                <div className="rule-row">
                  <span className="rule-bullet red" />
                  <div>
                    <strong>Critical overload</strong>
                    <p>Trigger an alert when demand reaches 200 kW.</p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="panel input-panel">
            <div className="panel-heading">
              <div>
                <h2>Environmental inputs</h2>
                <p>Adjust sample conditions to explore the demo forecast.</p>
              </div>
              <span className="small-pill">FEATURES</span>
            </div>

            <div className="inputs-grid">
              <label className="field">
                <span>Ambient temperature</span>
                <div className="input-with-unit">
                  <input
                    type="number"
                    min="-10"
                    max="60"
                    value={inputs.temperature}
                    onChange={e => updateInput('temperature', e.target.value)}
                  />
                  <span>°C</span>
                </div>
              </label>
              <label className="field">
                <span>Humidity</span>
                <div className="input-with-unit">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={inputs.humidity}
                    onChange={e => updateInput('humidity', e.target.value)}
                  />
                  <span>%</span>
                </div>
              </label>
              <label className="field">
                <span>Solar irradiance</span>
                <div className="input-with-unit">
                  <input
                    type="number"
                    min="0"
                    max="1400"
                    value={inputs.solar}
                    onChange={e => updateInput('solar', e.target.value)}
                  />
                  <span>W/m²</span>
                </div>
              </label>
              <div className="upload-field">
                <input
                  ref={fileRef}
                  type="file"
                  accept=".csv,text/csv"
                  onChange={handleCSV}
                  hidden
                />
                <button className="secondary-button" onClick={() => fileRef.current?.click()}>
                  <Icon name="upload" size={17} />
                  Upload 24-hour CSV
                </button>
                <span>{uploaded ? 'CSV validated' : 'CSV with 24 feature rows'}</span>
              </div>
            </div>
            <div className="demo-disclaimer">
              <Icon name="alert" size={16} />
              Demo estimates only — environmental inputs are illustrative, not a trained ML model.
            </div>
          </section>

          <section className="panel table-panel" id="alerts">
            <div className="panel-heading table-heading">
              <div>
                <h2>Hourly forecast schedule</h2>
                <p>24 forecast rows with timestamp and operating mode</p>
              </div>
              <span className="row-count">{filtered.length} rows</span>
            </div>

            <div className="table-controls">
              <input
                className="search-input"
                type="search"
                placeholder="Search timestamp..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              <select value={filter} onChange={e => setFilter(e.target.value)} aria-label="Filter forecast rows">
                <option>All</option>
                <option>Main Grid</option>
                <option>Renewable Storage</option>
                <option>Alerts</option>
              </select>
            </div>

            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>Predicted demand</th>
                    <th>Operating mode</th>
                    <th>Alert status</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(row => (
                    <tr key={row.timestamp}>
                      <td className="timestamp-cell">{row.timestamp}</td>
                      <td className="demand-cell">{row.demand} <span>kW</span></td>
                      <td>
                        <span className={`mode-badge ${row.mode === 'Main Grid' ? 'badge-grid' : 'badge-storage'}`}>
                          {row.mode}
                        </span>
                      </td>
                      <td>
                        {row.alert
                          ? <span className="alert-badge"><span /> Critical overload</span>
                          : <span className="safe-status">Normal</span>}
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr><td colSpan="4" className="empty-state">No matching forecast rows.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <footer className="page-footer">
            <span>GRIDWISE <span className="brand-period">.</span> · HACKSPHERE 3.0</span>
            <span>Smart Energy Microgrid & Demand Forecasting Engine</span>
          </footer>
        </div>
      </main>
    </div>
  );
}

export default App;
