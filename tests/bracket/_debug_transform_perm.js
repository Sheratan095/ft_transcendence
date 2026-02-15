const tournamentData = JSON.parse(require('fs').readFileSync('tests/bracket/_debug_input.json','utf8'));

function transformBackendDataToViewerFormat(tournamentData) {
    const byeKey = 'BYE';
    const firstRound = (tournamentData.rounds && tournamentData.rounds[0]) ? tournamentData.rounds[0].matches : [];
    const slotList = [];
    for (const match of firstRound) {
        if (match.playerLeftId) slotList.push({ userId: match.playerLeftId, name: match.playerLeftUsername });
        if (match.isBye) slotList.push({ userId: byeKey, name: 'BYE' });
        else if (match.playerRightId) slotList.push({ userId: match.playerRightId, name: match.playerRightUsername });
    }
    console.log('slotList raw:', slotList.map(s => `${s.userId}:${s.name}`));
    const seen = new Set();
    const ordered = [];
    for (const p of slotList) {
        if (!seen.has(p.userId)) { seen.add(p.userId); ordered.push(p); }
    }
    console.log('ordered (dedup):', ordered.map(s => `${s.userId}:${s.name}`));

    const participants = [];
    const userIdToPid = new Map();
    const pidToUserId = new Map();
    for (let i = 0; i < ordered.length; i++) {
        const p = ordered[i];
        const pid = i + 1;
        participants.push({ id: pid, tournament_id: 0, name: p.name });
        userIdToPid.set(p.userId, pid);
        pidToUserId.set(pid, p.userId);
    }

    // add remaining
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

    if (!userIdToPid.has(byeKey)) {
        const pid = participants.length + 1;
        participants.push({ id: pid, tournament_id: 0, name: 'BYE' });
        userIdToPid.set(byeKey, pid);
        pidToUserId.set(pid, byeKey);
    }

    const byePid = userIdToPid.get(byeKey);
    const firstRoundMatches = (tournamentData.rounds && tournamentData.rounds[0]) ? tournamentData.rounds[0].matches : [];

    let matchNumber = 1;
    const matches = [];

    tournamentData.rounds.forEach((round, roundIdx) => {
        if (roundIdx === 0) {
            let pairingParticipants = participants;
            if (participants.length === 8) {
                const perm = [7,6,2,5,1,4,3,8];
                pairingParticipants = perm.map(idx => participants[idx - 1]);
            }
            for (let i = 0; i < pairingParticipants.length; i += 2) {
                const leftPart = pairingParticipants[i] || null;
                const rightPart = pairingParticipants[i+1] || null;
                const pidLeft = leftPart ? leftPart.id : null;
                const pidRight = rightPart ? rightPart.id : null;
                const leftUserId = pidLeft ? pidToUserId.get(pidLeft) : null;
                const rightUserId = pidRight ? pidToUserId.get(pidRight) : null;
                const backendMatch = firstRoundMatches.find(m => {
                    if (!m) return false;
                    if (m.playerLeftId === leftUserId && (m.playerRightId === rightUserId || (m.isBye && rightUserId === byeKey))) return true;
                    if (m.playerLeftId === rightUserId && m.playerRightId === leftUserId) return true;
                    return false;
                }) || {};
                const opponent1 = pidLeft ? { id: pidLeft, position:1, score: backendMatch.playerLeftId===leftUserId ? (backendMatch.playerLeftScore||0):(backendMatch.playerRightScore||0)||0, result: backendMatch.winnerId ? (backendMatch.winnerId===leftUserId?'win':'loss') : 'loss', name: leftPart?leftPart.name:null } : null;
                let opponent2 = null;
                if (rightUserId===byeKey) opponent2 = { id: byePid, position:2, score:0, result:'loss', name:'BYE' };
                else if (pidRight) opponent2 = { id: pidRight, position:2, score: backendMatch.playerRightId===rightUserId ? (backendMatch.playerRightScore||0):(backendMatch.playerLeftScore||0)||0, result: backendMatch.winnerId ? (backendMatch.winnerId===rightUserId?'win':'loss') : 'loss', name: rightPart?rightPart.name:null };
                matches.push({ id: matchNumber, round_id:1, number: matchNumber, opponent1, opponent2 });
                matchNumber++;
            }
        } else {
            round.matches.forEach(match => {
                const leftPid = userIdToPid.get(match.playerLeftId);
                const rightPid = match.playerRightId ? userIdToPid.get(match.playerRightId) : null;
                const opponent1 = leftPid ? { id:leftPid, position:1, score: match.playerLeftScore||0, result: match.winnerId===match.playerLeftId?'win':'loss', name: match.playerLeftUsername } : null;
                let opponent2 = null;
                if (match.isBye) opponent2 = { id: byePid, position:2, score:0, result:'loss', name:'BYE' };
                else if (rightPid) opponent2 = { id: rightPid, position:2, score: match.playerRightScore||0, result: match.winnerId===match.playerRightId?'win':'loss', name: match.playerRightUsername };
                matches.push({ id: matchNumber, round_id: match.roundNumber, number: matchNumber, opponent1, opponent2 });
                matchNumber++;
            });
        }
    });

    return { participants, matches };
}

const out = transformBackendDataToViewerFormat(tournamentData);
console.log('participants:', out.participants.map(p=>p.name));
console.log('matches first round:');
out.matches.filter(m=>m.round_id===1).forEach(m=> console.log(m.number, m.opponent1?.name, 'vs', m.opponent2?.name));
