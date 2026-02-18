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
    const [organizations, setOrganizations] = useState([]);
    const [selectedOrganizationId, setSelectedOrganizationId] = useState(null);
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
    const [assessmentListViewMode, setAssessmentListViewMode] = useState("list"); // "list" | "cards"
    const [applicationsListViewMode, setApplicationsListViewMode] = useState("list"); // "list" | "cards"
    const [applicationDetailTab, setApplicationDetailTab] = useState("overview"); // "overview" | "roadmap"
    const [successMessage, setSuccessMessage] = useState(null);
    const [newOrgName, setNewOrgName] = useState("");
    const [editingOrgId, setEditingOrgId] = useState(null);
    const [editingOrgName, setEditingOrgName] = useState("");
    const chartRef = useRef(null);
    const radarChartRef = useRef(null);
    const historyChartRef = useRef(null);

    const loadOrganizations = async () => {
        try {
            const res = await fetch(API + '/organizations');
            if (!res.ok) throw new Error(res.statusText);
            const data = await res.json();
            setOrganizations(data);
        } catch (err) {
            setOrganizations([]);
        }
    };

    const setSelectedOrganizationIdAndUrl = (id) => {
        setSelectedOrganizationId(id);
        const params = new URLSearchParams(window.location.search);
        if (id) {
            params.set('organizationId', id);
        } else {
            params.delete('organizationId');
        }
        const newSearch = params.toString();
        const newUrl = newSearch ? window.location.pathname + '?' + newSearch : window.location.pathname;
        window.history.replaceState({}, '', newUrl);
    };

    const loadApplications = async (organizationId) => {
        setLoading(true);
        setError(null);
        try {
            const url = organizationId ? API + '/applications?organizationId=' + encodeURIComponent(organizationId) : API + '/applications';
            const res = await fetch(url);
            if (!res.ok) throw new Error(res.statusText);
            const data = await res.json();
            setApplications(data);
        } catch (err) {
            const errorMsg = err.message === 'Failed to fetch'
                ? 'Cannot connect to server. Make sure the backend is running on port 3000.'
                : err.message || 'Load failed';
            setError(errorMsg);
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

    const createOrganization = async (e) => {
        e.preventDefault();
        if (!newOrgName.trim()) return;
        try {
            const res = await fetch(API + '/organizations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newOrgName.trim() })
            });
            if (!res.ok) throw new Error((await res.json()).error || res.statusText);
            setNewOrgName("");
            await loadOrganizations();
            setSuccessMessage('Organization created.');
            setTimeout(() => setSuccessMessage(null), 3000);
        } catch (err) {
            setError(err.message);
        }
    };

    const updateOrganization = async (id, name) => {
        if (!name?.trim()) return;
        try {
            const res = await fetch(API + '/organizations/' + id, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: name.trim() })
            });
            if (!res.ok) throw new Error((await res.json()).error || res.statusText);
            setEditingOrgId(null);
            setEditingOrgName("");
            await loadOrganizations();
            if (selectedOrganizationId === id) loadApplications(id);
            setSuccessMessage('Organization updated.');
            setTimeout(() => setSuccessMessage(null), 3000);
        } catch (err) {
            setError(err.message);
        }
    };

    const deleteOrganization = async (id, name) => {
        if (!confirm(`Delete organization "${name}"? All applications in it will be removed.`)) return;
        try {
            const res = await fetch(API + '/organizations/' + id, { method: 'DELETE' });
            if (!res.ok) throw new Error((await res.json()).error || res.statusText);
            if (selectedOrganizationId === id) {
                setSelectedOrganizationIdAndUrl(organizations.find(o => o.id !== id)?.id || null);
            }
            await loadOrganizations();
            loadApplications(selectedOrganizationId || organizations.find(o => o.id !== id)?.id || null);
            setSuccessMessage('Organization deleted.');
            setTimeout(() => setSuccessMessage(null), 3000);
        } catch (err) {
            setError(err.message);
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

    useEffect(() => { loadOrganizations(); loadTeams(); }, []);

    useEffect(() => {
        if (organizations.length === 0) return;
        const params = new URLSearchParams(window.location.search);
        const idFromUrl = params.get('organizationId');
        if (idFromUrl && organizations.some(o => o.id === idFromUrl)) {
            setSelectedOrganizationId(idFromUrl);
        } else if (idFromUrl) {
            params.delete('organizationId');
            const newSearch = params.toString();
            window.history.replaceState({}, '', newSearch ? window.location.pathname + '?' + newSearch : window.location.pathname);
        }
    }, [organizations]);

    useEffect(() => {
        const effectiveOrgId = selectedOrganizationId || (organizations.length ? organizations[0].id : null);
        if (view === 'applications' && effectiveOrgId) loadApplications(effectiveOrgId);
    }, [view, selectedOrganizationId, organizations]);

    const addApplication = async (e) => {
        e.preventDefault();
        if (!newAppName.trim()) return;
        const orgId = selectedOrganizationId || (organizations.length ? organizations[0].id : null);
        if (!orgId) {
            setError('Create an organization first, or select one from the dropdown.');
            return;
        }
        try {
            const res = await fetch(API + '/applications', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ organizationId: orgId, name: newAppName.trim(), description: newAppDescription.trim() || null, type: newAppType })
            });
            if (!res.ok) throw new Error((await res.json()).error || res.statusText);
            setNewAppName("");
            setNewAppDescription("");
            loadApplications(orgId);
            setSuccessMessage('Application added.');
            setTimeout(() => setSuccessMessage(null), 3000);
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
            loadApplications(selectedOrganizationId || (organizations[0]?.id ?? null));
            if (selectedApplication?.id === id) {
                await loadApplicationDetail(id);
            }
            setSuccessMessage('Application updated.');
            setTimeout(() => setSuccessMessage(null), 3000);
        } catch (err) {
            setError(err.message);
        }
    };

    const deleteApplication = async (id) => {
        try {
            const res = await fetch(API + '/applications/' + id, { method: 'DELETE' });
            if (!res.ok) throw new Error(res.statusText);
            if (selectedApplication?.id === id) { setSelectedApplication(null); setView("applications"); }
            loadApplications(selectedOrganizationId || (organizations[0]?.id ?? null));
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
            loadApplications(selectedOrganizationId || (organizations[0]?.id ?? null));
            setSuccessMessage('Team linked.');
            setTimeout(() => setSuccessMessage(null), 3000);
        } catch (err) {
            setError(err.message);
        }
    };

    const removeTeamFromApplication = async (applicationId, teamId) => {
        try {
            const res = await fetch(API + '/applications/' + applicationId + '/teams/' + teamId, { method: 'DELETE' });
            if (!res.ok) throw new Error(res.statusText);
            await loadApplicationDetail(applicationId);
            loadApplications(selectedOrganizationId || (organizations[0]?.id ?? null));
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
            loadApplications(selectedOrganizationId || (organizations[0]?.id ?? null));
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
            loadApplications(selectedOrganizationId || (organizations[0]?.id ?? null));
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
            loadApplications(selectedOrganizationId || (organizations[0]?.id ?? null));
            setSuccessMessage('Assessment saved.');
            setTimeout(() => setSuccessMessage(null), 3000);
        } catch (err) {
            setError(err.message);
        }
    };

    const openApplicationDetail = async (app) => {
        setApplicationDetailTab("overview");
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

    const exportToExcel = async () => {
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
                    Application: app.name,
                    Type: app.type,
                    Scope: scope,
                    'Overall Score': overall,
                    'Maturity Level': level.name,
                    'Last Updated': a.updatedAt
                });
            }
            if (assessments.length === 0) {
                rows.push({ Application: app.name, Type: app.type, Scope: '-', 'Overall Score': '', 'Maturity Level': '', 'Last Updated': '' });
            }
        }
        if (typeof XLSX === 'undefined') {
            setError('Excel export requires SheetJS. Please refresh the page.');
            return;
        }
        const ws = XLSX.utils.json_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Maturity');
        XLSX.writeFile(wb, 'sdlc-maturity-export-' + new Date().toISOString().split('T')[0] + '.xlsx');
    };

    useEffect(() => {
        if (view !== "comparison" || !applications.length || !chartRef.current) return;
        const ctx = chartRef.current.getContext('2d');
        if (chartRef.current.chart) chartRef.current.chart.destroy();
        const appScores = applications.map(app => {
            const appLevel = app.assessments?.find(a => !a.teamId);
            const score = appLevel ? calculateMaturityScore(appLevel.scoresSnapshot) : 0;
            return { name: app.name, score };
        }).sort((a, b) => a.score - b.score);
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
        const sortedByScore = applications.map(app => {
            const a = app.assessments?.find(x => !x.teamId);
            const score = a ? calculateMaturityScore(a.scoresSnapshot || {}) : 0;
            return { app, score };
        }).sort((x, y) => x.score - y.score);
        const datasets = sortedByScore.slice(0, 3).map(({ app }, idx) => {
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
    comparisonRows.sort((a, b) => a.score - b.score);

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
            <div className="max-w-7xl mx-auto">
                <div className="bg-gradient-to-r from-slate-800 to-slate-700 rounded-lg shadow-2xl p-6 mb-6 border border-cyan-500/30">
                    <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400 mb-2">AppCompass</h1>
                    <p className="text-slate-300">Navigating the wild landscape of our software lifecycle.</p>
                </div>

                {error && (
                    <div className="flex items-center justify-between gap-3 bg-red-900/30 border border-red-500 rounded-lg p-4 mb-4 text-red-200">
                        <span>{error}</span>
                        <button onClick={() => setError(null)} className="shrink-0 px-2 py-1 rounded hover:bg-red-500/20 text-red-300" aria-label="Dismiss">×</button>
                    </div>
                )}
                {successMessage && (
                    <div className="flex items-center justify-between gap-3 bg-emerald-900/30 border border-emerald-500 rounded-lg p-4 mb-4 text-emerald-200">
                        <span>{successMessage}</span>
                        <button onClick={() => setSuccessMessage(null)} className="shrink-0 px-2 py-1 rounded hover:bg-emerald-500/20" aria-label="Dismiss">×</button>
                    </div>
                )}

                {!selectedOrganizationId && organizations.length > 0 && (
                    <div className="space-y-8">
                        <div className="bg-slate-800 rounded-lg shadow-2xl p-6 border border-slate-700">
                            <h2 className="text-xl font-semibold text-cyan-400 mb-4">Create organization</h2>
                            <p className="text-slate-400 text-sm mb-4">Add a new organization to group applications and teams. Management happens here at the entry—not inside an existing org.</p>
                            <form onSubmit={createOrganization} className="flex flex-wrap gap-3 items-end">
                                <label className="flex-1 min-w-[200px]">
                                    <span className="text-slate-400 text-sm block mb-1">Name</span>
                                    <input type="text" value={newOrgName} onChange={e => setNewOrgName(e.target.value)} placeholder="e.g. Engineering" className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 placeholder-slate-400" />
                                </label>
                                <button type="submit" className="px-6 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-lg font-medium shadow-lg">Add organization</button>
                            </form>
                        </div>
                        <div className="bg-slate-800 rounded-lg shadow-2xl p-8 border border-slate-700">
                            <h2 className="text-2xl font-semibold text-cyan-400 mb-2">Select an organization</h2>
                            <p className="text-slate-400 text-sm mb-6">Choose an organization to view its applications, run assessments, and compare maturity.</p>
                            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                {organizations.map(org => (
                                    <div key={org.id} className="flex flex-col gap-3 p-4 bg-slate-700/50 rounded-lg border border-slate-600 hover:border-cyan-500/50 transition">
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="min-w-0 flex-1">
                                                {editingOrgId === org.id ? (
                                                    <div className="flex flex-wrap gap-2 items-center">
                                                        <input type="text" value={editingOrgName} onChange={e => setEditingOrgName(e.target.value)} onKeyDown={e => e.key === 'Enter' && updateOrganization(org.id, editingOrgName)} className="flex-1 min-w-0 px-3 py-1.5 bg-slate-700 border border-slate-600 rounded-lg text-slate-200" autoFocus />
                                                        <button onClick={() => updateOrganization(org.id, editingOrgName)} className="px-3 py-1 bg-green-500/20 text-green-400 rounded border border-green-500/50 text-sm">Save</button>
                                                        <button onClick={() => { setEditingOrgId(null); setEditingOrgName(""); }} className="px-3 py-1 bg-slate-600 text-slate-300 rounded text-sm">Cancel</button>
                                                    </div>
                                                ) : (
                                                    <>
                                                        <div className="font-medium text-slate-200">{org.name}</div>
                                                        <div className="text-slate-500 text-sm mt-0.5">
                                                            {(org.applications?.length ?? 0)} application{(org.applications?.length ?? 0) !== 1 ? 's' : ''}
                                                            {org.teams?.length != null && org.teams.length > 0 ? ` · ${org.teams.length} team${org.teams.length !== 1 ? 's' : ''}` : ''}
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                            {editingOrgId !== org.id && (
                                                <div className="flex gap-1.5 shrink-0">
                                                    <button onClick={() => { setEditingOrgId(org.id); setEditingOrgName(org.name); }} className="text-slate-400 hover:text-cyan-400 text-sm px-1.5 py-0.5" title="Edit">✎</button>
                                                    <button onClick={() => deleteOrganization(org.id, org.name)} className="text-red-400 hover:text-red-300 text-sm px-1.5 py-0.5" title="Delete">✕</button>
                                                </div>
                                            )}
                                        </div>
                                        <button
                                            onClick={() => { setSelectedOrganizationIdAndUrl(org.id); setView("applications"); setSelectedApplication(null); }}
                                            className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-lg font-medium shadow-lg hover:opacity-90 w-full"
                                        >
                                            Open
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {!selectedOrganizationId && organizations.length === 0 && (
                    <div className="space-y-6">
                        <div className="bg-slate-800 rounded-lg shadow-2xl p-6 border border-slate-700">
                            <h2 className="text-xl font-semibold text-cyan-400 mb-4">Get started</h2>
                            <p className="text-slate-400 mb-6">Create an organization to group your applications and teams, then add applications and run maturity assessments.</p>
                            <form onSubmit={createOrganization} className="flex flex-wrap gap-3 items-end">
                                <label className="flex-1 min-w-[200px]">
                                    <span className="text-slate-400 text-sm block mb-1">Organization name</span>
                                    <input type="text" value={newOrgName} onChange={e => setNewOrgName(e.target.value)} placeholder="e.g. Engineering" className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 placeholder-slate-400" />
                                </label>
                                <button type="submit" className="px-6 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-lg font-medium shadow-lg">Create organization</button>
                            </form>
                        </div>
                    </div>
                )}

                {selectedOrganizationId && (
                    <>
                        <div className="flex items-center justify-between flex-wrap gap-2 mb-4 p-3 bg-slate-800/80 rounded-lg border border-slate-700">
                            <span className="text-slate-300">
                                <span className="text-slate-500">Current organization: </span>
                                <span className="font-medium text-cyan-400">{organizations.find(o => o.id === selectedOrganizationId)?.name ?? '—'}</span>
                            </span>
                            <button onClick={() => { setSelectedOrganizationIdAndUrl(null); setView("applications"); setSelectedApplication(null); }} className="px-3 py-1.5 text-sm bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 border border-slate-600">Switch organization</button>
                        </div>
                        <div className="bg-slate-800 rounded-lg shadow-2xl p-4 mb-6 border border-slate-700">
                            <div className="flex justify-between items-center flex-wrap gap-2">
                                <div className="flex gap-2 flex-wrap">
                                    <button onClick={() => { setView("applications"); setSelectedApplication(null); }} className={`px-4 py-2 rounded-lg font-medium transition ${view === "applications" ? "bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg" : "bg-slate-700 text-slate-300 hover:bg-slate-600 border border-slate-600"}`}>Applications</button>
                                    <button onClick={() => setView("comparison")} className={`px-4 py-2 rounded-lg font-medium transition ${view === "comparison" ? "bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg" : "bg-slate-700 text-slate-300 hover:bg-slate-600 border border-slate-600"}`}>Comparison</button>
                                    <button onClick={() => setView("teams")} className={`px-4 py-2 rounded-lg font-medium transition ${view === "teams" ? "bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg" : "bg-slate-700 text-slate-300 hover:bg-slate-600 border border-slate-600"}`}>Teams</button>
                                    <button onClick={() => setView("api")} className={`px-4 py-2 rounded-lg font-medium transition ${view === "api" ? "bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg" : "bg-slate-700 text-slate-300 hover:bg-slate-600 border border-slate-600"}`}>Docs</button>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={exportToCSV} className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-green-500 text-white rounded-lg hover:from-emerald-600 font-medium shadow-lg">Export CSV</button>
                                    <button onClick={exportToExcel} className="px-4 py-2 bg-gradient-to-r from-teal-500 to-cyan-500 text-white rounded-lg hover:from-teal-600 font-medium shadow-lg">Export Excel</button>
                                    <button onClick={exportToJSON} className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 font-medium shadow-lg">Export JSON</button>
                                </div>
                            </div>
                        </div>

                {view === "applications" && (
                    <>
                        <div className="bg-slate-800 rounded-lg shadow-2xl p-4 mb-6 border border-slate-700">
                            <div className="flex items-center gap-3 flex-wrap">
                                <span className="text-slate-400 text-sm">Organization</span>
                                <select
                                    value={selectedOrganizationId || (organizations[0]?.id ?? '')}
                                    onChange={e => setSelectedOrganizationIdAndUrl(e.target.value || null)}
                                    className="px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-200"
                                >
                                    {organizations.length === 0 ? <option value="">No organizations</option> : null}
                                    {organizations.map(org => (
                                        <option key={org.id} value={org.id}>{org.name}</option>
                                    ))}
                                </select>
                                {organizations.length > 0 && (
                                    <span className="text-slate-500 text-sm">{applications.length} application{applications.length !== 1 ? 's' : ''} in {organizations.find(o => o.id === (selectedOrganizationId || organizations[0]?.id))?.name || 'this org'}</span>
                                )}
                            </div>
                        </div>
                        <div className="bg-slate-800 rounded-lg shadow-2xl p-6 mb-6 border border-slate-700">
                            <h2 className="text-xl font-semibold text-cyan-400 mb-4">Add Application</h2>
                            <form onSubmit={addApplication} className="flex flex-wrap gap-2 items-end">
                                <label>
                                    <span className="text-slate-400 text-sm">Organization</span>
                                    <select
                                        value={selectedOrganizationId || (organizations[0]?.id ?? '')}
                                        onChange={e => setSelectedOrganizationIdAndUrl(e.target.value || null)}
                                        className="block px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 min-w-[160px]"
                                        disabled={organizations.length === 0}
                                    >
                                        {organizations.map(org => (
                                            <option key={org.id} value={org.id}>{org.name}</option>
                                        ))}
                                    </select>
                                </label>
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
                                <button type="submit" className="px-6 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-lg font-medium shadow-lg disabled:opacity-50 disabled:cursor-not-allowed" disabled={organizations.length === 0}>Add application</button>
                            </form>
                        </div>

                        {loading ? (
                            <div className="space-y-3">
                                {[1,2,3].map(i => (
                                    <div key={i} className="h-24 bg-slate-700/50 rounded-lg border border-slate-600 animate-pulse" />
                                ))}
                            </div>
                        ) : (
                            <>
                                <div className="flex items-center gap-2 mb-4">
                                    <span className="text-sm text-slate-400">View:</span>
                                    <button
                                        onClick={() => setApplicationsListViewMode("list")}
                                        className={`px-3 py-1.5 rounded-lg text-sm font-medium border ${applicationsListViewMode === "list" ? "bg-cyan-500/20 text-cyan-400 border-cyan-500/50" : "bg-slate-700 text-slate-300 border-slate-600 hover:bg-slate-600"}`}
                                    >
                                        List
                                    </button>
                                    <button
                                        onClick={() => setApplicationsListViewMode("cards")}
                                        className={`px-3 py-1.5 rounded-lg text-sm font-medium border ${applicationsListViewMode === "cards" ? "bg-cyan-500/20 text-cyan-400 border-cyan-500/50" : "bg-slate-700 text-slate-300 border-slate-600 hover:bg-slate-600"}`}
                                    >
                                        Cards
                                    </button>
                                </div>
                                {(() => {
                                    const withScore = applications.map(app => {
                                        const appAssess = app.assessments?.find(a => !a.teamId);
                                        const score = appAssess ? calculateMaturityScore(appAssess.scoresSnapshot) : 0;
                                        return { ...app, score };
                                    });
                                    const byTeam = {};
                                    withScore.forEach(app => {
                                        const teamList = app.teams?.length ? app.teams : [{ team: { name: 'No team' } }];
                                        teamList.forEach(at => {
                                            const teamName = at.team?.name || 'No team';
                                            if (!byTeam[teamName]) byTeam[teamName] = [];
                                            if (!byTeam[teamName].some(a => a.id === app.id)) byTeam[teamName].push(app);
                                        });
                                    });
                                    const groupOrder = Object.entries(byTeam)
                                        .map(([teamName, list]) => ({ teamName, minScore: Math.min(...list.map(a => a.score)) }))
                                        .sort((a, b) => a.minScore - b.minScore)
                                        .map(x => x.teamName);
                                    const grouped = groupOrder.map(teamName => ({
                                        teamName,
                                        apps: byTeam[teamName].slice().sort((a, b) => a.score - b.score)
                                    }));

                                    function AppCard({ app }) {
                                        const level = app.score != null && app.score > 0 ? getFFIECLevel(app.score) : null;
                                        const teamCount = app.teams?.length || 0;
                                        return (
                                            <div className="bg-slate-800 rounded-lg shadow-2xl p-6 border border-slate-700 hover:border-cyan-500/50 transition">
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
                                                {(app.score != null && app.score > 0) && (
                                                    <div className="mb-3">
                                                        <div className="flex justify-between text-sm mb-1"><span className="text-slate-400">Maturity</span><span className="text-cyan-400 font-bold">{app.score}%</span></div>
                                                        <div className="w-full bg-slate-700 rounded-full h-2"><div className={`h-2 rounded-full ${level.color}`} style={{ width: app.score + '%' }}></div></div>
                                                    </div>
                                                )}
                                                <button onClick={() => openApplicationDetail(app)} className="w-full px-4 py-2 bg-slate-700 text-slate-200 rounded-lg hover:bg-cyan-500/20 hover:text-cyan-400 font-medium border border-slate-600">View & assess</button>
                                            </div>
                                        );
                                    }

                                    if (applicationsListViewMode === "cards") {
                                        return (
                                            <div className="space-y-6">
                                                {grouped.map(({ teamName, apps }) => (
                                                    <div key={teamName}>
                                                        <h3 className="text-lg font-semibold text-cyan-400 mb-3 pb-1 border-b border-slate-600">{teamName}</h3>
                                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                                            {apps.map(app => <AppCard key={app.id} app={app} />)}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        );
                                    }

                                    return (
                                        <div className="overflow-x-auto border border-slate-700 rounded-lg">
                                            <table className="w-full text-sm">
                                                <thead>
                                                    <tr className="border-b-2 border-cyan-500 bg-slate-800/80">
                                                        <th className="text-left py-3 px-4 font-semibold text-cyan-400">Team</th>
                                                        <th className="text-left py-3 px-4 font-semibold text-cyan-400">Application</th>
                                                        <th className="text-left py-3 px-4 font-semibold text-cyan-400">Type</th>
                                                        <th className="text-center py-3 px-4 font-semibold text-cyan-400">Score</th>
                                                        <th className="text-center py-3 px-4 font-semibold text-cyan-400">Maturity</th>
                                                        <th className="text-right py-3 px-4 font-semibold text-cyan-400">Actions</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {grouped.map(({ teamName, apps }) =>
                                                        apps.map(app => {
                                                            const level = app.score > 0 ? getFFIECLevel(app.score) : null;
                                                            return (
                                                                <tr key={app.id + teamName} className="border-b border-slate-700 hover:bg-slate-700/30">
                                                                    <td className="py-3 px-4 text-slate-300">{teamName}</td>
                                                                    <td className="py-3 px-4 font-medium text-slate-200">{app.name}</td>
                                                                    <td className="py-3 px-4 text-slate-400">{app.type}</td>
                                                                    <td className="text-center py-3 px-4"><span className="px-2 py-0.5 rounded text-slate-200 font-medium">{app.score}%</span></td>
                                                                    <td className="text-center py-3 px-4">{level ? <span className={`px-2 py-0.5 rounded text-xs font-bold text-white ${level.color}`}>{level.name}</span> : <span className="text-slate-500">—</span>}</td>
                                                                    <td className="text-right py-3 px-4">
                                                                        <button onClick={() => openApplicationDetail(app)} className="text-cyan-400 hover:text-cyan-300 mr-2">View</button>
                                                                        <button onClick={() => openApplicationDetail(app)} className="text-emerald-400 hover:text-emerald-300 mr-2">Complete assessment</button>
                                                                        <button onClick={() => { setEditingAppId(app.id); setEditingAppName(app.name); }} className="text-slate-400 hover:text-cyan-400 mr-2">✎</button>
                                                                        <button onClick={() => deleteApplication(app.id)} className="text-red-400 hover:text-red-300">✕</button>
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    );
                                })()}
                            </>
                        )}
                        {!loading && applications.length === 0 && (
                            <div className="bg-slate-800 rounded-xl p-12 text-center border border-slate-600 border-dashed">
                                <p className="text-slate-400 mb-2">No applications in this organization yet.</p>
                                <p className="text-slate-500 text-sm">Use the form above to add your first application.</p>
                            </div>
                        )}
                    </>
                )}

                {view === "applicationDetail" && selectedApplication && (
                    <div className="bg-slate-800 rounded-lg shadow-2xl p-6 border border-slate-700">
                        <nav className="flex items-center gap-2 text-sm text-slate-500 mb-4">
                            <button onClick={() => { setView("applications"); setSelectedApplication(null); }} className="hover:text-cyan-400">Applications</button>
                            <span>/</span>
                            {selectedApplication.organization && (
                                <>
                                    <span>{selectedApplication.organization.name}</span>
                                    <span>/</span>
                                </>
                            )}
                            <span className="text-slate-300">{selectedApplication.name}</span>
                        </nav>
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
                            <button onClick={() => { setView("applications"); setSelectedApplication(null); }} className="text-slate-400 hover:text-cyan-400">← Back</button>
                        </div>
                        {selectedApplication.description && <p className="text-slate-300 mb-4">{selectedApplication.description}</p>}

                        <div className="flex gap-2 mb-6">
                            <button
                                onClick={() => setApplicationDetailTab("overview")}
                                className={`px-4 py-2 rounded-lg font-medium transition ${applicationDetailTab === "overview" ? "bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg" : "bg-slate-700 text-slate-300 hover:bg-slate-600 border border-slate-600"}`}
                            >
                                Overview
                            </button>
                            <button
                                onClick={() => setApplicationDetailTab("roadmap")}
                                className={`px-4 py-2 rounded-lg font-medium transition ${applicationDetailTab === "roadmap" ? "bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg" : "bg-slate-700 text-slate-300 hover:bg-slate-600 border border-slate-600"}`}
                            >
                                Recommended roadmap
                            </button>
                        </div>

                        {applicationDetailTab === "overview" && (
                        <>
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
                        <p className="text-sm text-slate-400 mb-3">All assessments for this application, grouped by team and sorted by least mature first.</p>
                        {(selectedApplication.assessments || []).length === 0 ? (
                            <p className="text-slate-500 py-2">No assessments yet.</p>
                        ) : (
                            <>
                                <div className="flex items-center gap-2 mb-4">
                                    <span className="text-sm text-slate-400">View:</span>
                                    <button
                                        onClick={() => setAssessmentListViewMode("list")}
                                        className={`px-3 py-1.5 rounded-lg text-sm font-medium border ${assessmentListViewMode === "list" ? "bg-cyan-500/20 text-cyan-400 border-cyan-500/50" : "bg-slate-700 text-slate-300 border-slate-600 hover:bg-slate-600"}`}
                                    >
                                        List
                                    </button>
                                    <button
                                        onClick={() => setAssessmentListViewMode("cards")}
                                        className={`px-3 py-1.5 rounded-lg text-sm font-medium border ${assessmentListViewMode === "cards" ? "bg-cyan-500/20 text-cyan-400 border-cyan-500/50" : "bg-slate-700 text-slate-300 border-slate-600 hover:bg-slate-600"}`}
                                    >
                                        Cards
                                    </button>
                                </div>
                                {(() => {
                                    const getScope = (a) => a.teamId ? (selectedApplication.teams?.find(at => at.teamId === a.teamId)?.team?.name || a.team?.name || 'Team') : 'Application';
                                    const withScore = (selectedApplication.assessments || []).map(a => ({
                                        ...a,
                                        score: calculateMaturityScore(a.scoresSnapshot || {}),
                                        scope: getScope(a)
                                    }));
                                    const byScope = {};
                                    withScore.forEach(a => {
                                        if (!byScope[a.scope]) byScope[a.scope] = [];
                                        byScope[a.scope].push(a);
                                    });
                                    const groupOrder = Object.entries(byScope)
                                        .map(([scope, list]) => ({ scope, minScore: Math.min(...list.map(x => x.score)) }))
                                        .sort((a, b) => a.minScore - b.minScore)
                                        .map(x => x.scope);
                                    const grouped = groupOrder.map(scope => ({
                                        scope,
                                        assessments: byScope[scope].slice().sort((a, b) => a.score - b.score)
                                    }));

                                    if (assessmentListViewMode === "cards") {
                                        return (
                                            <div className="space-y-6 mb-4">
                                                {grouped.map(({ scope, assessments }) => (
                                                    <div key={scope}>
                                                        <h4 className="text-sm font-semibold text-cyan-400 mb-2 pb-1 border-b border-slate-600">{scope}</h4>
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                                            {assessments.map(a => {
                                                                const level = getFFIECLevel(a.score);
                                                                return (
                                                                    <div key={a.id} className="bg-slate-700/50 rounded-lg border border-slate-600 p-4">
                                                                        <div className="text-slate-400 text-xs mb-1">{new Date(a.assessmentDate).toLocaleDateString()}</div>
                                                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                                                            <span className="px-2 py-0.5 rounded text-slate-200 font-medium">{a.score}%</span>
                                                                            <span className={`px-2 py-0.5 rounded text-xs font-bold text-white ${level.color}`}>{level.name}</span>
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        );
                                    }

                                    return (
                                        <div className="overflow-x-auto mb-4">
                                            <table className="w-full text-sm">
                                                <thead>
                                                    <tr className="border-b-2 border-cyan-500">
                                                        <th className="text-left py-2 px-3 font-semibold text-cyan-400">Scope</th>
                                                        <th className="text-left py-2 px-3 font-semibold text-cyan-400">Date</th>
                                                        <th className="text-center py-2 px-3 font-semibold text-cyan-400">Score</th>
                                                        <th className="text-center py-2 px-3 font-semibold text-cyan-400">Maturity level</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {grouped.map(({ scope, assessments }) => (
                                                        assessments.map(a => {
                                                            const level = getFFIECLevel(a.score);
                                                            return (
                                                                <tr key={a.id} className="border-b border-slate-700">
                                                                    <td className="py-2 px-3 text-slate-300 font-medium">{scope}</td>
                                                                    <td className="py-2 px-3 text-slate-300">{new Date(a.assessmentDate).toLocaleDateString()}</td>
                                                                    <td className="text-center py-2 px-3"><span className="px-2 py-0.5 rounded text-slate-200 font-medium">{a.score}%</span></td>
                                                                    <td className="text-center py-2 px-3"><span className={`px-2 py-0.5 rounded text-xs font-bold text-white ${level.color}`}>{level.name}</span></td>
                                                                </tr>
                                                            );
                                                        })
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    );
                                })()}
                                <div className="mt-4">
                                    <h4 className="text-sm font-semibold text-cyan-400 mb-2">Application-level maturity over time</h4>
                                    <div style={{ height: '220px' }}><canvas ref={historyChartRef}></canvas></div>
                                </div>
                            </>
                        )}
                        </>
                        )}

                        {applicationDetailTab === "roadmap" && (() => {
                            const appLevelAssessments = (selectedApplication.assessments || []).filter(a => !a.teamId).slice().sort((a, b) => new Date(b.assessmentDate) - new Date(a.assessmentDate));
                            const latest = appLevelAssessments[0];
                            const previous = appLevelAssessments[1];
                            const snapshot = latest?.scoresSnapshot || {};
                            const hasAssessment = latest && Object.keys(snapshot).length > 0;

                            const allCriteria = [];
                            Object.entries(maturityCriteria).forEach(([category, criteria]) => {
                                criteria.forEach(c => allCriteria.push({ category, ...c }));
                            });

                            const trendRows = allCriteria.map(c => {
                                const latestLevel = snapshot[c.id] ?? null;
                                const prevSnapshot = previous?.scoresSnapshot || {};
                                const previousLevel = prevSnapshot[c.id] ?? null;
                                let trend = "—";
                                if (previousLevel !== null && latestLevel !== null) {
                                    if (latestLevel > previousLevel) trend = "progressing";
                                    else if (latestLevel < previousLevel) trend = "regressing";
                                    else trend = "stable";
                                }
                                return { ...c, latestLevel, previousLevel, trend };
                            });

                            const steps = allCriteria
                                .map(c => {
                                    const current = snapshot[c.id] ?? 0;
                                    if (current >= 4) return null;
                                    return {
                                        criterion: c,
                                        current,
                                        nextLevel: current + 1,
                                        nextDescription: c.levels[current + 1]
                                    };
                                })
                                .filter(Boolean)
                                .sort((a, b) => a.current - b.current);

                            const regressing = trendRows.filter(r => r.trend === "regressing");
                            const progressing = trendRows.filter(r => r.trend === "progressing");
                            const stableHigh = trendRows.filter(r => r.trend === "stable" && (r.latestLevel === 3 || r.latestLevel === 4));
                            const needsWorkItems = [];
                            regressing.forEach(r => needsWorkItems.push({ type: "regressing", id: r.id, name: r.name, level: r.latestLevel }));
                            const nextCaps = steps.filter(s => !regressing.some(r => r.id === s.criterion.id)).slice(0, 5);
                            nextCaps.forEach(s => needsWorkItems.push({ type: "next", id: s.criterion.id, name: s.criterion.name, next: s.nextDescription }));

                            if (!hasAssessment) {
                                return (
                                    <div className="space-y-6">
                                        <p className="text-slate-400">Complete an assessment to see what needs work and what is going well.</p>
                                        <button onClick={() => openAssessment(selectedApplication.id, null, null)} className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-lg font-medium">Start assessment</button>
                                    </div>
                                );
                            }

                            return (
                                <div className="space-y-6">
                                    <section className="rounded-lg border border-amber-500/40 bg-amber-950/20 p-5">
                                        <h3 className="text-base font-semibold text-amber-400 mb-1">Needs work</h3>
                                        <p className="text-slate-400 text-sm mb-4">Focus here to raise maturity.</p>
                                        {needsWorkItems.length === 0 ? (
                                            <p className="text-slate-300 text-sm">Nothing urgent. Consider improving lower-scoring areas below.</p>
                                        ) : (
                                            <ul className="space-y-2">
                                                {needsWorkItems.map((item) => (
                                                    <li key={item.type === "regressing" ? item.id : "next-" + item.id} className="flex items-start gap-2 text-sm">
                                                        {item.type === "regressing" ? (
                                                            <span className="text-red-400 shrink-0" title="Declined since last assessment">↓</span>
                                                        ) : (
                                                            <span className="text-amber-400 shrink-0">•</span>
                                                        )}
                                                        <span className="text-slate-200">{item.name}</span>
                                                        {item.type === "regressing" && item.level != null && <span className="text-slate-500">— now Level {item.level}</span>}
                                                        {item.type === "next" && <span className="text-slate-500">— {item.next}</span>}
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </section>

                                    <section className="rounded-lg border border-emerald-500/40 bg-emerald-950/20 p-5">
                                        <h3 className="text-base font-semibold text-emerald-400 mb-1">Going well</h3>
                                        <p className="text-slate-400 text-sm mb-4">Improved or already strong.</p>
                                        {progressing.length === 0 && stableHigh.length === 0 ? (
                                            <p className="text-slate-300 text-sm">Complete another assessment to see trends. Criteria at level 3–4 are in good shape.</p>
                                        ) : (
                                            <ul className="space-y-1.5">
                                                {progressing.map(r => (
                                                    <li key={r.id} className="flex items-center gap-2 text-sm text-slate-200">
                                                        <span className="text-emerald-400" title="Improved">↑</span>
                                                        {r.name} <span className="text-slate-500">Level {r.previousLevel} → {r.latestLevel}</span>
                                                    </li>
                                                ))}
                                                {stableHigh.map(r => (
                                                    <li key={r.id} className="flex items-center gap-2 text-sm text-slate-300">
                                                        <span className="text-slate-500">—</span>
                                                        {r.name} <span className="text-slate-500">Level {r.latestLevel}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </section>

                                    {steps.length > 5 && (
                                        <p className="text-slate-500 text-xs">Showing top focus areas. Update your assessment to refresh.</p>
                                    )}
                                </div>
                            );
                        })()}
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
                            <h2 className="text-2xl font-semibold text-cyan-400 mb-6">Category breakdown (3 lowest-scoring applications)</h2>
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
                                        <strong className="text-slate-200">Select an organization</strong> — When you open the app, choose an organization from the list (or create one if none exist). Then add applications under it (name, optional description, type). Use <strong className="text-cyan-400">Switch organization</strong> to change context. Click the ✎ icon next to an application name to edit it.
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
                                        <strong className="text-slate-200">Compare and export</strong> — Use <strong className="text-cyan-400">Comparison</strong> to see maturity scores across applications (sorted worst to best). Use <strong className="text-emerald-400">Export CSV</strong>, <strong className="text-teal-400">Export Excel</strong>, or <strong className="text-purple-400">Export JSON</strong> to share or integrate with other tools.
                                    </div>
                                </li>
                            </ol>
                        </div>
                        <div className="bg-slate-800 rounded-lg shadow-2xl p-6 border border-slate-700">
                            <h2 className="text-2xl font-semibold text-cyan-400 mb-2">API reference</h2>
                            <p className="text-slate-400 text-sm mb-4">For integrations and automation. All endpoints are under <code className="bg-slate-700 px-1 rounded text-cyan-300">/api</code>. Use JSON request bodies where noted.</p>
                            <div className="space-y-4">
                                <div>
                                    <h3 className="text-lg font-medium text-slate-200 mb-2">Organizations</h3>
                                    <ul className="text-sm text-slate-300 space-y-1.5">
                                        <li><code className="bg-slate-700 px-1.5 py-0.5 rounded">GET /api/organizations</code> — List all organizations</li>
                                        <li><code className="bg-slate-700 px-1.5 py-0.5 rounded">POST /api/organizations</code> — Create (body: <code className="text-slate-400">{"{ name, description? }"}</code>)</li>
                                        <li><code className="bg-slate-700 px-1.5 py-0.5 rounded">GET /api/organizations/:id</code> — Get one organization</li>
                                        <li><code className="bg-slate-700 px-1.5 py-0.5 rounded">PATCH /api/organizations/:id</code> — Update (body: <code className="text-slate-400">{"{ name?, description? }"}</code>)</li>
                                        <li><code className="bg-slate-700 px-1.5 py-0.5 rounded">DELETE /api/organizations/:id</code> — Delete</li>
                                    </ul>
                                </div>
                                <div>
                                    <h3 className="text-lg font-medium text-slate-200 mb-2">Applications</h3>
                                    <ul className="text-sm text-slate-300 space-y-1.5">
                                        <li><code className="bg-slate-700 px-1.5 py-0.5 rounded">GET /api/applications</code> — List (query: <code className="text-slate-400">organizationId?</code>)</li>
                                        <li><code className="bg-slate-700 px-1.5 py-0.5 rounded">POST /api/applications</code> — Create (body: <code className="text-slate-400">{"{ organizationId, name, description?, type }"}</code>)</li>
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
                    </>
                )}
            </div>
        </div>
    );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<SDLCMaturityTracker />);
