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

    // Clear container
    document.getElementById('bracket-container').innerHTML = '';

    // Transform data to flat structure with plural keys expected by brackets-viewer
    const viewerData = {
        stages: data.stage || [],
        matches: data.match || [],
        participants: data.participant || [],
        matchGames: data.match_game || [],
    };

    console.log('Rendering bracket with transformed data:', viewerData);
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
        await windowBracketsViewer.render(viewerData, {
            selector: '#bracket-container',
            participantOriginPlacement: 'before',
            separatedChildCountWidth: 'draw',
            showSlotsOrigin: true,
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
