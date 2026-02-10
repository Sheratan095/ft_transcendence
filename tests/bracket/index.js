const TOURNAMENT_TEST_URL = 'https://localhost:3000/pong/tournaments/test';
const statusElement = document.getElementById('status');

async function fetchTournamentData() {
    try {
        statusElement.innerText = 'Fetching data...';
        statusElement.className = 'p-4 rounded bg-blue-50 border border-blue-200 font-mono text-sm text-blue-700';
        
        console.log('Fetching from:', TOURNAMENT_TEST_URL);
        const response = await fetch(TOURNAMENT_TEST_URL, {
            method: 'GET',
            credentials: 'include'
        });

        console.log('Response status:', response.status);
        console.log('Response ok:', response.ok);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('Tournament data received:', data);
        
        statusElement.innerText = 'Data received successfully. Rendering bracket...';
        statusElement.className = 'p-4 rounded bg-green-50 border border-green-200 font-mono text-sm text-green-700';
        
        return data;
    } catch (error) {
        console.error('Error fetching tournament data:', error);
        statusElement.innerText = `Error: ${error.message}`;
        statusElement.className = 'p-4 rounded bg-red-50 border border-red-200 font-mono text-sm text-red-700';
        return null;
    }
}

function transformBackendDataToViewerFormat(tournamentData) {
    // Build participants ordered by first-round slots so the viewer indices match slot positions
    const participantMap = new Map();
    let participantId = 1; // use 1-based ids for viewer compatibility

    const byeKey = 'BYE';

    // Collect slot order from first round (left then right for each match)
    const firstRound = (tournamentData.rounds && tournamentData.rounds[0]) ? tournamentData.rounds[0].matches : [];
    const slotList = [];
    for (const match of firstRound) {
        if (match.playerLeftId)
            slotList.push({ userId: match.playerLeftId, name: match.playerLeftUsername });

        if (match.isBye)
            slotList.push({ userId: byeKey, name: 'BYE' });
        else if (match.playerRightId)
            slotList.push({ userId: match.playerRightId, name: match.playerRightUsername });
    }

    // Deduplicate preserving order
    const seen = new Set();
    const ordered = [];
    for (const p of slotList) {
        if (!seen.has(p.userId)) {
            seen.add(p.userId);
            ordered.push(p);
        }
    }

    // Build participants array strictly from first-round slot order
    const participants = [];
    const userIdToPid = new Map();

    for (let i = 0; i < ordered.length; i++) {
        const p = ordered[i];
        const pid = i + 1; // 1-based
        participants.push({ id: pid, tournament_id: 0, name: p.name });
        userIdToPid.set(p.userId, pid);
    }

    // Add remaining participants not in first round
    tournamentData.rounds.forEach(round => {
        round.matches.forEach(match => {
            if (match.playerLeftId && !userIdToPid.has(match.playerLeftId)) {
                const pid = participants.length + 1;
                participants.push({ id: pid, tournament_id: 0, name: match.playerLeftUsername });
                userIdToPid.set(match.playerLeftId, pid);
            }

            if (!match.isBye && match.playerRightId && !userIdToPid.has(match.playerRightId)) {
                const pid = participants.length + 1;
                participants.push({ id: pid, tournament_id: 0, name: match.playerRightUsername });
                userIdToPid.set(match.playerRightId, pid);
            }
        });
    });

    // Ensure BYE participant exists at the end
    if (!userIdToPid.has(byeKey)) {
        const pid = participants.length + 1;
        participants.push({ id: pid, tournament_id: 0, name: 'BYE' });
        userIdToPid.set(byeKey, pid);
    }

    console.log('Participants (ordered slots):', participants);
    console.log('UserId -> participant id map:', userIdToPid);

    // Reference to BYE participant id for match construction
    const byePid = userIdToPid.get(byeKey);

    // Create stage (1-based IDs)
    const stages = [{
        id: 1,
        tournament_id: 0,
        name: tournamentData.name || 'Tournament',
        type: 'single_elimination',
        number: 1,
        settings: {
            size: 8, // Power of 2 for brackets (7 players + 1 BYE = 8 slots)
            seedOrdering: ['natural']
        }
    }];

    // Create groups (1-based IDs)
    const groups = [{ id: 1, stage_id: 1, number: 1 }];

    // Create rounds (1-based IDs)
    const rounds = tournamentData.rounds.map((round, idx) => ({
        id: idx + 1,
        group_id: 1,
        number: round.roundNumber,
        stage_id: 1
    }));

    // Create matches
    let matchNumber = 1; // 1-based match ids
    const matches = [];

    tournamentData.rounds.forEach((round, roundIdx) => {
        console.log(`Processing round ${roundIdx + 1}, matches:`, round.matches.length);
        round.matches.forEach((match, matchIdx) => {
            console.log(`Match ${matchIdx}:`, {
                left: match.playerLeftUsername,
                right: match.playerRightUsername,
                isBye: match.isBye
            });
            
            const leftPid = userIdToPid.get(match.playerLeftId);
            const rightPid = match.playerRightId ? userIdToPid.get(match.playerRightId) : null;

            const opponent1 = leftPid ? {
                id: leftPid,
                position: 1,
                score: match.playerLeftScore || 0,
                result: (match.winnerId === match.playerLeftId || match.isBye) ? 'win' : 'loss',
                name: match.playerLeftUsername
            } : null;

            // Handle BYE matches - use BYE participant instead of null
            let opponent2;
            if (match.isBye) {
                opponent2 = {
                    id: byePid,
                    position: 2,
                    score: 0,
                    result: 'loss',
                    name: 'BYE'
                };
            } else if (rightPid) {
                opponent2 = {
                    id: rightPid,
                    position: 2,
                    score: match.playerRightScore || 0,
                    result: match.winnerId === match.playerRightId ? 'win' : 'loss',
                    name: match.playerRightUsername
                };
            }

            const matchData = {
                id: matchNumber,
                stage_id: 1,
                group_id: 1,
                round_id: roundIdx + 1,
                number: matchNumber, // global unique match number across tournament
                status: match.status === 'FINISHED' ? 4 : 2, // 4 = completed, 2 = running
                child_count: 0,
                opponent1: opponent1,
                opponent2: opponent2 !== undefined ? opponent2 : null
            };

            console.log(`Match ${matchData.number} in round ${roundIdx + 1}:`, {
                matchId: matchData.id,
                opponent1: matchData.opponent1 ? `ID:${matchData.opponent1.id} ${matchData.opponent1.name}` : 'null',
                opponent2: matchData.opponent2 ? `ID:${matchData.opponent2.id} ${matchData.opponent2.name}` : 'undefined/BYE'
            });

            if (match.isBye) {
                console.log(`BYE match ${matchData.id} details:`, JSON.stringify(matchData, null, 2));
            }
            matches.push(matchData);
            matchNumber++;
        });
    });

    return {
        participant: participants,
        stage: stages,
        group: groups,
        round: rounds,
        match: matches,
        match_game: []
    };
}

