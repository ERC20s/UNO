import * as WebSocket from "ws";
import UNO from "./uno";
import MSGTYPE from "./msgtype";
import quizInstance from "./quiz";

let unos: UNO[] = [];
// const uno = new UNO()
let UNO_CNT = 15;
for (let i = 0; i < UNO_CNT; i++) {
  unos.push(new UNO(i));
}
interface SocketObj {
  [propName: string]: any;
}
let sockets: SocketObj = {};
let liveSockets: SocketObj = {};
export let wss = new WebSocket.Server({ port: 3000 });
export interface CustomWs extends WebSocket {
  room: string;
  userId: string;
  unoId: number;
}
const closeDeadSockets = () => {
  const socketIds = Object.keys(sockets);
  const liveIds = Object.keys(liveSockets);
  socketIds.forEach((id) => {
    if (!liveIds.includes(id)) {
      console.log("disconnected user id ======>", id, sockets[id].unoId);
      if (sockets[id].unoId >= 0) {
        console.log(
          " leave user ",
          sockets[id].userId,
          "from UNO",
          sockets[id].unoId
        );
        unos[sockets[id].unoId].playerDrop(sockets[id].userId);
      }
      delete sockets[id];
    }
  });
};
setInterval(() => {
  // console.log(sockets, liveSockets)
  closeDeadSockets();
  liveSockets = {};
}, 15000);
wss.on("connection", (clientWs, request) => {
  const ws = clientWs as CustomWs;
  ws.room = request.url || "";
  console.log("new connection - ");
  for (let i = 0; i < UNO_CNT; i++) {
    const msg = {
      type: MSGTYPE.TABLE_CHANGE,
      playing: unos[i].onPlay,
      unoId: i,
    };
    ws.send(JSON.stringify(msg));
  }
  ws.on("open", function open() {
    console.log("- new open - ", ws.room);
  });
  // ws.on("close", function close() {
  //   console.log("disconnected ", ws.userId)
  //   if(ws.userId && ws.unoId) {
  //     console.log(" leave user ", ws.userId, "from UNO", ws.unoId)
  //     unos[ws.unoId].playerDrop(ws.userId)
  //   }
  // })
  ws.on("message", function message(data) {
    // console.log(data);
    var msg = JSON.parse(data.toString());
    msg.type !== MSGTYPE.PING_PONG && console.log(msg);
    if (msg.unoId > -1) ws.unoId = msg.unoId;
    const uno = unos[msg.unoId];
    switch (msg.type) {
      case MSGTYPE.PING_PONG:
        ws.userId = msg.data;
        sockets[msg.data] = ws;
        liveSockets[msg.data] = msg.data;
        ws.send(JSON.stringify({ type: MSGTYPE.PING_PONG_REPLY }));
        break;
      case MSGTYPE.LEAVE_GAME:
        if (ws.userId && ws.unoId !== undefined) {
          console.log(" leave user ", ws.userId, "from UNO", ws.unoId);
          uno.playerDrop(ws.userId);
        }
        break;
      case MSGTYPE.UNO_NEW:
        break;
      case MSGTYPE.JOIN_GAME:
        // ws.userId = msg.data;
        console.log("Joining game - ", msg.data, ws.unoId);
        const _userId = msg.data.userId;
        const exist = uno.playerIds.indexOf(_userId);
        if (exist != -1) {
          return console.log("already joined");
        }
        if (uno.onPlay) {
          uno.observerJoin(msg.data);
          ws.send(
            JSON.stringify({
              type: MSGTYPE.JOIN_GAME_REPLY,
              data: uno.getAllGameInfo(),
              unoId: ws.unoId,
            })
          );
          return console.log("already started");
        }
        uno.playerJoin(msg.data);
        console.log(uno.playerIds);
        if (ws.userId.includes("bot")) {
          wss.clients.forEach((client) => {
            const cWs = client as CustomWs;
            if (cWs.userId === _userId) {
              let msgg = {
                type: MSGTYPE.JOIN_GAME_REPLY,
                data: uno.getGameInfo(_userId),
                unoId: ws.unoId,
              };
              cWs.send(JSON.stringify(msgg));
            }
          });
        } else
          ws.send(
            JSON.stringify({
              type: MSGTYPE.JOIN_GAME_REPLY,
              data: uno.getGameInfo(_userId),
              unoId: ws.unoId,
            })
          );
        break;
      case MSGTYPE.START_GAME:
        uno.startGame();
        break;
      case MSGTYPE.GAME_INFO:
        ws.send(JSON.stringify(uno.getGameInfo(msg.data)));
        break;
      case MSGTYPE.CARD_THROW:
        uno.cardThrow(msg.data);
        break;
      case MSGTYPE.GET_CARD:
        uno.getCard(msg.data);
        break;
      case MSGTYPE.PASS_TURN:
        uno.passTurn(msg.data);
        break;
      case MSGTYPE.COLOR_PICK:
        uno.handleColorPick(msg.data);
        break;
      case MSGTYPE.QUIZ_UPLOAD:
        quizInstance.uploadQuiz(msg.data, msg.sender);
        break;
      case MSGTYPE.QUIZ_GET_REQUEST:
        quizInstance.getQuizToReview(ws);
        break;
      case MSGTYPE.QUIZ_ACCEPT_REQUEST:
        quizInstance.updateQuiz(ws, msg.id, true);
        break;
      case MSGTYPE.QUIZ_DECLINE_REQUEST:
        quizInstance.updateQuiz(ws, msg.id, false);
        break;
      case MSGTYPE.GET_QUIZ_BY_CATEGORY:
        quizInstance.getQuizByCategory(ws, msg.category);
        break;
      case MSGTYPE.HISTORY_ADD_REQUEST:
        quizInstance.addPassedInfo(msg.user, msg.category);
        break;
      case MSGTYPE.GET_HISTORY_REQUEST:
        quizInstance.getPassedInfo(msg.user, ws)
        break;
      case MSGTYPE.QUIZ_REMOVE:
        quizInstance.removeQuiz(msg.id)
        break;
    }
    // wss.clients.forEach(function each(client) {
    //   const cWs = client as customWs;

    //   if (cWs.readyState === WebSocket.OPEN && cWs.room === ws.room) {
    //     cWs.send(data);
    //   }
    // });
  });
});

wss.once("listening", () => {
  console.log("Listening on port 3000");
});
