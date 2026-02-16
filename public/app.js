const { useState, useEffect, useRef } = React;

const API = '/api';

// SDLC Maturity criteria aligned with FFIEC guidelines
const maturityCriteria = {
    "Requirements & Planning": [
        { id: "rp1", name: "Requirements & Risk Management", levels: ["None/Ad-hoc", "Basic documentation", "Standardized & documented", "Comprehensive & traceable", "Integrated risk mgmt"] },
        { id: "rp2", name: "Change & Stakeholder Management", levels: ["Informal/minimal", "Basic process", "Formal approval & engagement", "Integrated governance", "Automated & auditable"] }
    ],
    "Design & Architecture": [
        { id: "da1", name: "Architecture & Documentation", levels: ["None/Outdated", "Basic diagrams", "Standard documentation", "Comprehensive & current", "Enterprise-aligned"] },
        { id: "da2", name: "Security & Performance Design", levels: ["Not considered", "Basic awareness", "Security reviews & patterns", "Threat modeling & testing", "Zero-trust & auto-scaling"] }
    ],
    "Development & Code Quality": [
        { id: "dc1", name: "Coding Standards & Reviews", levels: ["None", "Informal guidelines", "Documented & required", "Structured & enforced", "Automated compliance"] },
        { id: "dc2", name: "Version Control & Technical Debt", levels: ["None/minimal", "Basic usage", "Branching strategy & tracking", "Advanced practices & prioritization", "GitOps & continuous reduction"] },
        { id: "dc3", name: "AI Coding Assistants & Agentic Development", levels: ["None/not used", "Individual ad-hoc use (e.g. Copilot)", "Team-wide adoption with guidelines", "Integrated into workflows & code review", "Agentic development with autonomous AI agents"] }
    ],
    "Testing & Quality Assurance": [
        { id: "tq1", name: "Test Coverage & Automation", levels: ["<20% manual only", "20-40% some automation", "40-60% unit + integration", "60-80% comprehensive", ">80% AI-assisted"] },
        { id: "tq2", name: "Security & Performance Testing", levels: ["None", "Manual/pre-prod only", "Automated SAST & regular tests", "SAST + DAST + continuous", "Full DevSecOps + chaos"] }
    ],
    "Security & Compliance": [
        { id: "sc1", name: "Vulnerability & Access Management", levels: ["Reactive/shared credentials", "Periodic scans & individual accounts", "Regular scanning & RBAC", "Automated remediation & MFA", "Continuous monitoring & zero-trust"] },
        { id: "sc2", name: "Data Protection & Compliance", levels: ["Minimal/none", "Basic encryption & annual audits", "Classification & quarterly reviews", "Encryption at rest/transit & continuous monitoring", "DLP + tokenization + automated compliance"] }
    ],
    "Deployment & Release": [
        { id: "dr1", name: "CI/CD & Environment Management", levels: ["Manual/prod only", "Basic automation & dev+prod", "CI pipeline & dev/test/prod", "CD pipeline & multiple non-prod", "Progressive delivery & ephemeral"] },
        { id: "dr2", name: "Deployment Validation & Documentation", levels: ["Manual/minimal", "Smoke tests & release notes", "Automated testing & change logs", "Canary deployments & comprehensive docs", "Blue-green + automated changelog"] }
    ],
    "Operations & Monitoring": [
        { id: "om1", name: "Monitoring & Incident Response", levels: ["None/ad-hoc", "Basic monitoring & procedures", "APM tools & runbooks", "Full observability & automated detection", "AIOps & self-healing"] },
        { id: "om2", name: "Logging & Disaster Recovery", levels: ["Minimal/no plan", "Application logs & basic backup", "Centralized logging & DR plan", "SIEM integration & tested quarterly", "Real-time analysis & automated failover"] }
    ],
    "Governance & Documentation": [
        { id: "gd1", name: "SDLC Documentation & Audit Trail", levels: ["None/outdated", "Basic procedures & manual records", "Standard templates & tracking", "Comprehensive & automated logging", "Integrated knowledge mgmt & immutable logs"] },
        { id: "gd2", name: "Policy Compliance & Training", levels: ["No policies/none", "Informal guidelines & ad-hoc", "Documented policies & onboarding", "Enforced & regular training", "Automated enforcement & continuous learning"] }
    ]
};

const ffiecLevels = [
    { level: 1, name: "Baseline", description: "Minimal controls, reactive approach", color: "bg-red-500" },
    { level: 2, name: "Evolving", description: "Awareness and basic processes", color: "bg-orange-500" },
    { level: 3, name: "Intermediate", description: "Documented and repeatable", color: "bg-yellow-500" },
    { level: 4, name: "Advanced", description: "Integrated and measured", color: "bg-blue-500" },
    { level: 5, name: "Innovative", description: "Optimized and adaptive", color: "bg-green-500" }
];

function calculateMaturityScore(scoresSnapshot) {
    if (!scoresSnapshot || Object.keys(scoresSnapshot).length === 0) return 0;
    const totalScore = Object.values(scoresSnapshot).reduce((sum, level) => sum + level, 0);
    // Normalize old assessments: if dc3 is missing, use original 16-criteria max (64)
    // Otherwise use current 17-criteria max (68)
    const isOldAssessment = !(scoresSnapshot.hasOwnProperty('dc3'));
    const totalCriteria = isOldAssessment ? 16 : Object.values(maturityCriteria).reduce((sum, cat) => sum + cat.length, 0);
    const maxScore = totalCriteria * 4;
    return Math.round((totalScore / maxScore) * 100);
}

function getFFIECLevel(score) {
    if (score >= 80) return ffiecLevels[4];
    if (score >= 60) return ffiecLevels[3];
    if (score >= 40) return ffiecLevels[2];
    if (score >= 20) return ffiecLevels[1];
    return ffiecLevels[0];
}

function getCategoryScore(category, scoresSnapshot) {
    const criteria = maturityCriteria[category];
    // For old assessments (missing dc3), exclude dc3 from "Development & Code Quality" calculations
    const isOldAssessment = !(scoresSnapshot && scoresSnapshot.hasOwnProperty('dc3'));
    const criteriaToUse = (isOldAssessment && category === "Development & Code Quality") 
        ? criteria.filter(c => c.id !== 'dc3')
        : criteria;
    const scores = criteriaToUse.map(c => (scoresSnapshot || {})[c.id] || 0);
    const total = scores.reduce((sum, s) => sum + s, 0);
    const max = criteriaToUse.length * 4;
    return max ? Math.round((total / max) * 100) : 0;
}

