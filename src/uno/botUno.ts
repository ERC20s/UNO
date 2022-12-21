import msgtype from './msgtype'
import cards from './cards'
import * as utils from '@dcl/ecs-scene-utils'

class OtherPlayer {
  id: string
  cardCnt: number = 0
  constructor (id: string, cnt: number = 0) {
    this.id = id
    this.cardCnt = cnt
  }
}
class SingleCard {
  
  id: number

  onHand: boolean = false

  constructor(id: number) {
    this.id = id
  }
  setOnHand() {
    this.onHand = true
  }

}
interface GameState {
  turnId: string,
  hand: number[],
  onPlay: boolean,
  otherPlayers: string[],
  otherPlayersHand: number[],
  thrownCards: number[],
  isAction: boolean,
  turnColor: string,
  skipped: boolean
}

interface EndGameProps {
  winner: string
}
let timeout: Entity
const botTimeout = 3000
export class UNO_BOT {
  
  botAddress: string = ''
  id: number
  socket: WebSocket

  isPlaying: boolean
  playerCards: number[] = []
  players: OtherPlayer[] = []
  turnId: string = ""
  selectedCardId: number = -1
  turnColor: string = ""
  unoPlayerIndex: number = -1
  

  uiPlayerCards: SingleCard[] = []
  uiThrownCards: SingleCard[] = []

  otherPlayerCards: number = 0 
  
  //Position info of other player cards
  sPosX: number = 0
  dX: number = 0

  //previous player is skipped
  skipped: boolean = false
  //auto throwable
  thrown: boolean = false
  colorPickable: boolean;
  constructor(id: number, socket: WebSocket) {
    this.id = id
    this.socket = socket
    this.isPlaying = false
    this.colorPickable = false
  }

  

  joinLobby(data: GameState) {
    let info = data
    if(data.onPlay == false) {
      this.isPlaying = false
      data.otherPlayers.forEach(element => {
        this.otherPlayerJoined(element)
      })
      // this.renderView()
    }
  }
  throwable(cardId: number): boolean {
    const selected = cards.CARD_VALUE[cardId].split('-')
    const thrown = cards.CARD_VALUE[this.uiThrownCards[this.uiThrownCards.length - 1].id].split('-')
    if(!this.skipped) {
      if(thrown[1] === "D"){
        if(selected[1] === "D") return true
      }
      if(thrown[0] === "A" && thrown[1] === "4") {
        if(selected[0] === "A" && selected[1] === "4") return true
      }
    }
    if( (selected[0] === thrown[0] || selected[1] === thrown[1]) && thrown[0] !== 'A' )
      return true
    if(selected[0] === 'A') return true
    if(this.turnColor !== "" && this.turnColor === selected[0]) return true
    return false
  }

  pickColor (color: string) {
    this.colorPickable = false
    const lastCard = cards.CARD_VALUE[this.uiThrownCards[this.uiThrownCards.length - 1].id]
    const msg = {
      type: msgtype.COLOR_PICK,
      data: {
        draw: lastCard === cards.CARD_VALUE[4] ? true : false,
        color,
        userId: this.botAddress,
      },
      unoId: this.id
    }
    this.socket.send(JSON.stringify(msg))
  }
  handleColorPick (gameInfo: GameState) {
    this.turnId = gameInfo.turnId
    this.turnColor = gameInfo.turnColor
    this.updateGameInfo(gameInfo)
    if(this.turnId === this.botAddress) {
      this.thrown = false;
      // clearTimeout(timeout)
      if(timeout) engine.removeEntity(timeout)
      timeout = utils.setTimeout(botTimeout, () => {
        this.autoThrow()
      })
      engine.addEntity(timeout)
    }   
  }
  autoPickColor() {
    if(this.colorPickable === false) return
    const colors = ["Y", "R", "G", "B"];
    const rIndex = Math.floor(Math.random() * 4);
    this.pickColor(colors[rIndex])
  }
  autoThrow() {
    log('checking auto throw of uno bot', 0)
    if(this.turnId !== this.botAddress) return
    log('checking auto throw of uno bot', 1)
    if(this.thrown) return
    log('checking auto throw of uno bot', 2)
    for(let i = 0; i < this.playerCards.length; i ++) {
      // const autoSelectedCardId = this.playerCards[i]
      const autoSelectedCardUI = this.uiPlayerCards[i]
      if(this.throwable(autoSelectedCardUI.id)) {
        this.uiPlayerCards.splice(i, 1)
        this.playerCards.splice(i, 1)
        this.thrown = true
        autoSelectedCardUI.onHand = false
        this.turnColor = ""
        const msg = {
          type: msgtype.CARD_THROW,
          data: {
            cardId: autoSelectedCardUI.id,
            userId: this.botAddress
          },
          unoId: this.id
        }
        this.socket.send(JSON.stringify(msg))
        return
      }
    }
    log('checking auto throw of uno bot', 3)
    this.getCard()
    log('checking auto throw of uno bot', 4)
  }
  getCard() {
    if(this.turnId !== this.botAddress) return
    const msg = {
      type: msgtype.GET_CARD,
      data: this.botAddress,
      unoId: this.id
    }
    this.socket.send(JSON.stringify(msg))
  }

