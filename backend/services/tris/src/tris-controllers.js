
//-----------------------------INTERNAL ROUTES-----------------------------

export const	createUserStats = async (req, reply) =>
{
	try
	{
		const	trisDb = req.server.trisDb;
		const	userId = req.body.userId;

		// Check if stats already exist for the user
		const	existingStats = await trisDb.getUserStats(userId);
		if (existingStats)
			return (reply.code(400).send({error: 'User stats already exist' }));

		// Create new stats entry
		await trisDb.createUserStats(userId);
		console.log(`[TRIS] Created stats for user ${userId}`);

		return (reply.code(201).send({message: 'User stats created successfully' }));
	}
	catch (err)
	{
		console.error('[TRIS] Error in createUserStats controller:', err);
		return (reply.code(500).send({error: 'Internal server error' }));
	}
}

export const	deleteUserStats = async (req, reply) =>
{
	try
	{
		const	trisDb = req.server.trisDb;
		const	userId = req.body.userId;

		// Check if stats exist for the user
		const	existingStats = await trisDb.getUserStats(userId);
		if (!existingStats)
			return (reply.code(404).send({error: 'User stats not found' }));

		// Delete stats entry
		await trisDb.deleteUserStats(userId);
		console.log(`[TRIS] Deleted stats for user ${userId}`);

		return (reply.code(200).send({message: 'User stats deleted successfully' }));
	}
	catch (err)
	{
		console.error('[TRIS] Error in deleteUserStats controller:', err);
		return (reply.code(500).send({error: 'Internal server error' }));
	}
}

//-----------------------------PUBLIC ROUTES-----------------------------

export const	getUserStats = async (req, reply) =>
{
	try
	{
		const	trisDb = req.server.trisDb;
		const	userId = req.query.id;

		// Retrieve user stats
		const	userStats = await trisDb.getUserStats(userId);
		if (!userStats)
			return (reply.code(404).send({ error: 'User stats not found' }));

		console.log(userStats);

		console.log(`[TRIS] Retrieved stats for user ${userId}`);

		return (reply.code(200).send(userStats));
	}
	catch (err)
	{
		console.error('[TRIS] Error in getUserStats controller:', err);
		return (reply.code(500).send({ error: 'Internal server error' }));
	}
}