const tournamentData = {
  "tournamentId": "3b3ae754-d1a7-4b19-bd9f-d7ef4df950f8",
  "name": "Test Tournament",
  "status": "FINISHED",
  "currentRound": 3,
  "totalRounds": 3,
  "participantCount": 7,
  "winnerId": "[object Object]",
  "rounds": [
    {
      "roundNumber": 1,
      "matches": [
        {
          "id": "9c479021-b7ec-4d21-a59c-1000e2c4e908",
          "playerLeftId": "test-user-1",
          "playerLeftUsername": "Alice",
          "playerRightId": "test-user-5",
          "playerRightUsername": "Eve",
          "status": "FINISHED",
          "winnerId": "test-user-1",
          "isBye": false,
          "endedAt": "2026-02-11T08:26:45.709Z",
          "tournamentId": "3b3ae754-d1a7-4b19-bd9f-d7ef4df950f8",
          "playerLeftScore": 11,
          "playerRightScore": 9
        },
        {
          "id": "25cda578-98e7-4445-ae30-47e70693a262",
          "playerLeftId": "test-user-2",
          "playerLeftUsername": "Bob",
          "playerRightId": "test-user-6",
          "playerRightUsername": "Frank",
          "status": "FINISHED",
          "winnerId": "test-user-2",
          "isBye": false,
          "endedAt": "2026-02-11T08:26:45.709Z",
          "tournamentId": "3b3ae754-d1a7-4b19-bd9f-d7ef4df950f8",
          "playerLeftScore": 11,
          "playerRightScore": 0
        },
        {
          "id": "86e70178-8280-44b0-a2b2-1ccc7ddea54c",
          "playerLeftId": "test-user-3",
          "playerLeftUsername": "Charlie",
          "playerRightId": "test-user-4",
          "playerRightUsername": "David",
          "status": "FINISHED",
          "winnerId": "test-user-3",
          "isBye": false,
          "endedAt": "2026-02-11T08:26:45.709Z",
          "tournamentId": "3b3ae754-d1a7-4b19-bd9f-d7ef4df950f8",
          "playerLeftScore": 11,
          "playerRightScore": 0
        },
        {
          "id": "7099b3fc-5f72-4e61-a213-a48d4b0372b6",
          "playerLeftId": "test-creator-id",
          "playerLeftUsername": "TestCreator",
          "playerRightId": "",
          "playerRightUsername": "",
          "status": "FINISHED",
          "winnerId": "",
          "isBye": true,
          "endedAt": "",
          "tournamentId": "3b3ae754-d1a7-4b19-bd9f-d7ef4df950f8",
          "playerLeftScore": 0,
          "playerRightScore": 0
        }
      ]
    },
    {
      "roundNumber": 2,
      "matches": [
        {
          "id": "110b045d-3b71-4eb3-8842-4dd16c1de900",
          "playerLeftId": "test-user-1",
          "playerLeftUsername": "Alice",
          "playerRightId": "test-user-2",
          "playerRightUsername": "Bob",
          "status": "FINISHED",
          "winnerId": "test-user-1",
          "isBye": false,
          "endedAt": "2026-02-11T08:26:45.709Z",
          "tournamentId": "3b3ae754-d1a7-4b19-bd9f-d7ef4df950f8",
          "playerLeftScore": 11,
          "playerRightScore": 7
        },
        {
          "id": "cd29a07d-cf0c-45d9-a542-e4d6172770d4",
          "playerLeftId": "test-user-3",
          "playerLeftUsername": "Charlie",
          "playerRightId": "test-creator-id",
          "playerRightUsername": "TestCreator",
          "status": "FINISHED",
          "winnerId": "test-user-3",
          "isBye": false,
          "endedAt": "2026-02-11T08:26:45.709Z",
          "tournamentId": "3b3ae754-d1a7-4b19-bd9f-d7ef4df950f8",
          "playerLeftScore": 11,
          "playerRightScore": 4
        }
      ]
    },
    {
      "roundNumber": 3,
      "matches": [
        {
          "id": "ad2a78fd-3ac3-42e0-b640-ba2235bbb9ae",
          "playerLeftId": "test-user-1",
          "playerLeftUsername": "Alice",
          "playerRightId": "test-user-3",
          "playerRightUsername": "Charlie",
          "status": "FINISHED",
          "winnerId": "test-user-1",
          "isBye": false,
          "endedAt": "2026-02-11T08:26:45.709Z",
          "tournamentId": "3b3ae754-d1a7-4b19-bd9f-d7ef4df950f8",
          "playerLeftScore": 11,
          "playerRightScore": 10
        }
      ]
    }
  ]
};

function transformBackendDataToViewerFormat(tournamentData) {
    const byeKey = 'BYE';
    const firstRound = (tournamentData.rounds && tournamentData.rounds[0]) ? tournamentData.rounds[0].matches : [];
    const slotList = [];
    for (const match of firstRound) {
        if (match.playerLeftId) slotList.push({ userId: match.playerLeftId, name: match.playerLeftUsername });
        if (match.isBye) slotList.push({ userId: byeKey, name: 'BYE' });
        else if (match.playerRightId) slotList.push({ userId: match.playerRightId, name: match.playerRightUsername });
    }
    const seen = new Set();
    const ordered = [];
    for (const p of slotList) {
        if (!seen.has(p.userId)) { seen.add(p.userId); ordered.push(p); }
    }

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

    console.log('ordered slots:', ordered.map(p=>p.name));
    console.log('participants:', participants.map(p=>p.name));

    // build first round matches by pairing participants
    const matches = [];
    for (let i = 0; i < participants.length; i += 2) {
        const left = participants[i];
        const right = participants[i+1];
        matches.push({ left: left ? left.name : null, right: right ? right.name : null });
    }
    console.log('paired first-round matches:', matches);
}

transformBackendDataToViewerFormat(tournamentData);