function SDLCMaturityTracker() {
    const [applications, setApplications] = useState([]);
    const [teams, setTeams] = useState([]);
    const [selectedApplication, setSelectedApplication] = useState(null);
    const [view, setView] = useState("applications"); // applications | applicationDetail | assessment | comparison | api | teams
    const [assessmentScope, setAssessmentScope] = useState(null); // null | { applicationId, teamId: null } | { applicationId, teamId: string }
    const [assessmentData, setAssessmentData] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [newAppName, setNewAppName] = useState("");
    const [newAppDescription, setNewAppDescription] = useState("");
    const [newAppType, setNewAppType] = useState("Custom");
    const [newTeamName, setNewTeamName] = useState("");
    const [addTeamAppId, setAddTeamAppId] = useState(null);
    const [editingAppId, setEditingAppId] = useState(null);
    const [editingAppName, setEditingAppName] = useState("");
    const [editingTeamId, setEditingTeamId] = useState(null);
    const [editingTeamName, setEditingTeamName] = useState("");
    const chartRef = useRef(null);
    const radarChartRef = useRef(null);
    const historyChartRef = useRef(null);

    const loadApplications = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(API + '/applications');
            if (!res.ok) throw new Error(res.statusText);
            const data = await res.json();
            setApplications(data);
        } catch (err) {
            setError(err.message);
            setApplications([]);
        } finally {
            setLoading(false);
        }
    };

    const loadTeams = async () => {
        try {
            const res = await fetch(API + '/teams');
            if (!res.ok) throw new Error(res.statusText);
            const data = await res.json();
            setTeams(data);
        } catch (err) {
            setTeams([]);
        }
    };

    const loadApplicationDetail = async (id) => {
        try {
            const res = await fetch(API + '/applications/' + id);
            if (!res.ok) throw new Error(res.statusText);
            const app = await res.json();
            setSelectedApplication(app);
        } catch (err) {
            setError(err.message);
            setSelectedApplication(null);
        }
    };

    useEffect(() => { loadApplications(); loadTeams(); }, []);

    const addApplication = async (e) => {
        e.preventDefault();
        if (!newAppName.trim()) return;
        try {
            const res = await fetch(API + '/applications', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newAppName.trim(), description: newAppDescription.trim() || null, type: newAppType })
            });
            if (!res.ok) throw new Error((await res.json()).error || res.statusText);
            setNewAppName("");
            setNewAppDescription("");
            await loadApplications();
        } catch (err) {
            setError(err.message);
        }
    };

    const updateApplicationName = async (id, newName) => {
        if (!newName.trim()) return;
        try {
            const res = await fetch(API + '/applications/' + id, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newName.trim() })
            });
            if (!res.ok) throw new Error((await res.json()).error || res.statusText);
            setEditingAppId(null);
            setEditingAppName("");
            await loadApplications();
            if (selectedApplication?.id === id) {
                await loadApplicationDetail(id);
            }
        } catch (err) {
            setError(err.message);
        }
    };

    const deleteApplication = async (id) => {
        try {
            const res = await fetch(API + '/applications/' + id, { method: 'DELETE' });
            if (!res.ok) throw new Error(res.statusText);
            if (selectedApplication?.id === id) { setSelectedApplication(null); setView("applications"); }
            await loadApplications();
        } catch (err) {
            setError(err.message);
        }
    };

    const addTeamToApplication = async (applicationId, teamId) => {
        const appId = (applicationId || selectedApplication?.id || '').toString().trim();
        const tid = (teamId || '').toString().trim();
        if (!appId || appId.length < 10 || !tid || tid.length < 10) {
            setError('Please select a team from the list. If you just added the application, go back to Applications and open it again first.');
            return;
        }
        setError(null);
        try {
            const url = API + '/applications/' + encodeURIComponent(appId) + '/teams';
            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ teamId: tid })
            });
            let errMsg = res.statusText;
            try {
                const text = await res.text();
                if (text) {
                    const data = JSON.parse(text);
                    if (data && typeof data.error === 'string') errMsg = data.error;
                    else if (data && data.details) errMsg += ' ' + JSON.stringify(data.details);
                }
            } catch (_) {}
            if (res.status === 404 && errMsg === 'Not Found') {
                errMsg = 'Application or team not found. Go back to Applications, open this app again, then try linking the team.';
            }
            if (!res.ok) throw new Error(errMsg);
            setAddTeamAppId(null);
            await loadApplicationDetail(appId);
            await loadApplications();
        } catch (err) {
            setError(err.message);
        }
    };

    const removeTeamFromApplication = async (applicationId, teamId) => {
        try {
            const res = await fetch(API + '/applications/' + applicationId + '/teams/' + teamId, { method: 'DELETE' });
            if (!res.ok) throw new Error(res.statusText);
            await loadApplicationDetail(applicationId);
            await loadApplications();
        } catch (err) {
            setError(err.message);
        }
    };

    const createTeam = async () => {
        if (!newTeamName.trim()) return;
        try {
            const res = await fetch(API + '/teams', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newTeamName.trim() })
            });
            if (!res.ok) throw new Error((await res.json()).error || res.statusText);
            setNewTeamName("");
            await loadTeams();
        } catch (err) {
            setError(err.message);
        }
    };

    const updateTeamName = async (id, newName) => {
        if (!newName.trim()) return;
        try {
            const res = await fetch(API + '/teams/' + id, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newName.trim() })
            });
            if (!res.ok) throw new Error((await res.json()).error || res.statusText);
            setEditingTeamId(null);
            setEditingTeamName("");
            await loadTeams();
            if (selectedApplication) await loadApplicationDetail(selectedApplication.id);
            await loadApplications();
        } catch (err) {
            setError(err.message);
        }
    };

    const deleteTeam = async (teamId, teamName) => {
        if (!confirm('Remove team "' + (teamName || 'this team') + '"? This will unlink them from all applications.')) return;
        setError(null);
        try {
            const res = await fetch(API + '/teams/' + teamId, { method: 'DELETE' });
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.error || res.statusText);
            }
            await loadTeams();
            await loadApplications();
            if (selectedApplication) await loadApplicationDetail(selectedApplication.id);
        } catch (err) {
            setError(err.message);
        }
    };

    const openAssessment = (applicationId, teamId, existingScores) => {
        setAssessmentScope(teamId == null ? { applicationId, teamId: null } : { applicationId, teamId });
        setAssessmentData(existingScores || {});
        setView("assessment");
    };

    const saveAssessment = async () => {
        if (!assessmentScope) return;
        setError(null);
        const payload = {
            applicationId: assessmentScope.applicationId,
            scores: assessmentData
        };
        if (assessmentScope.teamId != null && assessmentScope.teamId !== '') payload.teamId = assessmentScope.teamId;
        try {
            const res = await fetch(API + '/assessments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            let errMsg = res.statusText;
            try {
                const data = await res.json();
                if (data && typeof data.error === 'string') errMsg = data.error;
                if (data && data.details) errMsg += ' ' + JSON.stringify(data.details);
            } catch (_) {}
            if (!res.ok) throw new Error(errMsg);
            setView("applicationDetail");
            setAssessmentScope(null);
            if (selectedApplication) await loadApplicationDetail(selectedApplication.id);
            await loadApplications();
        } catch (err) {
            setError(err.message);
        }
    };

    const openApplicationDetail = async (app) => {
        setView("applicationDetail");
        setError(null);
        try {
            const res = await fetch(API + '/applications/' + encodeURIComponent(app.id));
            if (!res.ok) throw new Error(res.status === 404 ? 'Application not found' : res.statusText);
            const full = await res.json();
            setSelectedApplication(full);
        } catch (err) {
            setError(err.message);
            setSelectedApplication(null);
            setView("applications");
        }
    };

    const exportToCSV = async () => {
        const apps = applications.length ? applications : await (await fetch(API + '/applications')).json();
        const rows = [];
        for (const app of apps) {
            const res = await fetch(API + '/applications/' + app.id + '/assessments');
            const assessments = res.ok ? await res.json() : [];
            for (const a of assessments) {
                const scores = a.scoresSnapshot || {};
                const overall = calculateMaturityScore(scores);
                const level = getFFIECLevel(overall);
                const scope = a.teamId ? (teams.find(t => t.id === a.teamId)?.name || a.teamId) : 'Application';
                rows.push({
                    application: app.name,
                    type: app.type,
                    scope,
                    overall,
                    level: level.name,
                    updated: a.updatedAt
                });
            }
            if (assessments.length === 0) {
                rows.push({ application: app.name, type: app.type, scope: '-', overall: '', level: '', updated: '' });
            }
        }
        const csv = 'Application,Type,Scope,Overall Score,Maturity Level,Last Updated\n' +
            rows.map(r => `"${r.application}","${r.type}","${r.scope}",${r.overall},"${r.level}","${r.updated}"`).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'sdlc-maturity-export-' + new Date().toISOString().split('T')[0] + '.csv';
        a.click();
        URL.revokeObjectURL(a.href);
    };

    const exportToJSON = async () => {
        const apps = applications.length ? applications : await (await fetch(API + '/applications')).json();
        const out = { exportDate: new Date().toISOString(), applications: [] };
        for (const app of apps) {
            const res = await fetch(API + '/applications/' + app.id + '/assessments');
            const assessments = res.ok ? await res.json() : [];
            out.applications.push({
                id: app.id,
                name: app.name,
                type: app.type,
                description: app.description,
                teams: (app.teams || []).map(at => ({ id: at.team?.id, name: at.team?.name })),
                assessments: assessments.map(a => ({
                    scope: a.teamId ? 'team' : 'application',
                    teamId: a.teamId,
                    scoresSnapshot: a.scoresSnapshot,
                    assessmentDate: a.assessmentDate,
                    updatedAt: a.updatedAt
                }))
            });
        }
        const a = document.createElement('a');
        a.href = 'data:application/json,' + encodeURIComponent(JSON.stringify(out, null, 2));
        a.download = 'sdlc-maturity-export-' + new Date().toISOString().split('T')[0] + '.json';
        a.click();
    };

    useEffect(() => {
        if (view !== "comparison" || !applications.length || !chartRef.current) return;
        const ctx = chartRef.current.getContext('2d');
        if (chartRef.current.chart) chartRef.current.chart.destroy();
        const appScores = applications.map(app => {
            const appLevel = app.assessments?.find(a => !a.teamId);
            const score = appLevel ? calculateMaturityScore(appLevel.scoresSnapshot) : 0;
            return { name: app.name, score };
        }).sort((a, b) => b.score - a.score);
        const colors = ['#22c55e', '#3b82f6', '#eab308', '#f97316', '#ef4444'];
        chartRef.current.chart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: appScores.map(a => a.name),
                datasets: [{ label: 'Application maturity', data: appScores.map(a => a.score), backgroundColor: appScores.map(a => colors[getFFIECLevel(a.score).level - 1]) }]
            },
            options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, max: 100 } } }
        });
    }, [view, applications]);

    useEffect(() => {
        if (view !== "applicationDetail" || !selectedApplication?.assessments?.length || !historyChartRef.current) return;
        const appOnly = selectedApplication.assessments.filter(a => !a.teamId);
        if (appOnly.length === 0) return;
        const ctx = historyChartRef.current.getContext('2d');
        if (historyChartRef.current.chart) historyChartRef.current.chart.destroy();
        const sorted = appOnly.slice().sort((a, b) => new Date(a.assessmentDate) - new Date(b.assessmentDate));
        historyChartRef.current.chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: sorted.map(a => new Date(a.assessmentDate).toLocaleDateString()),
                datasets: [{
                    label: 'Application maturity %',
                    data: sorted.map(a => calculateMaturityScore(a.scoresSnapshot || {})),
                    borderColor: '#22d3ee',
                    backgroundColor: 'rgba(34, 211, 238, 0.1)',
                    fill: true,
                    tension: 0.2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: { beginAtZero: true, max: 100 },
                    x: { title: { display: true, text: 'Assessment date' } }
                }
            }
        });
    }, [view, selectedApplication]);

    useEffect(() => {
        if (view !== "comparison" || !applications.length || !radarChartRef.current) return;
        const ctx = radarChartRef.current.getContext('2d');
        if (radarChartRef.current.chart) radarChartRef.current.chart.destroy();
        const categories = Object.keys(maturityCriteria);
        const colors = ['#3b82f6', '#22c55e', '#eab308'];
        const datasets = applications.slice(0, 3).map((app, idx) => {
            const a = app.assessments?.find(x => !x.teamId);
            const scores = a?.scoresSnapshot || {};
            return {
                label: app.name,
                data: categories.map(cat => getCategoryScore(cat, scores)),
                borderColor: colors[idx],
                backgroundColor: colors[idx] + '20',
                pointBackgroundColor: colors[idx]
            };
        });
        radarChartRef.current.chart = new Chart(ctx, {
            type: 'radar',
            data: { labels: categories, datasets },
            options: { responsive: true, maintainAspectRatio: false, scales: { r: { beginAtZero: true, max: 100 } } }
        });
    }, [view, applications]);

    const comparisonRows = [];
    applications.forEach(app => {
        const appAssessment = app.assessments?.find(a => !a.teamId);
        const appScore = appAssessment ? calculateMaturityScore(appAssessment.scoresSnapshot) : null;
        if (appScore != null) comparisonRows.push({ app: app.name, scope: 'Application', score: appScore });
    });

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
            <div className="max-w-7xl mx-auto">
                <div className="bg-gradient-to-r from-slate-800 to-slate-700 rounded-lg shadow-2xl p-6 mb-6 border border-cyan-500/30">
                    <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400 mb-2">AppCompass</h1>
                    <p className="text-slate-300">Navigating the wild landscape of our software lifecycle.</p>
                </div>

                {error && (
                    <div className="bg-red-900/30 border border-red-500 rounded-lg p-4 mb-4 text-red-200">{error}</div>
                )}

                <div className="bg-slate-800 rounded-lg shadow-2xl p-4 mb-6 border border-slate-700">
                    <div className="flex justify-between items-center flex-wrap gap-2">
                        <div className="flex gap-2">
                            <button onClick={() => { setView("applications"); setSelectedApplication(null); }} className={`px-4 py-2 rounded-lg font-medium transition ${view === "applications" ? "bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg" : "bg-slate-700 text-slate-300 hover:bg-slate-600 border border-slate-600"}`}>Applications</button>
                            <button onClick={() => setView("comparison")} className={`px-4 py-2 rounded-lg font-medium transition ${view === "comparison" ? "bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg" : "bg-slate-700 text-slate-300 hover:bg-slate-600 border border-slate-600"}`}>Comparison</button>
                            <button onClick={() => setView("teams")} className={`px-4 py-2 rounded-lg font-medium transition ${view === "teams" ? "bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg" : "bg-slate-700 text-slate-300 hover:bg-slate-600 border border-slate-600"}`}>Teams</button>
                            <button onClick={() => setView("api")} className={`px-4 py-2 rounded-lg font-medium transition ${view === "api" ? "bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg" : "bg-slate-700 text-slate-300 hover:bg-slate-600 border border-slate-600"}`}>Docs</button>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={exportToCSV} className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-green-500 text-white rounded-lg hover:from-emerald-600 font-medium shadow-lg">Export CSV</button>
                            <button onClick={exportToJSON} className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 font-medium shadow-lg">Export JSON</button>
                        </div>
                    </div>
                </div>

                {view === "applications" && (
                    <>
                        <div className="bg-slate-800 rounded-lg shadow-2xl p-6 mb-6 border border-slate-700">
                            <h2 className="text-xl font-semibold text-cyan-400 mb-4">Add Application</h2>
                            <form onSubmit={addApplication} className="flex flex-wrap gap-2 items-end">
                                <label className="flex-1 min-w-[140px]">
                                    <span className="text-slate-400 text-sm">Name</span>
                                    <input type="text" value={newAppName} onChange={e => setNewAppName(e.target.value)} placeholder="Application name" className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 placeholder-slate-400" />
                                </label>
                                <label className="flex-1 min-w-[140px]">
                                    <span className="text-slate-400 text-sm">Description</span>
                                    <input type="text" value={newAppDescription} onChange={e => setNewAppDescription(e.target.value)} placeholder="Optional" className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-200" />
                                </label>
                                <label>
                                    <span className="text-slate-400 text-sm">Type</span>
                                    <select value={newAppType} onChange={e => setNewAppType(e.target.value)} className="block px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-200">
                                        <option value="Custom">Custom</option>
                                        <option value="SaaS">SaaS</option>
                                        <option value="COTS">COTS</option>
                                    </select>
                                </label>
                                <button type="submit" className="px-6 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-lg font-medium shadow-lg">Add Application</button>
                            </form>
                        </div>

                        {loading ? (
                            <div className="bg-slate-800 rounded-lg p-12 text-center border border-slate-700 text-slate-400">Loading applications…</div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {applications.map(app => {
                                    const appAssess = app.assessments?.find(a => !a.teamId);
                                    const score = appAssess ? calculateMaturityScore(appAssess.scoresSnapshot) : null;
                                    const level = score != null ? getFFIECLevel(score) : null;
                                    const teamCount = app.teams?.length || 0;
                                    return (
                                        <div key={app.id} className="bg-slate-800 rounded-lg shadow-2xl p-6 border border-slate-700 hover:border-cyan-500/50 transition">
                                            <div className="flex justify-between items-start mb-2">
                                                {editingAppId === app.id ? (
                                                    <div className="flex items-center gap-2 flex-1">
                                                        <input
                                                            type="text"
                                                            value={editingAppName}
                                                            onChange={e => setEditingAppName(e.target.value)}
                                                            onKeyPress={e => e.key === 'Enter' && updateApplicationName(app.id, editingAppName)}
                                                            className="text-lg font-semibold px-2 py-1 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 flex-1"
                                                            autoFocus
                                                        />
                                                        <button onClick={() => updateApplicationName(app.id, editingAppName)} className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs border border-green-500/50 hover:bg-green-500/30">Save</button>
                                                        <button onClick={() => { setEditingAppId(null); setEditingAppName(""); }} className="px-2 py-1 bg-slate-700 text-slate-300 rounded text-xs border border-slate-600 hover:bg-slate-600">Cancel</button>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-2 flex-1">
                                                        <h3 className="text-lg font-semibold text-slate-200">{app.name}</h3>
                                                        <button onClick={() => { setEditingAppId(app.id); setEditingAppName(app.name); }} className="text-slate-500 hover:text-cyan-400 text-xs">✎</button>
                                                    </div>
                                                )}
                                                <button onClick={() => deleteApplication(app.id)} className="text-red-400 hover:text-red-300">✕</button>
                                            </div>
                                            <p className="text-xs text-slate-500 mb-2">{app.type}</p>
                                            {app.description && <p className="text-sm text-slate-400 mb-3 line-clamp-2">{app.description}</p>}
                                            <p className="text-xs text-slate-500 mb-3">{teamCount} team(s) linked</p>
                                            {score != null && (
                                                <div className="mb-3">
                                                    <div className="flex justify-between text-sm mb-1"><span className="text-slate-400">Maturity</span><span className="text-cyan-400 font-bold">{score}%</span></div>
                                                    <div className="w-full bg-slate-700 rounded-full h-2"><div className={`h-2 rounded-full ${level.color}`} style={{ width: score + '%' }}></div></div>
                                                </div>
                                            )}
                                            <button onClick={() => openApplicationDetail(app)} className="w-full px-4 py-2 bg-slate-700 text-slate-200 rounded-lg hover:bg-cyan-500/20 hover:text-cyan-400 font-medium border border-slate-600">View & assess</button>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                        {!loading && applications.length === 0 && (
                            <div className="bg-slate-800 rounded-lg p-12 text-center border border-slate-700 text-slate-400">No applications yet. Add one above.</div>
                        )}
                    </>
                )}

                {view === "applicationDetail" && selectedApplication && (
                    <div className="bg-slate-800 rounded-lg shadow-2xl p-6 border border-slate-700">
                        <div className="flex justify-between items-start mb-4">
                            <div className="flex-1">
                                {editingAppId === selectedApplication.id ? (
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="text"
                                            value={editingAppName}
                                            onChange={e => setEditingAppName(e.target.value)}
                                            onKeyPress={e => e.key === 'Enter' && updateApplicationName(selectedApplication.id, editingAppName)}
                                            className="text-2xl font-semibold px-3 py-1 bg-slate-700 border border-slate-600 rounded-lg text-cyan-400 flex-1 max-w-md"
                                            autoFocus
                                        />
                                        <button onClick={() => updateApplicationName(selectedApplication.id, editingAppName)} className="px-3 py-1 bg-green-500/20 text-green-400 rounded-lg border border-green-500/50 hover:bg-green-500/30">Save</button>
                                        <button onClick={() => { setEditingAppId(null); setEditingAppName(""); }} className="px-3 py-1 bg-slate-700 text-slate-300 rounded-lg border border-slate-600 hover:bg-slate-600">Cancel</button>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2">
                                        <h2 className="text-2xl font-semibold text-cyan-400">{selectedApplication.name}</h2>
                                        <button onClick={() => { setEditingAppId(selectedApplication.id); setEditingAppName(selectedApplication.name); }} className="text-slate-400 hover:text-cyan-400 text-sm">✎ Edit</button>
                                    </div>
                                )}
                                <p className="text-slate-500">{selectedApplication.type}</p>
                            </div>
                            <button onClick={() => { setView("applications"); setSelectedApplication(null); }} className="text-slate-400 hover:text-slate-200">← Back to applications</button>
                        </div>
                        {selectedApplication.description && <p className="text-slate-300 mb-4">{selectedApplication.description}</p>}

                        <h3 className="text-lg font-semibold text-cyan-400 mb-2">Teams responsible for this application</h3>
                        <p className="text-sm text-slate-400 mb-2">Link teams that maintain or support this application.</p>
                        <div className="flex flex-wrap gap-2 mb-4">
                            {(selectedApplication.teams || []).map(at => (
                                <span key={at.teamId} className="inline-flex items-center gap-1 px-3 py-1 bg-slate-700 rounded-lg text-slate-200">
                                    {at.team?.name || at.teamId}
                                    <button onClick={() => removeTeamFromApplication(selectedApplication.id, at.teamId)} className="text-red-400 hover:text-red-300">✕</button>
                                </span>
                            ))}
                            {addTeamAppId === selectedApplication.id ? (
                                <span className="inline-flex gap-1 flex-wrap">
                                    <select
                                        className="px-3 py-1 bg-slate-700 border border-slate-600 rounded-lg text-slate-200"
                                        value=""
                                        onChange={e => {
                                            const teamId = (e.target.value || '').trim();
                                            if (teamId && addTeamAppId) addTeamToApplication(addTeamAppId, teamId);
                                        }}
                                    >
                                        <option value="">Select team</option>
                                        {teams.filter(t => !(selectedApplication.teams || []).some(at => at.teamId === t.id)).map(t => (
                                            <option key={t.id} value={t.id}>{t.name}</option>
                                        ))}
                                    </select>
                                    <button onClick={() => setAddTeamAppId(null)} className="text-slate-400">Cancel</button>
                                </span>
                            ) : (
                                <button onClick={() => setAddTeamAppId(selectedApplication.id)} className="px-3 py-1 bg-cyan-500/20 text-cyan-400 rounded-lg border border-cyan-500/50">+ Add team</button>
                            )}
                        </div>

                        <h3 className="text-lg font-semibold text-cyan-400 mb-2">Maturity assessment</h3>
                        <p className="text-sm text-slate-400 mb-3">Assess this application&apos;s SDLC maturity. Not all applications can reach the same level (e.g. SaaS/COTS have limited control).</p>
                        <div className="space-y-3">
                            {(() => {
                                const appAssess = selectedApplication.assessments?.find(a => !a.teamId);
                                const score = appAssess ? calculateMaturityScore(appAssess.scoresSnapshot) : null;
                                const level = score != null ? getFFIECLevel(score) : null;
                                return (
                                    <div className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg border border-slate-600">
                                        <span className="font-medium text-slate-200">Application</span>
                                        {score != null ? <span className={`px-3 py-1 rounded-full text-sm font-bold text-white ${level.color}`}>{score}% — {level.name}</span> : null}
                                        <button onClick={() => openAssessment(selectedApplication.id, null, appAssess?.scoresSnapshot)} className="px-3 py-1 bg-slate-600 text-slate-200 rounded-lg hover:bg-cyan-500/20">{appAssess ? 'Update' : 'Start'} assessment</button>
                                    </div>
                                );
                            })()}
                        </div>

                        <h3 className="text-lg font-semibold text-cyan-400 mb-2 mt-8">Assessment history — maturity over time</h3>
                        <p className="text-sm text-slate-400 mb-3">All assessments for this application. Run new assessments to see trends.</p>
                        {(selectedApplication.assessments || []).length === 0 ? (
                            <p className="text-slate-500 py-2">No assessments yet.</p>
                        ) : (
                            <>
                                <div className="overflow-x-auto mb-4">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b-2 border-cyan-500">
                                                <th className="text-left py-2 px-3 font-semibold text-cyan-400">Date</th>
                                                <th className="text-left py-2 px-3 font-semibold text-cyan-400">Scope</th>
                                                <th className="text-center py-2 px-3 font-semibold text-cyan-400">Score</th>
                                                <th className="text-center py-2 px-3 font-semibold text-cyan-400">Maturity level</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {(selectedApplication.assessments || [])
                                                .slice()
                                                .sort((a, b) => new Date(b.assessmentDate) - new Date(a.assessmentDate))
                                                .map(a => {
                                                const score = calculateMaturityScore(a.scoresSnapshot || {});
                                                const level = getFFIECLevel(score);
                                                const scope = a.teamId ? (selectedApplication.teams?.find(at => at.teamId === a.teamId)?.team?.name || a.team?.name || 'Team') : 'Application';
                                                return (
                                                    <tr key={a.id} className="border-b border-slate-700">
                                                        <td className="py-2 px-3 text-slate-300">{new Date(a.assessmentDate).toLocaleDateString()}</td>
                                                        <td className="py-2 px-3 text-slate-300">{scope}</td>
                                                        <td className="text-center py-2 px-3"><span className="px-2 py-0.5 rounded text-slate-200 font-medium">{score}%</span></td>
                                                        <td className="text-center py-2 px-3"><span className={`px-2 py-0.5 rounded text-xs font-bold text-white ${level.color}`}>{level.name}</span></td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                                <div className="mt-4">
                                    <h4 className="text-sm font-semibold text-cyan-400 mb-2">Application-level maturity over time</h4>
                                    <div style={{ height: '220px' }}><canvas ref={historyChartRef}></canvas></div>
                                </div>
                            </>
                        )}
                    </div>
                )}

                {view === "assessment" && assessmentScope && (
                    <div className="bg-slate-800 rounded-lg shadow-2xl p-6 border border-slate-700">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-semibold text-cyan-400">
                                Application assessment
                            </h2>
                            <button onClick={() => { setView("applicationDetail"); setAssessmentScope(null); }} className="text-slate-400 hover:text-slate-200">Cancel</button>
                        </div>
                        <div className="bg-cyan-900/30 border-l-4 border-cyan-500 p-4 mb-6 rounded text-sm text-cyan-100">Select level 0–4 for each criterion. Not all applications can reach high maturity (e.g. SaaS/COTS have limited control).</div>
                        {Object.entries(maturityCriteria).map(([category, criteria]) => (
                            <div key={category} className="mb-8">
                                <h3 className="text-lg font-semibold text-cyan-400 mb-4 pb-2 border-b-2 border-cyan-500">{category}</h3>
                                <div className="space-y-6">
                                    {criteria.map(criterion => (
                                        <div key={criterion.id} className="bg-slate-700/50 p-4 rounded-lg border border-slate-600">
                                            <h4 className="font-medium text-slate-200 mb-3">{criterion.name}</h4>
                                            <div className="grid grid-cols-5 gap-2">
                                                {criterion.levels.map((level, idx) => (
                                                    <button key={idx} onClick={() => setAssessmentData({ ...assessmentData, [criterion.id]: idx })} className={`p-3 rounded-lg text-sm transition ${assessmentData[criterion.id] === idx ? "bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg" : "bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-600"}`}>
                                                        <div className="font-medium mb-1">Level {idx}</div>
                                                        <div className="text-xs">{level}</div>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                        <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-slate-700">
                            <button onClick={() => { setView("applicationDetail"); setAssessmentScope(null); }} className="px-6 py-2 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 font-medium border border-slate-600">Cancel</button>
                            <button onClick={saveAssessment} className="px-6 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-lg font-medium shadow-lg">Save assessment</button>
                        </div>
                    </div>
                )}

                {view === "comparison" && (
                    <div className="space-y-6">
                        <div className="bg-slate-800 rounded-lg shadow-2xl p-6 border border-slate-700">
                            <h2 className="text-2xl font-semibold text-cyan-400 mb-6">Application maturity comparison</h2>
                            <div style={{ height: '400px' }}><canvas ref={chartRef}></canvas></div>
                        </div>
                        <div className="bg-slate-800 rounded-lg shadow-2xl p-6 border border-slate-700">
                            <h2 className="text-2xl font-semibold text-cyan-400 mb-6">Category breakdown (top 3 applications)</h2>
                            <div style={{ height: '400px' }}><canvas ref={radarChartRef}></canvas></div>
                        </div>
                        <div className="bg-slate-800 rounded-lg shadow-2xl p-6 border border-slate-700">
                            <h2 className="text-2xl font-semibold text-cyan-400 mb-6">Scores by application and scope</h2>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b-2 border-cyan-500">
                                            <th className="text-left py-3 px-4 font-semibold text-cyan-400">Application</th>
                                            <th className="text-left py-3 px-4 font-semibold text-cyan-400">Scope</th>
                                            <th className="text-center py-3 px-4 font-semibold text-cyan-400">Score</th>
                                            <th className="text-center py-3 px-4 font-semibold text-cyan-400">Maturity level</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {comparisonRows.map((row, i) => {
                                            const level = getFFIECLevel(row.score);
                                            return (
                                                <tr key={i} className="border-b border-slate-700">
                                                    <td className="py-3 px-4 font-medium text-slate-200">{row.app}</td>
                                                    <td className="py-3 px-4 text-slate-300">{row.scope}</td>
                                                    <td className="text-center py-3 px-4"><span className="px-3 py-1 rounded-full text-sm font-bold bg-slate-700 text-slate-200">{row.score}%</span></td>
                                                    <td className="text-center py-3 px-4"><span className={`px-3 py-1 rounded-full text-sm font-bold text-white ${level.color}`}>{level.name}</span></td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                            {comparisonRows.length === 0 && <p className="text-slate-400 py-4">Run application-level assessments to see comparison data.</p>}
                        </div>
                    </div>
                )}

                {view === "teams" && (
                    <div className="bg-slate-800 rounded-lg shadow-2xl p-6 border border-slate-700">
                        <h2 className="text-xl font-semibold text-cyan-400 mb-4">Manage teams</h2>
                        <p className="text-slate-400 text-sm mb-4">Create teams here; then link them to applications from each application’s detail view.</p>
                        <div className="flex gap-2 mb-6">
                            <input type="text" value={newTeamName} onChange={e => setNewTeamName(e.target.value)} onKeyPress={e => e.key === 'Enter' && createTeam()} placeholder="Team name" className="flex-1 max-w-xs px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 placeholder-slate-400" />
                            <button onClick={createTeam} className="px-6 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-lg font-medium">Add team</button>
                        </div>
                        <ul className="space-y-3">
                            {teams.map(t => {
                                const linkedApps = (applications || []).filter(app => (app.teams || []).some(at => at.teamId === t.id));
                                return (
                                    <li key={t.id} className="flex flex-wrap items-center justify-between gap-2 py-3 border-b border-slate-700 text-slate-200">
                                        <div className="flex-1 min-w-0">
                                            {editingTeamId === t.id ? (
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        type="text"
                                                        value={editingTeamName}
                                                        onChange={e => setEditingTeamName(e.target.value)}
                                                        onKeyPress={e => e.key === 'Enter' && updateTeamName(t.id, editingTeamName)}
                                                        className="font-medium px-2 py-1 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 flex-1 max-w-xs"
                                                        autoFocus
                                                    />
                                                    <button onClick={() => updateTeamName(t.id, editingTeamName)} className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs border border-green-500/50 hover:bg-green-500/30">Save</button>
                                                    <button onClick={() => { setEditingTeamId(null); setEditingTeamName(""); }} className="px-2 py-1 bg-slate-700 text-slate-300 rounded text-xs border border-slate-600 hover:bg-slate-600">Cancel</button>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-2">
                                                    <span className="font-medium text-slate-200">{t.name}</span>
                                                    <button onClick={() => { setEditingTeamId(t.id); setEditingTeamName(t.name); }} className="text-slate-500 hover:text-cyan-400 text-xs">✎</button>
                                                </div>
                                            )}
                                            {linkedApps.length > 0 ? (
                                                <div className="mt-1.5 flex flex-wrap gap-1.5">
                                                    <span className="text-slate-500 text-sm">Linked applications:</span>
                                                    {linkedApps.map(app => (
                                                        <button key={app.id} onClick={() => { setSelectedApplication(app); setView("applicationDetail"); loadApplicationDetail(app.id); }} className="px-2 py-0.5 text-sm bg-slate-700 text-cyan-400 rounded hover:bg-cyan-500/20 border border-slate-600">
                                                            {app.name}
                                                        </button>
                                                    ))}
                                                </div>
                                            ) : (
                                                <p className="text-slate-500 text-sm mt-1">No linked applications</p>
                                            )}
                                        </div>
                                        <button onClick={() => deleteTeam(t.id, t.name)} className="px-2 py-1 text-red-400 hover:text-red-300 hover:bg-slate-700 rounded text-sm flex-shrink-0">Remove team</button>
                                    </li>
                                );
                            })}
                        </ul>
                        {teams.length === 0 && <p className="text-slate-500">No teams yet.</p>}
                    </div>
                )}

                {view === "api" && (
                    <div className="space-y-8">
                        <div className="bg-slate-800 rounded-lg shadow-2xl p-6 border border-slate-700">
                            <h2 className="text-2xl font-semibold text-cyan-400 mb-2">How to use AppCompass</h2>
                            <p className="text-slate-400 text-sm mb-6">A quick workflow guide for your team.</p>
                            <ol className="space-y-4 text-slate-300">
                                <li className="flex gap-3">
                                    <span className="flex-shrink-0 w-7 h-7 rounded-full bg-cyan-500/30 text-cyan-400 font-semibold flex items-center justify-center text-sm">1</span>
                                    <div>
                                        <strong className="text-slate-200">Applications</strong> — Add each application you want to track. Give it a name, optional description, and type (Custom, SaaS, COTS). Click the ✎ icon next to an application name to edit it. You can edit or remove applications later.
                                    </div>
                                </li>
                                <li className="flex gap-3">
                                    <span className="flex-shrink-0 w-7 h-7 rounded-full bg-cyan-500/30 text-cyan-400 font-semibold flex items-center justify-center text-sm">2</span>
                                    <div>
                                        <strong className="text-slate-200">Teams</strong> — Under the Teams tab, create the teams that maintain or support your applications (e.g. “Platform”, “Payments”). These are the groups you’ll link to apps.
                                    </div>
                                </li>
                                <li className="flex gap-3">
                                    <span className="flex-shrink-0 w-7 h-7 rounded-full bg-cyan-500/30 text-cyan-400 font-semibold flex items-center justify-center text-sm">3</span>
                                    <div>
                                        <strong className="text-slate-200">Link teams to applications</strong> — Open an application from the list, then under “Teams responsible for this application” click <strong className="text-cyan-400">+ Add team</strong> and choose a team. Repeat to add all responsible teams. Use the ✕ to unlink.
                                    </div>
                                </li>
                                <li className="flex gap-3">
                                    <span className="flex-shrink-0 w-7 h-7 rounded-full bg-cyan-500/30 text-cyan-400 font-semibold flex items-center justify-center text-sm">4</span>
                                    <div>
                                        <strong className="text-slate-200">Run a maturity assessment</strong> — On the same application page, in “Maturity assessment” click <strong className="text-cyan-400">Start assessment</strong> (or Update to change an existing one). Pick a level 0–4 for each criterion; the overall score and maturity level are computed for you.
                                    </div>
                                </li>
                                <li className="flex gap-3">
                                    <span className="flex-shrink-0 w-7 h-7 rounded-full bg-cyan-500/30 text-cyan-400 font-semibold flex items-center justify-center text-sm">5</span>
                                    <div>
                                        <strong className="text-slate-200">Compare and export</strong> — Use <strong className="text-cyan-400">Comparison</strong> to see maturity scores across applications. Use <strong className="text-emerald-400">Export CSV</strong> or <strong className="text-purple-400">Export JSON</strong> to share or integrate with other tools.
                                    </div>
                                </li>
                            </ol>
                        </div>
                        <div className="bg-slate-800 rounded-lg shadow-2xl p-6 border border-slate-700">
                            <h2 className="text-2xl font-semibold text-cyan-400 mb-2">API reference</h2>
                            <p className="text-slate-400 text-sm mb-4">For integrations and automation. All endpoints are under <code className="bg-slate-700 px-1 rounded text-cyan-300">/api</code>. Use JSON request bodies where noted.</p>
                            <div className="space-y-4">
                                <div>
                                    <h3 className="text-lg font-medium text-slate-200 mb-2">Applications</h3>
                                    <ul className="text-sm text-slate-300 space-y-1.5">
                                        <li><code className="bg-slate-700 px-1.5 py-0.5 rounded">GET /api/applications</code> — List all applications</li>
                                        <li><code className="bg-slate-700 px-1.5 py-0.5 rounded">POST /api/applications</code> — Create (body: <code className="text-slate-400">{"{ name, description?, type }"}</code>)</li>
                                        <li><code className="bg-slate-700 px-1.5 py-0.5 rounded">GET /api/applications/:id</code> — Get one application (with teams and assessments)</li>
                                        <li><code className="bg-slate-700 px-1.5 py-0.5 rounded">PATCH /api/applications/:id</code> — Update (body: <code className="text-slate-400">{"{ name?, description?, type?, externalId?, source?, dimensions? }"}</code>)</li>
                                        <li><code className="bg-slate-700 px-1.5 py-0.5 rounded">DELETE /api/applications/:id</code> — Delete</li>
                                        <li><code className="bg-slate-700 px-1.5 py-0.5 rounded">POST /api/applications/:id/teams</code> — Link team (body: <code className="text-slate-400">{"{ teamId }"}</code>)</li>
                                        <li><code className="bg-slate-700 px-1.5 py-0.5 rounded">DELETE /api/applications/:id/teams/:teamId</code> — Unlink team</li>
                                        <li><code className="bg-slate-700 px-1.5 py-0.5 rounded">GET /api/applications/:id/assessments</code> — List assessments for this application</li>
                                    </ul>
                                </div>
                                <div>
                                    <h3 className="text-lg font-medium text-slate-200 mb-2">Teams</h3>
                                    <ul className="text-sm text-slate-300 space-y-1.5">
                                        <li><code className="bg-slate-700 px-1.5 py-0.5 rounded">GET /api/teams</code> — List all teams</li>
                                        <li><code className="bg-slate-700 px-1.5 py-0.5 rounded">POST /api/teams</code> — Create (body: <code className="text-slate-400">{"{ name }"}</code>)</li>
                                        <li><code className="bg-slate-700 px-1.5 py-0.5 rounded">GET /api/teams/:id</code> — Get one team</li>
                                        <li><code className="bg-slate-700 px-1.5 py-0.5 rounded">PATCH /api/teams/:id</code> — Update (body: <code className="text-slate-400">{"{ name?, externalId? }"}</code>)</li>
                                        <li><code className="bg-slate-700 px-1.5 py-0.5 rounded">DELETE /api/teams/:id</code> — Delete (unlinks from all applications)</li>
                                    </ul>
                                </div>
                                <div>
                                    <h3 className="text-lg font-medium text-slate-200 mb-2">Assessments</h3>
                                    <ul className="text-sm text-slate-300 space-y-1.5">
                                        <li><code className="bg-slate-700 px-1.5 py-0.5 rounded">POST /api/assessments</code> — Create/update assessment (body: <code className="text-slate-400">{"{ applicationId, scores }"}</code>; omit <code className="text-slate-400">teamId</code> for application-level)</li>
                                    </ul>
                                </div>
                                <div>
                                    <h3 className="text-lg font-medium text-slate-200 mb-2">ServiceNow Integration</h3>
                                    <ul className="text-sm text-slate-300 space-y-1.5">
                                        <li><code className="bg-slate-700 px-1.5 py-0.5 rounded">POST /api/integrations/servicenow/sync</code> — Sync applications from ServiceNow CMDB (body: <code className="text-slate-400">{"{ tableName?, query?, preserveManualEdits? }"}</code>)</li>
                                        <li><code className="bg-slate-700 px-1.5 py-0.5 rounded">POST /api/integrations/servicenow/sync/teams</code> — Sync teams from ServiceNow (body: <code className="text-slate-400">{"{ tableName?, query? }"}</code>)</li>
                                        <li><code className="bg-slate-700 px-1.5 py-0.5 rounded">POST /api/integrations/servicenow/sync/assessment</code> — Export assessment to ServiceNow (body: <code className="text-slate-400">{"{ applicationId, tableName? }"}</code>)</li>
                                        <li><code className="bg-slate-700 px-1.5 py-0.5 rounded">GET /api/integrations/servicenow/status</code> — Check ServiceNow connection status</li>
                                    </ul>
                                </div>
                                <div>
                                    <h3 className="text-lg font-medium text-slate-200 mb-2">PowerBI Integration</h3>
                                    <ul className="text-sm text-slate-300 space-y-1.5">
                                        <li><code className="bg-slate-700 px-1.5 py-0.5 rounded">POST /api/integrations/powerbi/export</code> — Export data to PowerBI (body: <code className="text-slate-400">{"{ clearExisting?, datasetName? }"}</code>)</li>
                                        <li><code className="bg-slate-700 px-1.5 py-0.5 rounded">GET /api/integrations/powerbi/status</code> — Check PowerBI connection status</li>
                                        <li><code className="bg-slate-700 px-1.5 py-0.5 rounded">GET /api/integrations/powerbi/datasets</code> — List available PowerBI datasets</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<SDLCMaturityTracker />);
