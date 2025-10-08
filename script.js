// Configuration
const CONFIG = {
    PASSCODE: "12345",
    ADMIN_TITLE: "Tabulator Committee"
};

// Application State
let state = {
    candidates: [],
    judges: [],
    criteria: [],
    scores: {},
    mode: 'offline',
    deviceRole: 'judge',
    firebaseConfig: null
};

// DOM Elements
function el(id) { return document.getElementById(id); }

// Initialize Application
function init() {
    loadState();
    setupEventListeners();
    renderLists();
}

// Load state from localStorage
function loadState() {
    const saved = localStorage.getItem('tabulator_state');
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            // Only load specific properties to avoid conflicts
            state.candidates = parsed.candidates || [];
            state.judges = parsed.judges || [];
            state.criteria = parsed.criteria || [];
            state.scores = parsed.scores || {};
            state.mode = parsed.mode || 'offline';
        } catch (e) {
            console.warn('Failed to load saved state');
        }
    }
}

// Save state to localStorage
function saveState() {
    const stateToSave = {
        candidates: state.candidates,
        judges: state.judges,
        criteria: state.criteria,
        scores: state.scores,
        mode: state.mode
    };
    localStorage.setItem('tabulator_state', JSON.stringify(stateToSave));
}

// Passcode System
function checkPasscode() {
    const input = el('passcodeInput').value;
    if (input === CONFIG.PASSCODE) {
        el('passcodeGate').classList.add('hidden');
        el('mainSystem').classList.remove('hidden');
        renderLists();
    } else {
        el('passcodeError').textContent = 'Incorrect passcode. Please try again.';
    }
}

// Render Lists
function renderLists() {
    renderCandidateList();
    renderCriteriaList();
    renderJudgeList();
    updateJudgeSelector();
    buildScoringTable();
}

function renderCandidateList() {
    const list = el('candidateList');
    list.innerHTML = state.candidates.map(candidate => `
        <div class="item">
            <span>${candidate.name}</span>
            <button class="btnDelete" data-id="${candidate.id}" data-type="candidate">Delete</button>
        </div>
    `).join('');
}

function renderCriteriaList() {
    const list = el('criteriaList');
    list.innerHTML = state.criteria.map(criterion => `
        <div class="item">
            <span>${criterion.name} (${criterion.weight}%)</span>
            <button class="btnDelete" data-id="${criterion.id}" data-type="criteria">Delete</button>
        </div>
    `).join('');
}

function renderJudgeList() {
    const list = el('judgeList');
    list.innerHTML = state.judges.map(judge => `
        <div class="item">
            <span>${judge.name}</span>
            <button class="btnDelete" data-id="${judge.id}" data-type="judge">Delete</button>
        </div>
    `).join('');
}

function updateJudgeSelector() {
    const selector = el('judgeSelector');
    selector.innerHTML = '<option value="all">Summary View (All Judges)</option>';
    state.judges.forEach(judge => {
        selector.innerHTML += `<option value="${judge.id}">${judge.name}</option>`;
    });
}

// Add Items
function addCandidate() {
    const name = el('candidateName').value.trim();
    if (name) {
        const candidate = {
            id: 'candidate_' + Date.now(),
            name: name
        };
        state.candidates.push(candidate);
        el('candidateName').value = '';
        saveState();
        renderLists();
    }
}

function addCriteria() {
    const name = el('criteriaName').value.trim();
    const weight = parseInt(el('criteriaWeight').value);
    if (name && weight && weight > 0 && weight <= 100) {
        const criterion = {
            id: 'criteria_' + Date.now(),
            name: name,
            weight: weight
        };
        state.criteria.push(criterion);
        el('criteriaName').value = '';
        el('criteriaWeight').value = '';
        saveState();
        renderLists();
    }
}

