// ============================================================
// DocRx — Analytics & Outbreak Dashboard Page
// ============================================================
import { queryAll } from '../db/index.js';

export function renderAnalytics(container) {
  let periodDays = 30;
  let topDxChartInstance = null;
  let volumeChartInstance = null;

  function loadAndRender() {
    const cutoffDate = getCutoffDate(periodDays);
    
    // 1. Fetch visits for diagnosis aggregation
    const visits = queryAll(
      `SELECT diagnosis, visit_date FROM visits WHERE deleted=0 AND visit_date >= ?`,
      [cutoffDate]
    );

    // Aggregate diagnoses in JS to handle comma-separated lists correctly
    const dxCounts = {};
    visits.forEach(v => {
      if (!v.diagnosis) return;
      v.diagnosis.split(',').forEach(d => {
        const cleaned = d.trim();
        if (cleaned) {
          dxCounts[cleaned] = (dxCounts[cleaned] || 0) + 1;
        }
      });
    });

    // Sort and get top 8 diagnoses
    const sortedDx = Object.entries(dxCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8);

    // 2. Fetch daily visit counts for volume trends
    const volumeData = queryAll(
      `SELECT visit_date, COUNT(*) as count FROM visits 
       WHERE deleted=0 AND visit_date >= ? 
       GROUP BY visit_date ORDER BY visit_date ASC`,
      [cutoffDate]
    );

    // 3. Outbreak Detection Logic (Lookback last 7 days)
    const sevenDaysAgo = getCutoffDate(7);
    const recentVisits = queryAll(
      `SELECT diagnosis FROM visits WHERE deleted=0 AND visit_date >= ?`,
      [sevenDaysAgo]
    );

    const recentDxCounts = {};
    recentVisits.forEach(v => {
      if (!v.diagnosis) return;
      v.diagnosis.split(',').forEach(d => {
        const cleaned = d.trim();
        if (cleaned) {
          recentDxCounts[cleaned] = (recentDxCounts[cleaned] || 0) + 1;
        }
      });
    });

    // Diagnoses with 3 or more cases in the last 7 days trigger warning alerts
    const outbreaks = Object.entries(recentDxCounts)
      .filter(([_, count]) => count >= 3)
      .sort((a, b) => b[1] - a[1]);

    renderUI(sortedDx, volumeData, outbreaks);
  }

  function renderUI(topDx, volumeData, outbreaks) {
    const isLight = document.documentElement.classList.contains('light-theme');
    const labelColor = isLight ? '#475569' : '#94a3b8';
    const gridColor = isLight ? '#cbd5e1' : 'rgba(255, 255, 255, 0.08)';

    container.innerHTML = `
      <div class="page-header">
        <div>
          <h1 class="page-title">Analytics & Outbreaks</h1>
          <p class="page-subtitle">Monitor practice statistics and disease outbreaks</p>
        </div>
        <div class="flex gap-1" style="background:var(--glass-bg);border:1px solid var(--glass-border);border-radius:var(--radius-lg);padding:4px;">
          ${[30, 60, 90].map(d => `
            <button class="btn ${periodDays === d ? 'btn-primary' : 'btn-ghost'} btn-sm" id="btn-period-${d}">
              Last ${d} Days
            </button>
          `).join('')}
        </div>
      </div>

      <div class="page-content slide-up">
        
        <!-- Outbreak Alert Section -->
        ${outbreaks.length > 0 ? `
          <div class="clinical-alert-strip mb-6">
            <svg class="alert-icon" width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div class="clinical-alert-content">
              <div class="clinical-alert-title">Potential Disease Outbreak Detected</div>
              <div class="clinical-alert-text">
                The following diagnosis codes have seen a high case volume in the last 7 days:
                <ul style="margin-top: 6px; padding-left: 18px; font-weight: 600;">
                  ${outbreaks.map(([dx, count]) => `
                    <li>${dx}: <span style="text-decoration: underline;">${count} cases</span></li>
                  `).join('')}
                </ul>
              </div>
            </div>
          </div>
        ` : `
          <div class="alert alert-success mb-6" style="background:var(--success-soft); border-color:var(--success-border); color:var(--success-text);">
            <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>No active outbreak warnings detected in the past 7 days.</div>
          </div>
        `}

        <!-- Charts Grid -->
        <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(340px, 1fr)); gap:24px;">
          
          <!-- Diagnosis Distribution Card -->
          <div class="card card-p">
            <div class="section-title">Top Diagnoses</div>
            <div style="height: 280px; position: relative;">
              ${topDx.length === 0 ? `
                <div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--text-tertiary);">No diagnoses recorded in this period.</div>
              ` : `
                <canvas id="topDxChart"></canvas>
              `}
            </div>
          </div>

          <!-- Practice Volume Card -->
          <div class="card card-p">
            <div class="section-title">Visit Volume Trend</div>
            <div style="height: 280px; position: relative;">
              ${volumeData.length === 0 ? `
                <div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--text-tertiary);">No patient visits in this period.</div>
              ` : `
                <canvas id="volumeChart"></canvas>
              `}
            </div>
          </div>

        </div>

      </div>
    `;

    // Hook filters
    [30, 60, 90].forEach(d => {
      container.querySelector(`#btn-period-${d}`)?.addEventListener('click', () => {
        periodDays = d;
        loadAndRender();
      });
    });

    // Initialize ChartJs Instances
    if (topDxChartInstance) {
      topDxChartInstance.destroy();
      topDxChartInstance = null;
    }
    if (volumeChartInstance) {
      volumeChartInstance.destroy();
      volumeChartInstance = null;
    }

    if (topDx.length > 0 && typeof Chart !== 'undefined') {
      const ctx = document.getElementById('topDxChart')?.getContext('2d');
      if (ctx) {
        topDxChartInstance = new Chart(ctx, {
          type: 'bar',
          data: {
            labels: topDx.map(x => x[0]),
            datasets: [{
              label: 'Cases',
              data: topDx.map(x => x[1]),
              backgroundColor: isLight ? 'rgba(8, 145, 178, 0.7)' : 'rgba(34, 211, 238, 0.6)',
              borderColor: isLight ? 'rgb(8, 145, 178)' : 'rgb(34, 211, 238)',
              borderWidth: 1,
              borderRadius: 6
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { display: false }
            },
            scales: {
              x: {
                grid: { display: false },
                ticks: { color: labelColor }
              },
              y: {
                grid: { color: gridColor },
                ticks: { color: labelColor, stepSize: 1, precision: 0 }
              }
            }
          }
        });
      }
    }

    if (volumeData.length > 0 && typeof Chart !== 'undefined') {
      const ctx = document.getElementById('volumeChart')?.getContext('2d');
      if (ctx) {
        volumeChartInstance = new Chart(ctx, {
          type: 'line',
          data: {
            labels: volumeData.map(x => formatChartDate(x.visit_date)),
            datasets: [{
              label: 'Visits',
              data: volumeData.map(x => x.count),
              borderColor: isLight ? '#0284c7' : '#38bdf8',
              backgroundColor: isLight ? 'rgba(2, 132, 199, 0.08)' : 'rgba(56, 189, 248, 0.1)',
              borderWidth: 2.5,
              tension: 0.3,
              fill: true,
              pointBackgroundColor: isLight ? '#0284c7' : '#38bdf8',
              pointRadius: 4
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { display: false }
            },
            scales: {
              x: {
                grid: { display: false },
                ticks: { color: labelColor }
              },
              y: {
                grid: { color: gridColor },
                ticks: { color: labelColor, stepSize: 1, precision: 0 }
              }
            }
          }
        });
      }
    }
  }

  // Helper date calculators
  function getCutoffDate(days) {
    const d = new Date();
    d.setDate(d.getDate() - days);
    return d.toISOString().split('T')[0];
  }

  function formatChartDate(dtString) {
    if (!dtString) return '';
    const parts = dtString.split('-');
    if (parts.length < 3) return dtString;
    // Return "DD MMM" format
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const mIdx = parseInt(parts[1], 10) - 1;
    return `${parseInt(parts[2], 10)} ${months[mIdx]}`;
  }

  // Setup leak-proof listener for theme changes
  const themeListener = () => {
    if (!document.body.contains(container)) {
      window.removeEventListener('docrx-theme-changed', themeListener);
      return;
    }
    loadAndRender();
  };
  window.addEventListener('docrx-theme-changed', themeListener);

  loadAndRender();
}
