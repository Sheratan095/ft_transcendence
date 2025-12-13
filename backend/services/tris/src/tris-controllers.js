
export const initBoard = async (req, reply) =>
{
    //console.log("Initializing board");
    const board = Array(9).fill('empty');
    return reply.code(200).send(board);
}

export const init = async () => {
    console.log("hello world");
}