async function renderBracket() {
    const data = await fetchTournamentData();
    if (!data) return;

    const windowBracketsViewer = window.bracketsViewer;
    if (!windowBracketsViewer) {
        console.error('brackets-viewer library not found');
        statusElement.innerText = 'Error: brackets-viewer library not found';
        statusElement.className = 'p-4 rounded bg-red-50 border border-red-200 font-mono text-sm text-red-700';
        return;
    }

    // Clear container completely
    const container = document.getElementById('bracket-container');
    container.innerHTML = '';
    
    // Remove any existing brackets-viewer classes/data
    container.className = 'brackets-viewer w-full min-h-[500px]';

    // Transform backend data to viewer format
    console.log('Original tournament data:', data);
    const transformedData = transformBackendDataToViewerFormat(data);
    console.log('Transformed d  ata:', transformedData);

    // Expose data for debugging in browser console
    window.transformedDataForDebug = transformedData;

    // Transform data to flat structure with plural keys expected by brackets-viewer
    const viewerData = {
        stages: transformedData.stage || [],
        matches: transformedData.match || [],
        participants: transformedData.participant || [],
        matchGames: transformedData.match_game || [],
    };

    // expose viewerData for console debugging
    window.viewerDataForDebug = viewerData;

    console.log('Rendering bracket with viewer data:', viewerData);
    console.log('Stages length:', viewerData.stages.length);
    console.log('Matches length:', viewerData.matches.length);
    console.log('Participants length:', viewerData.participants.length);

    // Check if required arrays have data
    if (!viewerData.stages.length) {
        console.error('No stages data found');
        statusElement.innerText = 'Error: No stages data found';
        statusElement.className = 'p-4 rounded bg-red-50 border border-red-200 font-mono text-sm text-red-700';
        return;
    }

    if (!viewerData.matches.length) {
        console.error('No matches data found');
        statusElement.innerText = 'Error: No matches data found';
        statusElement.className = 'p-4 rounded bg-red-50 border border-red-200 font-mono text-sm text-red-700';
        return;
    }

    try {
        console.log('Calling bracketsViewer.render with nested data...');
        
        // Log first round matches specifically (rounds are 1-based)
        console.log('First round matches being rendered:');
        viewerData.matches.filter(m => m.round_id === 1).forEach(m => {
            console.log(`  Match ${m.number}: ${m.opponent1?.name || 'null'} vs ${m.opponent2?.name || 'BYE'} (IDs: ${m.opponent1?.id} vs ${m.opponent2?.id})`);
        });
        
        // Use render with full data object structure
        await windowBracketsViewer.render(
            {
                stages: viewerData.stages,
                matches: viewerData.matches,
                matchGames: viewerData.matchGames,
                participants: viewerData.participants
            },
            {
            selector: '#bracket-container',
            participantOriginPlacement: 'none',
            separatedChildCountWidth: 'draw',
            showSlotsOrigin: false, // disable origin slots to prevent duplicate initial column
            showLowerBracket: false,
            showFinals: true,
            connectFinal: true,
            roundMargin: 24,
            matchMargin: 24,
        });
        
        console.log('Bracket render completed successfully');
        statusElement.innerText = 'Bracket rendered successfully!';
        statusElement.className = 'p-4 rounded bg-green-50 border border-green-200 font-mono text-sm text-green-700';
    } catch (error) {
        console.error('Error rendering bracket:', error);
        statusElement.innerText = `Render Error: ${error.message}`;
        statusElement.className = 'p-4 rounded bg-red-50 border border-red-200 font-mono text-sm text-red-700';
    }
}

// Initial render
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, checking for brackets-viewer...');
    console.log('window.bracketsViewer:', window.bracketsViewer);
    
    if (typeof window.bracketsViewer === 'undefined') {
        console.error('brackets-viewer not loaded');
        statusElement.innerText = 'Error: brackets-viewer library not loaded';
        statusElement.className = 'p-4 rounded bg-red-50 border border-red-200 font-mono text-sm text-red-700';
        return;
    }
    
    console.log('brackets-viewer found, starting render...');
    renderBracket();
});

// Reload button
const reloadBtn = document.getElementById('reload-btn');
if (reloadBtn) {
    reloadBtn.addEventListener('click', () => {
        renderBracket();
    });
}
