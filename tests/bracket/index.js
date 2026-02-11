const TOURNAMENT_TEST_URL = 'https://localhost:3000/pong/tournaments/test';

async function fetchTournamentData() {
    try {
        
        console.log('Fetching from:', TOURNAMENT_TEST_URL);
        const response = await fetch(TOURNAMENT_TEST_URL, {
            method: 'GET',
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('Tournament data received:', data);
        
        return data;
    } catch (error) {
        console.error('Error fetching tournament data:', error);
        return null;
    }
}

function renderBracket(tournament) {
    if (!tournament || !tournament.rounds) {
        console.error('Invalid tournament data');
        return;
    }

    const container = document.getElementById('bracket-container');
    container.innerHTML = '';

    // Create header row with round titles
    const headerRow = document.createElement('div');
    headerRow.className = 'flex gap-6 pb-0 absolute top-0 left-0 w-full z-20';

    tournament.rounds.forEach((round) => {
        const titleBox = document.createElement('div');
        titleBox.className = 'min-w-[280px] text-center font-bold text-[var(--text)] text-sm';
        titleBox.textContent = `Round ${round.roundNumber}`;
        headerRow.appendChild(titleBox);
    });
    container.appendChild(headerRow);

    const matchElements = {}; // Store match box elements for line drawing

    // Render each round as a column
    tournament.rounds.forEach((round, roundIndex) => {
        const roundColumn = document.createElement('div');
        roundColumn.className = 'flex flex-col justify-center min-w-[280px] flex-shrink-0 relative z-10 h-full';

        // Render matches in this round
        const matchesContainer = document.createElement('div');
        matchesContainer.className = 'flex flex-col gap-8 flex-1';

        round.matches.forEach((match, index) => {
            const matchBox = createMatchBox(match);
            matchBox.dataset.matchId = match.id;
            matchBox.dataset.roundIndex = roundIndex;
            matchBox.dataset.matchIndex = index;
            matchElements[match.id] = matchBox;
            matchesContainer.appendChild(matchBox);
        });

        roundColumn.appendChild(matchesContainer);
        container.appendChild(roundColumn);
    });

    // Draw connector lines after a short delay to ensure elements are rendered
    setTimeout(() => {
        drawConnectorLines(tournament, matchElements);
    }, 0);

    // Update tournament header info
    updateTournamentInfo(tournament);
}

function createMatchBox(match) {
    const box = document.createElement('div');
    box.className = 'rounded shadow-sm overflow-hidden min-w-[250px] relative';


    // Player 1 (left)
    const player1Row = document.createElement('div');
    player1Row.className = 'flex justify-between items-center px-4 py-3 text-sm';
    if (match.winnerId === match.playerLeftId) {
        player1Row.className += ' bg-[var(--winner-bg)] font-semibold';
    }

    const player1Name = document.createElement('div');
    player1Name.className = 'flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-[var(--winner-text)]';
    player1Name.textContent = match.playerLeftUsername || '(Empty)';

    const player1Score = document.createElement('div');
    player1Score.className = 'font-semibold min-w-[2rem] text-right ml-4 text-[var(--winner-text)]';
    player1Score.textContent = match.playerLeftScore || 0;

    player1Row.appendChild(player1Name);
    player1Row.appendChild(player1Score);
    box.appendChild(player1Row);

    // Player 2 (right)
    const player2Row = document.createElement('div');
    player2Row.className = 'flex bg-[var(--match-bg)] justify-between items-center px-4 py-3 text-[var(--loser-text)] text-sm';
    if (match.winnerId === match.playerRightId) {
        player2Row.className += ' font-semibold';
    }

    const player2Name = document.createElement('div');
    player2Name.className = 'flex-1 overflow-hidden text-ellipsis whitespace-nowrap';
    player2Name.textContent = match.playerRightUsername || '(Empty)';

    const player2Score = document.createElement('div');
    player2Score.className = 'font-semibold min-w-[2rem] text-right ml-4 text-[var(--loser-score)]';
    player2Score.textContent = match.playerRightScore || 0;

    player2Row.appendChild(player2Name);
    player2Row.appendChild(player2Score);
    
    box.appendChild(player2Row);

    // Match status
    if (match.status === 'FINISHED') {
        const statusDiv = document.createElement('div');
        statusDiv.className = 'text-xs text-[var(--match-status)] text-center px-4 py-2 bg-[var(--match-bg)]';
        statusDiv.textContent = '✓ Finished';
        box.appendChild(statusDiv);
    }

    return box;
}

function drawConnectorLines(tournament, matchElements) {
    const svgElement = document.getElementById('connector-svg');
    if (!svgElement) return;

    const container = document.getElementById('bracket-svg-container');
    const containerRect = container.getBoundingClientRect();

    // Clear existing lines
    svgElement.innerHTML = '';

    // Draw lines between rounds
    for (let roundIdx = 0; roundIdx < tournament.rounds.length - 1; roundIdx++) {
        const currentRound = tournament.rounds[roundIdx];
        const nextRound = tournament.rounds[roundIdx + 1];

        currentRound.matches.forEach((currentMatch, currentIdx) => {
            nextRound.matches.forEach((nextMatch, nextIdx) => {
                // Find if there's a connection: current match's winner plays in next match
                const currentWinner = currentMatch.winnerId;
                const nextMatchHasWinner = 
                    (nextMatch.playerLeftId === currentWinner) || 
                    (nextMatch.playerRightId === currentWinner);

                if (nextMatchHasWinner) {
                    const fromBox = matchElements[currentMatch.id];
                    const toBox = matchElements[nextMatch.id];

                    if (fromBox && toBox) {
                        const fromRect = fromBox.getBoundingClientRect();
                        const toRect = toBox.getBoundingClientRect();

                        // Calculate positions relative to SVG container
                        const fromX = fromRect.right - containerRect.left;
                        const fromY = fromRect.top - containerRect.top + fromRect.height / 2;
                        const toX = toRect.left - containerRect.left;
                        const toY = toRect.top - containerRect.top + toRect.height / 2;

                        // Create path with curves
                        const midX = fromX + (toX - fromX) / 2;
                        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                        path.setAttribute('d', `M ${fromX} ${fromY} C ${midX} ${fromY}, ${midX} ${toY}, ${toX} ${toY}`);
                        path.setAttribute('stroke', '#cbd5e1');
                        path.setAttribute('stroke-width', '2');
                        path.setAttribute('fill', 'none');
                        path.setAttribute('stroke-linecap', 'round');

                        svgElement.appendChild(path);
                    }
                }
            });
        });
    }

    // Update SVG dimensions to fit all content
    const containerRect2 = container.getBoundingClientRect();
    svgElement.setAttribute('width', containerRect2.width);
    svgElement.setAttribute('height', containerRect2.height);
}

function updateTournamentInfo(tournament) {
    document.getElementById('tournament-name').textContent = tournament.name || 'Tournament';
    document.getElementById('tournament-status').textContent = tournament.status || '-';
    document.getElementById('tournament-participants').textContent = tournament.participantCount || '-';
    document.getElementById('tournament-rounds').textContent = tournament.totalRounds || '-';
    
    // Find winner name from last round
    const lastRound = tournament.rounds[tournament.rounds.length - 1];
    if (lastRound && lastRound.matches.length > 0) {
        const finalMatch = lastRound.matches[0];
        if (finalMatch.winnerId === finalMatch.playerLeftId) {
            document.getElementById('tournament-winner').textContent = finalMatch.playerLeftUsername || '-';
        } else if (finalMatch.winnerId === finalMatch.playerRightId) {
            document.getElementById('tournament-winner').textContent = finalMatch.playerRightUsername || '-';
        }
    }
}

async function initialize() {
    const tournament = await fetchTournamentData();
    if (tournament) {
        renderBracket(tournament);
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', initialize);

// Theme toggle
function initThemeToggle() {
    const toggle = document.getElementById('theme-toggle');
    if (!toggle) return;

    // Load saved theme or default to light
    const saved = localStorage.getItem('theme');
    if (saved === 'dark') {
        document.documentElement.classList.add('dark');
        toggle.textContent = '☀️ Light Mode';
    }

    toggle.addEventListener('click', () => {
        const isDark = document.documentElement.classList.toggle('dark');
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
        toggle.textContent = isDark ? '☀️ Light Mode' : '🌙 Dark Mode';
    });
}

document.addEventListener('DOMContentLoaded', () => {
    initThemeToggle();
});
