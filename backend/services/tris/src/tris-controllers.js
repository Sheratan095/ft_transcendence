
export const initBoard = async (req, reply) =>
{
    //console.log("Initializing board");
    //const board = Array.from({ length: 3 }, () => Array(3).fill('empty'));
    const board = Array(3);
    board[0] = Array("empty", "empty", "empty");
    board[1] = Array("empty", "empty", "empty");
    board[2] = Array("empty", "empty", "empty");
    return reply.code(200).send(board);
}

export const init = async () => {
    console.log("hello world");
}