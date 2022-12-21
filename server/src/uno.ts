import Player, { UserData } from './player'
import { wss, CustomWs } from '.'
import msgtype from './msgtype'
import cards from './cards'

interface CardThrowProps {
  userId: string
  cardId: number
}
interface ColorPickProps {
  draw: boolean
  color: string
  userId: string
}

export default class UNO {
  id: number
  players: Player[] = []
  playerIds: string[] = []
  observerIds: string[] = []
  observers: Player[] = []
  
  deck: number[] = []
  trash: number[] = []

  onPlay: boolean = false
  turn: number = 0
  turnId: string = ""
  thrownCards: number[] = []
  direction: number = 1
  isAction: boolean = false
  turnColor: string = ""
  winner: string = ""
  drawCardCnt: number = 0
  skipped: boolean = false
  
  constructor (id: number) {
    this.id = id
    for (let i = 0; i < 108; i++) {
      this.deck.push(i)
    }
    // this.shuffleDeck();
  }

  shuffleDeck() {
    var m = this.deck.length, t, i
    while (m) {
      i = Math.floor(Math.random() * m--)
      t = this.deck[m]
      this.deck[m] = this.deck[i]
      this.deck[i] = t
    }
  }
  playerDrop(playerId: string) {
    const userIndex = this.playerIds.indexOf(playerId)
    if(this.winner === playerId) this.winner = ""
    if(userIndex === -1) {
      const observerIndex = this.observerIds.indexOf(playerId)
      if(observerIndex > -1) this.observerIds.splice(observerIndex, 1)
    }
    if (userIndex > -1) {
      if(this.turnId === playerId)
        this.turnId = this.playerIds[(userIndex + 1) % this.playerIds.length];
      this.playerIds.splice(userIndex, 1);
      this.players.splice(userIndex, 1);
    }
    if(this.players.length === 1 && this.onPlay) {
      this.endGame(this.playerIds[0])
    }
    wss.clients.forEach(client => {
      const cWs = client as CustomWs
      this.playerIds.forEach(id => {
        if (cWs.userId === id) {
          let msg = {
            type: msgtype.DROP_INFORM,
            data: this.getGameInfo(id),
            unoId: this.id
          }
          cWs.send(JSON.stringify(msg))
        }
      })
      this.observerIds.forEach(id => {
        if(cWs.userId === id) {
          let msg = {
            type: msgtype.DROP_INFORM,
            data: this.getAllGameInfo(),
            unoId: this.id
          }
          cWs.send(JSON.stringify(msg))
        }
      })
    })
  }
  observerJoin(userData: UserData) {
    const playerId = userData.userId
    this.observerIds.push(playerId)
    const observer = new Player(playerId, userData)
    this.observers.push(observer)
  }
  playerJoin(userData: UserData) {
    const playerId = userData.userId
    wss.clients.forEach(client => {
      const cWs = client as CustomWs
      this.playerIds.forEach(id => {
        if(cWs.userId === id){
          console.log("JOIN-INFORM")
          let msg = {
            type: msgtype.JOIN_INFORM,
            data: userData,
            unoId: this.id
          }
          cWs.send(JSON.stringify(msg))
        }
      })
    })
    let i = this.playerIds.indexOf(playerId)
    if (i != -1) {
      return
    }
    this.playerIds.push(playerId)
    let player = new Player(playerId, userData)
    this.players.push(player)
  }
  
  // playerLeave(playerId: string) {
  //   let i = this.players.indexOf(playerId);
  //   this.players.splice(i, 1);
  // }

