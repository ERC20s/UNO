import { getUserData } from "@decentraland/Identity";
import { getCurrentRealm, Realm } from "@decentraland/EnvironmentAPI";
import msgtype from "./msgtype";
import { UNO_BOT } from "./botUno";
import * as utils from "@dcl/ecs-scene-utils";
import { UNO } from "./uno";

// how often the lastKicker player sends updates to server, in seconds
let timeout: Entity;
let botTimeout: Entity;
export let unos: UNO[] = [];
// export let alteredUserName: any
let userData: any;
let botAddress: string;
const local: boolean = false;

// const server = /* local
// ? 'ws://137-184-85-69.nip.io:443'
// : */ 'wss://137-184-85-69.nip.io:443'

const server = local
  ? "ws://localhost:3000"
  : "wss://127-0-0-1.nip.io:443";

// change this wss url to your own..

let unoId = -1;
const genRanHex = (size: number) => {
  return [...Array(size)]
    .map(() => Math.floor(Math.random() * 16).toString(16))
    .join("");
};

function ping(socket: WebSocket, userId: string) {
  const msg = {
    type: msgtype.PING_PONG,
    data: userId,
  };
  socket.send(JSON.stringify(msg));
}
export let uno_bot: UNO_BOT;

export async function joinSocketServer() {
  log("About to get the user data - ");
  userData = await getUserData();
  botAddress = `0x${genRanHex(37)}bot`;
  // alteredUserName = userData.displayName + Math.floor(Math.random() * 10000)

  let realm: Realm | undefined = await getCurrentRealm(); // { displayName: 'pepito' } //

  if (realm != undefined) log(`You are in the realm: `, realm.displayName);
  // connect to websockets server
  const socket = new WebSocket(server, "human");
  const botSocket = new WebSocket(server, "bot");
  uno_bot = new UNO_BOT(0, botSocket);
  uno_bot.botAddress = botAddress;
  socket.onopen = function () {
    log("OPEN SOCKET");
    log("SEND: START");
    ping(socket, userData?.userId);
  };
  botSocket.onopen = function () {
    log("OPEN SOCKET BOT");
    log("SEND: START BOT");
    ping(botSocket, botAddress);
  };
  socket.onmessage = async function (event) {
    try {
      const msg = JSON.parse(event.data);
      unoId = msg.unoId > -1 ? msg.unoId : unoId;
      if (unoId === -1) return;
      const uno = unos[unoId];
      switch (msg.type) {
        case msgtype.PING_PONG_REPLY:
          if (timeout) engine.removeEntity(timeout);
          timeout = utils.setTimeout(10000, () => {
            ping(socket, userData?.userId);
          });
          engine.addEntity(timeout);
          break;
        case msgtype.JOIN_INFORM:
          uno.otherPlayerJoined(msg.data);
          break;
        case msgtype.JOIN_GAME_REPLY:
          uno.joinLobby(msg.data);
          break;
        case msgtype.START_GAME_REPLY:
          uno.handleGameStarted(msg.data);
          break;
        case msgtype.CARD_THROW_REPLY:
          uno.handleCardThrow(msg.data);
          break;
        case msgtype.GET_CARD_REPLY:
          uno.handleGetCard(msg.data);
          break;
        case msgtype.PASS_TURN_REPLY:
          uno.handlePassTurn(msg.data);
          break;
        case msgtype.COLOR_PICK_REPLY:
          uno.handleColorPick(msg.data);
          break;
        case msgtype.END_GAME:
          // log("end game case", msg.data)
          uno.endGame(msg.data);
          break;
        case msgtype.DROP_INFORM:
          uno.handleDropPlayer(msg.data);
          break;
        case msgtype.TABLE_CHANGE:
          uno.changeSkin(msg.playing);
          break;
      }
    } catch (error) {
      log(error);
    }
  };
  botSocket.onmessage = async function (event) {
    try {
      const msg = JSON.parse(event.data);
      // uno_bot.id = unoId
      // uno_bot.socket = botSocket
      switch (msg.type) {
        case msgtype.PING_PONG_REPLY:
          if (botTimeout) engine.removeEntity(botTimeout);
          botTimeout = utils.setTimeout(10000, () => {
            ping(botSocket, botAddress);
          });
          engine.addEntity(botTimeout);
          break;
        case msgtype.JOIN_INFORM:
          uno_bot.otherPlayerJoined(msg.data);
          break;
        case msgtype.JOIN_GAME_REPLY:
          uno_bot.joinLobby(msg.data);
          break;
        case msgtype.START_GAME_REPLY:
          uno_bot.handleGameStarted(msg.data);
          break;
        case msgtype.CARD_THROW_REPLY:
          uno_bot.handleCardThrow(msg.data);
          break;
        case msgtype.GET_CARD_REPLY:
          uno_bot.handleGetCard(msg.data);
          break;
        case msgtype.PASS_TURN_REPLY:
          uno_bot.handlePassTurn(msg.data);
          break;
        case msgtype.COLOR_PICK_REPLY:
          uno_bot.handleColorPick(msg.data);
          break;
        case msgtype.END_GAME:
          uno_bot.endGame();
          break;
        case msgtype.DROP_INFORM:
          uno_bot.handleDropPlayer(msg.data);
          break;
      }
    } catch (error) {
      log(error);
    }
  };
  socket.onerror = (res) => {
    log("wss ERR", res);
  };
  botSocket.onerror = (res) => {
    log("wss ERR", res);
  };

  socket.onclose = (res) => {
    log("DISCONNECTED FROM SERVER", socket.readyState);
  };
  botSocket.onclose = (res) => {
    log("DISCONNECTED FROM SERVER", botSocket.readyState);
  };
  return socket;
}