function addJudge() {
    const name = el('judgeName').value.trim();
    if (name) {
        const judge = {
            id: 'judge_' + Date.now(),
            name: name
        };
        state.judges.push(judge);
        el('judgeName').value = '';
        saveState();
        renderLists();
    }
}

// Delete Items
function deleteItem(id, type) {
    if (confirm(`Are you sure you want to delete this ${type}?`)) {
        if (type === 'candidate') {
            state.candidates = state.candidates.filter(c => c.id !== id);
            // Remove scores for this candidate
            Object.keys(state.scores).forEach(key => {
                if (key.startsWith(`${id}_`)) delete state.scores[key];
            });
        } else if (type === 'criteria') {
            state.criteria = state.criteria.filter(c => c.id !== id);
            // Remove scores for this criteria
            Object.keys(state.scores).forEach(key => {
                if (key.endsWith(`_${id}`)) delete state.scores[key];
            });
        } else if (type === 'judge') {
            state.judges = state.judges.filter(j => j.id !== id);
            // Remove scores for this judge
            Object.keys(state.scores).forEach(key => {
                const parts = key.split('_');
                if (parts[2] === id) delete state.scores[key];
            });
        }
        saveState();
        renderLists();
    }
}

// Score Management
function setScore(candidateId, criteriaId, judgeId, score) {
    const scoreKey = `${candidateId}_${criteriaId}_${judgeId}`;
    const numericScore = Math.min(100, Math.max(0, parseFloat(score) || 0));
    state.scores[scoreKey] = numericScore;
    saveState();
    buildScoringTable(); // Rebuild to update totals
}

// Build Scoring Table
function buildScoringTable() {
    const container = el('scoringTableContainer');
    const selectedJudgeId = el('judgeSelector').value;
    const isSummaryView = selectedJudgeId === 'all';
    
    if (state.candidates.length === 0 || state.criteria.length === 0 || state.judges.length === 0) {
        container.innerHTML = '<p class="no-data">Please add candidates, criteria, and judges to begin scoring.</p>';
        return;
    }

    let html = '<table><thead><tr><th>Rank</th><th>Candidate</th>';
    
    // Add criteria headers
    state.criteria.forEach(criterion => {
        html += `<th>${criterion.name} (${criterion.weight}%)</th>`;
    });
    
    html += '<th>Total Score</th></tr></thead><tbody>';
    
    // Calculate scores and prepare data
    const candidateScores = state.candidates.map(candidate => {
        const scores = {};
        let total = 0;
        
        state.criteria.forEach(criterion => {
            let criterionTotal = 0;
            let judgeCount = 0;
            
            state.judges.forEach(judge => {
                if (isSummaryView || selectedJudgeId === judge.id) {
                    const scoreKey = `${candidate.id}_${criterion.id}_${judge.id}`;
                    const score = parseFloat(state.scores[scoreKey]) || 0;
                    criterionTotal += score;
                    judgeCount++;
                }
            });
            
            const averageScore = judgeCount > 0 ? criterionTotal / judgeCount : 0;
            const weightedScore = averageScore * (criterion.weight / 100);
            scores[criterion.id] = {
                average: averageScore,
                weighted: weightedScore
            };
            total += weightedScore;
        });
        
        return {
            candidate,
            scores,
            total
        };
    });
    
    // Sort by total score (highest first) for ranking
    candidateScores.sort((a, b) => b.total - a.total);
    
    // Generate table rows
    candidateScores.forEach((candidateData, index) => {
        const rank = index + 1;
        const rowClass = rank === 1 ? 'rank-1' : '';
        
        html += `<tr class="${rowClass}"><td>${rank}</td><td>${candidateData.candidate.name}</td>`;
        
        state.criteria.forEach(criterion => {
            if (isSummaryView) {
                // Summary view shows averages
                const scoreData = candidateData.scores[criterion.id];
                html += `<td>${scoreData.average.toFixed(1)}</td>`;
            } else {
                // Judge view shows input fields
                const scoreKey = `${candidateData.candidate.id}_${criterion.id}_${selectedJudgeId}`;
                const currentScore = state.scores[scoreKey] || '';
                html += `<td>
                    <input type="number" class="scoreInput" 
                           data-cid="${candidateData.candidate.id}" 
                           data-crid="${criterion.id}"
                           data-jid="${selectedJudgeId}"
                           value="${currentScore}" 
                           min="0" max="100" step="0.1">
                </td>`;
            }
        });
        
        html += `<td class="total-score">${candidateData.total.toFixed(2)}</td></tr>`;
    });
    
    html += '</tbody></table>';
    container.innerHTML = html;
    
    // Add event listeners to score inputs
    if (!isSummaryView) {
        document.querySelectorAll('.scoreInput').forEach(input => {
            input.addEventListener('input', handleScoreInput);
        });
    }
}