  otherPlayerJoined (id: string) {
    // log("other player joined", id)
    this.players.push(new OtherPlayer(id))
  }

  startGame () {
    const msg = {
      type: msgtype.START_GAME,
      data: this.botAddress,
      unoId: this.id
    }
    this.socket.send(JSON.stringify(msg))
  }
  handleGameStarted (gameInfo: GameState) {
    this.isPlaying = true
    this.updateGameInfo(gameInfo)
    if(this.turnId === this.botAddress) {
      this.thrown = false
      // clearTimeout(timeout)
      if(timeout) engine.removeEntity(timeout)
      timeout = utils.setTimeout(botTimeout, () => {
        this.autoThrow()
      })
      engine.addEntity(timeout)
    }
    
  }
  handlePassTurn (gameInfo: GameState) {
    this.turnId = gameInfo.turnId
    if(this.turnId === this.botAddress) {
      this.thrown = false
      // clearTimeout(timeout)
      if(timeout) engine.removeEntity(timeout)
      timeout = utils.setTimeout(botTimeout, () => {
        this.autoThrow()
      });
      engine.addEntity(timeout)
    }
  }
  endGame () {
    // clearTimeout(timeout)
    if(timeout) engine.removeEntity(timeout)
    this.isPlaying = false
    this.uiPlayerCards = []
    this.uiThrownCards = []
    this.playerCards = []
    this.thrown = true;
    const msg = {
      type: msgtype.LEAVE_GAME,
      data: this.botAddress,
      unoId: this.id
    }
    this.socket.send(JSON.stringify(msg))
  }
  handleCardThrow (gameInfo: GameState) {
    this.updateGameInfo(gameInfo)
    if(this.turnId === this.botAddress)
    {
      if(gameInfo.isAction === true) this.thrown = true
      else {
        if(timeout) engine.removeEntity(timeout)
        this.thrown = false
        timeout = utils.setTimeout(botTimeout, () => {
          this.autoThrow()
        })
        engine.addEntity(timeout)
      }
    }
  }

  handleGetCard (gameInfo: GameState) {
    this.updateGameInfo(gameInfo)
    if(this.botAddress !== gameInfo.turnId) return
    const lastId = this.playerCards[this.playerCards.length - 1]
    if(!this.throwable(lastId)){
      const msg = {
        type: msgtype.PASS_TURN,
        data: this.botAddress,
        unoId: this.id
      }
      this.socket.send(JSON.stringify(msg))
      return
    }
    this.thrown = false
    // clearTimeout(timeout)
    if(timeout) engine.removeEntity(timeout)
    timeout = utils.setTimeout(botTimeout, () => {
      this.autoThrow()
    })
    engine.addEntity(timeout)
    
  }
  handleDropPlayer (gameInfo: GameState) {
    if(!gameInfo.onPlay) {
      this.players = []
      this.isPlaying = false
      gameInfo.otherPlayers.forEach(element => {
        this.otherPlayerJoined(element)
      })
      return
    }
    this.updateGameInfo(gameInfo)
  }
  updateGameInfo (gameInfo: GameState) {
    this.skipped = gameInfo.skipped
    gameInfo.hand.forEach((cardId, index) => {
      if(this.playerCards.indexOf(cardId) === -1){
        this.playerCards.push(cardId)
        let card: SingleCard = new SingleCard( cardId )
        this.uiPlayerCards.push(card)
      }
    })
    let dropUserIndex = -1
    if(gameInfo.otherPlayers.length < this.players.length) {
      let i = 0
      for(i = 0; i < gameInfo.otherPlayers.length; i ++){
        if(this.players[i].id !== gameInfo.otherPlayers[i]) {
          dropUserIndex = i
          i = gameInfo.otherPlayers.length
        }
      }
      if(i === gameInfo.otherPlayers.length && dropUserIndex === -1)
        dropUserIndex = i
    }
    this.players = []
    this.turnId = gameInfo.turnId
    this.unoPlayerIndex = -1
    gameInfo.otherPlayers.forEach((element, id) => {
      this.players.push(new OtherPlayer(element, gameInfo.otherPlayersHand[id]))
      if(gameInfo.otherPlayersHand[id] === 1) this.unoPlayerIndex = id
    });
    gameInfo.thrownCards.map((cardId: number, index: number) => {
      const exist = this.uiThrownCards.filter( element => element.id === cardId).length > 0;
      if(!exist) {
        let card: SingleCard = new SingleCard( cardId)
        this.uiThrownCards.push(card)
      }
      // return card;
    })
    if(this.botAddress === gameInfo.turnId && gameInfo.isAction) {
      this.colorPickable = true
      // this.thrown = true
      // clearTimeout(timeout)
      if(timeout) engine.removeEntity(timeout)
      timeout = utils.setTimeout(botTimeout, () => {
        this.autoPickColor()
      })
      engine.addEntity(timeout)
    }
  }
}