  startGame() {
    if(this.onPlay) return console.log("already started!!!")
    console.log("started game")
    this.shuffleDeck()
    this.onPlay = true
    for(let i = 0 ; i < 7; i ++) {
      this.players.forEach(element => {
        let cardId: number|undefined = this.deck.pop()
        if( cardId != undefined)
          element.drawCard(cardId)
      })
    }
    this.turnId = this.winner ? this.winner : this.playerIds[0]
    let initialCard: number = 0
    while(initialCard < 32) {
      initialCard = this.deck.pop() || 0
    }
    this.thrownCards.push(initialCard)
    wss.clients.forEach(client => {
      const cWs = client as CustomWs
      this.playerIds.forEach(id => {
        if (cWs.userId == id) {
          let msg = {
            type: msgtype.START_GAME_REPLY,
            data: this.getGameInfo(id),
            unoId: this.id
          }
          cWs.send(JSON.stringify(msg))
        }
      })
      
      const msg = {
        type: msgtype.TABLE_CHANGE,
        playing: true,
        unoId: this.id
      }
      cWs.send(JSON.stringify(msg))
    })
  }
  endGame( userId: string ) {
    this.thrownCards = []
    this.isAction = false
    this.players = [...this.players, ...this.observers];
    this.playerIds = [ ...this.playerIds, ...this.observerIds];
    this.observers = []
    this.observerIds = []
    for(let i = 0; i < this.players.length; i ++)
    {
      this.players[i].hand = []
    }
    this.onPlay = false
    let newDeck = []
    for (let i = 0; i < 108; i++) {
      newDeck.push(i)
    }
    this.deck = newDeck
    let info = {
      winner: userId
    }
    this.winner = userId
    wss.clients.forEach(client => {
      const cWs = client as CustomWs
      this.playerIds.forEach(id => {
        if (cWs.userId == id) {
          console.log("ws users", id)
          let msg = {
            type: msgtype.END_GAME,
            data: info,
            unoId: this.id
          }
          cWs.send(JSON.stringify(msg))
        }
      })
      this.observerIds.forEach(id => {
        if(cWs.userId === id) {
          let msg = {
            type: msgtype.END_GAME,
            data: info,
            unoId: this.id
          }
          cWs.send(JSON.stringify(msg))
        }
      })
      const msg = {
        type: msgtype.TABLE_CHANGE,
        playing: false,
        unoId: this.id
      }
      cWs.send(JSON.stringify(msg))
    })
  }
  cardThrow( data: CardThrowProps ) {
    const { userId, cardId } = data;
    const cardValue = cards.CARD_VALUE[cardId].split('-')
    const userIndex = this.playerIds.indexOf(userId)
    if(userIndex < 0) return console.error("there isn't UserId", userId, cardId)
    this.players[userIndex].throwCard(cardId)
    this.thrownCards.push(cardId)
    this.turnColor = ""
    let skipNextUser = false
    if(cardValue[0] === "A" && cardValue[1] === "4") {
      const nextPlayerHand = this.players[(userIndex + 1 * this.direction + this.players.length) % this.players.length].hand
      let isExist = false
      for(let i = 0; i < nextPlayerHand.length; i ++){
        const card = cards.CARD_VALUE[nextPlayerHand[i]]
        if(card === "A-4") isExist = true
      }
      this.drawCardCnt += 4;
      if(!isExist) {
        skipNextUser = true;
      }
    }
    if(cardValue[1] === "D") {
      const nextPlayerHand = this.players[(userIndex + 1 * this.direction + this.players.length) % this.players.length].hand
      let isExist = false
      for(let i = 0; i < nextPlayerHand.length; i ++){
        const card = cards.CARD_VALUE[nextPlayerHand[i]].split('-')
        if(card[1] === "D") isExist = true
      }
      this.drawCardCnt += 2;
      if(!isExist) {
        skipNextUser = true;
      }
    }
    if(cardValue[1] === "R") this.direction *= -1                                                 // Reverse direction
    
    if(cardValue[1] === "S" || skipNextUser)                                              // Skip next user
      this.turnId = this.playerIds[(userIndex + 2 * this.direction + this.players.length) % this.players.length]
    else this.turnId = this.playerIds[(userIndex + 1 * this.direction + this.players.length) % this.players.length] // Next turn
    
    this.isAction = false
    if(cardValue[1] === "W" || cardValue[0] === "A" && cardValue[1] === "4" && skipNextUser) {            // Action Card
      this.turnId = this.playerIds[userIndex]
      this.isAction = true
    }

    let nextPlayer = (userIndex + this.direction) % this.players.length
    if(nextPlayer < 0) nextPlayer += this.players.length
    if(skipNextUser) {                                            // Draw Card
      this.skipped = true
      for(let i = 0 ; i < this.drawCardCnt; i ++) {
        let cardId: number|undefined = this.deck.pop()
        if( cardId != undefined)
          this.players[nextPlayer].drawCard(cardId)
      }
      this.drawCardCnt = 0
    }
    else {
      this.skipped = false
    }
    // if(cardValue[1] === "D") {
    //   for(let i = 0 ; i < 2; i ++) {
    //     let cardId: number|undefined = this.deck.pop()
    //     if( cardId != undefined)
    //       this.players[nextPlayer].drawCard(cardId)
    //   }
    // }
    if(this.players[userIndex].hand.length === 0)
      return this.endGame(this.playerIds[userIndex])
    wss.clients.forEach(client => {
      const cWs = client as CustomWs
      this.playerIds.forEach(id => {
        if(cWs.userId == id) {
          let msg = {
            type: msgtype.CARD_THROW_REPLY,
            data: this.getGameInfo(id),
            unoId: this.id
          }
          cWs.send(JSON.stringify(msg))
        }
      })
      this.observerIds.forEach(id => {
        if(cWs.userId === id) {
          let msg = {
            type: msgtype.CARD_THROW_REPLY,
            data: this.getAllGameInfo(),
            unoId: this.id
          }
          cWs.send(JSON.stringify(msg))
        }
      })
    })

    
  }
  handleColorPick ( data: ColorPickProps) {
    const { draw, color, userId } = data;
    const userIndex = this.playerIds.indexOf(userId)
    if(draw) this.turnId = this.playerIds[(userIndex + 2 * this.direction + this.players.length) % this.players.length]
    else this.turnId = this.playerIds[(userIndex + 1 * this.direction + this.players.length) % this.players.length]
    this.turnColor = color
    this.isAction = false
    wss.clients.forEach(client => {
      const cWs = client as CustomWs
      this.playerIds.forEach(id => {
        if(cWs.userId === id) {
          let msg = {
            type: msgtype.COLOR_PICK_REPLY,
            data: this.getGameInfo(id),
            unoId: this.id
          }
          cWs.send(JSON.stringify(msg))
        }
      })
      this.observerIds.forEach(id => {
        if(cWs.userId === id) {
          let msg = {
            type: msgtype.COLOR_PICK_REPLY,
            data: this.getAllGameInfo(),
            unoId: this.id
          }
          cWs.send(JSON.stringify(msg))
        }
      })      
    })
  }
  getCard(userId: string) {
    let i = this.playerIds.indexOf(userId)
    let cardId: number|undefined = this.deck.pop()
    if( cardId != undefined && i !== -1)
      this.players[i].drawCard(cardId)
    wss.clients.forEach(client => {
      const cWs = client as CustomWs
      this.playerIds.forEach(id => {
        if(cWs.userId == id) {
          let msg = {
            type: msgtype.GET_CARD_REPLY,
            data: this.getGameInfo(id),
            unoId: this.id
          }
          cWs.send(JSON.stringify(msg))
        }
      })
      this.observerIds.forEach(id => {
        if(cWs.userId === id) {
          let msg = {
            type: msgtype.GET_CARD_REPLY,
            data: this.getAllGameInfo(),
            unoId: this.id
          }
          cWs.send(JSON.stringify(msg))
        }
      }) 
    })
  }
  getPlayerCards(userId: string) {
    let i = this.playerIds.indexOf(userId)
    return this.players[i].hand
  }
  passTurn(userId: string) {
    const userIndex = this.playerIds.indexOf(userId)
    this.turnId = this.playerIds[(userIndex + 1 * this.direction + this.players.length) % this.players.length]
    wss.clients.forEach(client => {
      const cWs = client as CustomWs
      this.playerIds.forEach(id => {
        if(cWs.userId === id) {
          let msg = {
            type: msgtype.PASS_TURN_REPLY,
            data: this.getGameInfo(id),
            unoId: this.id
          }
          cWs.send(JSON.stringify(msg))
        }
      })
      this.observerIds.forEach(id => {
        if(cWs.userId === id) {
          let msg = {
            type: msgtype.PASS_TURN_REPLY,
            data: this.getAllGameInfo(),
            unoId: this.id
          }
          cWs.send(JSON.stringify(msg))
        }
      }) 
    })
  }
  getGameInfo(activeUser: string) {
    let i = this.playerIds.indexOf(activeUser)
    // if(i = -1) {
    //   return {}
    // }
    let otherPlayers: string[] = []
    let cardCount: number[] = []
    let otherUsersData: UserData[] = []
    this.players.forEach(element => {
      if(element.id != activeUser) {
        otherPlayers.push(element.id)
        cardCount.push(element.hand.length)
        otherUsersData.push(element.userData)
      }
    })
    let info = {
      activeUser: this.players[0].id,
      onPlay: this.onPlay,
      hand: i == -1 ? [] : this.players[i].hand,
      otherPlayers: otherPlayers,
      otherPlayersHand: cardCount,
      turnId: this.turnId,
      deck: this.deck,
      lastCard: this.thrownCards[this.thrownCards.length - 1],
      thrownCards: this.thrownCards,
      isAction: this.isAction,
      turnColor: this.turnColor,
      skipped: this.skipped,
      otherUsersData: otherUsersData
    }
    return info
  }
  getAllGameInfo() {
    let otherPlayers: string[] = []
    let cardCount: number[] = []
    let otherUsersData: UserData[] = []
    this.players.forEach(element => {
      otherPlayers.push(element.id)
      cardCount.push(element.hand.length)
      otherUsersData.push(element.userData)
    })
    let info = {
      activeUser: this.players[0].id,
      onPlay: this.onPlay,
      hand: [],
      otherPlayers: otherPlayers,
      otherPlayersHand: cardCount,
      turnId: this.turnId,
      deck: this.deck,
      lastCard: this.thrownCards[this.thrownCards.length - 1],
      thrownCards: this.thrownCards,
      isAction: this.turnColor,
      turnColor: this.turnColor,
      skipped: this.skipped,
      otherUsersData: otherUsersData
    }
    return info
  }

}