// Handle score input
function handleScoreInput(event) {
    const input = event.target;
    const candidateId = input.dataset.cid;
    const criteriaId = input.dataset.crid;
    const judgeId = input.dataset.jid;
    const score = input.value;
    
    setScore(candidateId, criteriaId, judgeId, score);
}

// Event Listeners
function setupEventListeners() {
    // Passcode
    el('enterSystem').addEventListener('click', checkPasscode);
    el('passcodeInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') checkPasscode();
    });
    
    // Add buttons
    el('addCandidate').addEventListener('click', addCandidate);
    el('addCriteria').addEventListener('click', addCriteria);
    el('addJudge').addEventListener('click', addJudge);
    
    // Delete buttons
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('btnDelete')) {
            const id = e.target.dataset.id;
            const type = e.target.dataset.type;
            deleteItem(id, type);
        }
    });
    
    // Mode switching
    el('offlineMode').addEventListener('click', () => setMode('offline'));
    el('liveMode').addEventListener('click', () => setMode('live'));
    
    // Judge selector
    el('judgeSelector').addEventListener('change', buildScoringTable);
    
    // Export and Print
    el('exportCSV').addEventListener('click', exportToCSV);
    el('printResults').addEventListener('click', () => window.print());
}

function setMode(mode) {
    state.mode = mode;
    el('offlineMode').classList.toggle('active', mode === 'offline');
    el('liveMode').classList.toggle('active', mode === 'live');
    el('firebaseConfig').classList.toggle('hidden', mode === 'offline');
    saveState();
}

function exportToCSV() {
    let csv = 'Rank,Candidate,';
    
    // Add criteria headers
    state.criteria.forEach(criterion => {
        csv += `${criterion.name},`;
    });
    csv += 'Total Score\n';
    
    // Calculate scores
    const candidateScores = state.candidates.map(candidate => {
        const scores = {};
        let total = 0;
        
        state.criteria.forEach(criterion => {
            let criterionTotal = 0;
            let judgeCount = 0;
            
            state.judges.forEach(judge => {
                const scoreKey = `${candidate.id}_${criterion.id}_${judge.id}`;
                const score = parseFloat(state.scores[scoreKey]) || 0;
                criterionTotal += score;
                judgeCount++;
            });
            
            const averageScore = judgeCount > 0 ? criterionTotal / judgeCount : 0;
            const weightedScore = averageScore * (criterion.weight / 100);
            scores[criterion.id] = averageScore;
            total += weightedScore;
        });
        
        return { candidate, scores, total };
    });
    
    // Sort by total score
    candidateScores.sort((a, b) => b.total - a.total);
    
    // Add data rows
    candidateScores.forEach((candidateData, index) => {
        const rank = index + 1;
        csv += `${rank},"${candidateData.candidate.name}",`;
        state.criteria.forEach(criterion => {
            csv += `${candidateData.scores[criterion.id].toFixed(2)},`;
        });
        csv += `${candidateData.total.toFixed(2)}\n`;
    });
    
    // Download
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'pageant-scores.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', init);