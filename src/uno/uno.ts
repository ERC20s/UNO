import msgtype from './msgtype'
import constants from '../constants'
import SingleCardUI from './singleCardUI'
import cards from './cards'
import { getUserData, UserData } from '@decentraland/Identity'
import * as utils from '@dcl/ecs-scene-utils'
import { UNO_BOT } from './botUno'

let userData: UserData | null

const closeTexture = new Texture('images/close_button.png')
const logoTexture = new Texture('images/UNO_logo.png')
const startTexture = new Texture('images/start_button.png')
const slotTexture = new Texture('images/card_slot.png')
const cardBackTexture = new Texture('images/card_back.png')
const getCardTexture = new Texture('images/flip.png')
const yellowCard = new Texture('images/yellow_card.png')
const blueCard = new Texture('images/blue_card.png')
const greenCard = new Texture('images/green_card.png')
const redCard = new Texture('images/red_card.png')
const unoTexture = new Texture('images/UNO_logo.png')
const addBotTexture = new Texture('images/add_bot.png')
const removeBotTexture = new Texture('images/remove_bot.png')

class OtherPlayer {
  id: string
  cardCnt: number = 0
  userData: UserData
  constructor(userData: UserData, cnt: number = 0) {
    this.id = userData.userId
    this.cardCnt = cnt
    this.userData = userData
  }
}

interface GameState {
  activeUser: string,
  turnId: string,
  hand: number[],
  onPlay: boolean,
  otherPlayers: string[],
  otherPlayersHand: number[],
  thrownCards: number[],
  isAction: boolean,
  turnColor: string,
  skipped: boolean,
  otherUsersData: UserData[]
}

interface EndGameProps {
  winner: string
}
let timeout: Entity
let interval: utils.Interval
const humanTimeout = 10000
export class UNO extends Entity {

  id: number
  socket: WebSocket
  uno_bot: UNO_BOT

  isPlaying: boolean
  playerCards: number[] = []
  players: OtherPlayer[] = []
  turnId: string = ""
  selectedCardId: number = -1
  turnColor: string = ""
  unoPlayerIndex: number = -1

  table = new Entity()

  canvasPrimary: UIContainerRect
  canvasBeforePlay: UIContainerRect
  canvasGamePlay: UIContainerRect
  canvasDialog: UIContainerRect

  colorDialog: UIContainerRect

  uiCanvasCards: UIContainerRect
  playerListUI: UIContainerStack

  uiElements: UIShape[] = []
  uiPlayerCards: SingleCardUI[] = []
  uiThrownCards: SingleCardUI[] = []
  uiOtherPlayerCards: UIImage[] = []

  otherPlayerCards: number = 0


  // buttonUI
  btnStart: UIImage
  btnAddBot: UIImage
  btnClose: UIImage
  btnGetCard: UIImage

  btnYellow: UIImage
  btnBlue: UIImage
  btnGreen: UIImage
  btnRed: UIImage

  // imageUI
  imgLogo: UIImage
  imgCardSlot: UIImage

  uiColorCard: UIImage
  uiUnoCard: UIImage

  // textUI
  txtBeforeScreenState: UIText
  txtColorPick: UIText
  txtScore: UIText

  txtCounter: UIText

  txtOtherplayerCardCnt: UIText[] = []

  //Position info of other player cards
  sPosX: number = 0
  dX: number = 0

  //previous player is skipped
  skipped: boolean = false
  //auto throwable
  thrown: boolean = false
  //timer
  counter: number = 10
  //play with bot
  bot: boolean = false
  //creating user
  hostUser: string = ""
  isObserver: boolean = false
  constructor(id: number, transform: Transform, socket: WebSocket, canvas: UICanvas, uno_bot: UNO_BOT) {
    super()
    this.id = id
    this.uno_bot = uno_bot
    this.socket = socket
    this.isPlaying = false
    this.canvasPrimary = new UIContainerRect(canvas)
    this.canvasBeforePlay = new UIContainerRect(canvas)
    this.canvasGamePlay = new UIContainerRect(canvas)

    this.uiColorCard = new UIImage(this.canvasGamePlay, yellowCard)
    this.uiUnoCard = new UIImage(this.canvasGamePlay, unoTexture)

    this.uiCanvasCards = new UIContainerRect(canvas)
    this.uiCanvasCards.width = "100%"
    this.uiCanvasCards.height = "100%"

    this.canvasDialog = new UIContainerRect(canvas)
    this.colorDialog = new UIContainerRect(this.canvasDialog)
    this.colorDialog.width = "60%"
    this.colorDialog.height = "80%"

    this.playerListUI = new UIContainerStack(this.canvasBeforePlay)

    this.btnClose = new UIImage(this.canvasPrimary, closeTexture)
    this.btnStart = new UIImage(this.canvasBeforePlay, startTexture)
    this.btnAddBot = new UIImage(this.canvasBeforePlay, addBotTexture)

    this.imgLogo = new UIImage(this.canvasPrimary, logoTexture)
    this.imgCardSlot = new UIImage(this.canvasGamePlay, slotTexture)
    this.btnGetCard = new UIImage(this.canvasGamePlay, getCardTexture)

    this.btnYellow = new UIImage(this.colorDialog, yellowCard)
    this.btnGreen = new UIImage(this.colorDialog, greenCard)
    this.btnBlue = new UIImage(this.colorDialog, blueCard)
    this.btnRed = new UIImage(this.colorDialog, redCard)
    this.txtColorPick = new UIText(this.colorDialog)

    this.txtScore = new UIText(this.canvasBeforePlay)
    this.txtCounter = new UIText(this.canvasGamePlay)

    this.txtBeforeScreenState = new UIText(this.canvasBeforePlay)

    engine.addEntity(this)
    this.addComponent(transform)
    this.initCanvas()
    this.initTable()
    this.initControlUI()
    const getUserDataPromise = async () => {
      userData = await getUserData()
    }
    getUserDataPromise()
  }

  initCanvas() {
    this.canvasPrimary.width = '100%'
    this.canvasPrimary.height = '100%'
    this.canvasPrimary.color = Color4.Black()
    this.canvasPrimary.opacity = 0.9
    this.canvasPrimary.visible = false

    this.canvasBeforePlay.width = '100%'
    this.canvasBeforePlay.height = '100%'
    this.canvasBeforePlay.visible = false


    this.canvasGamePlay.width = '100%'
    this.canvasGamePlay.height = '100%'
    this.canvasGamePlay.visible = false

    this.canvasDialog.width = '100%'
    this.canvasDialog.height = '100%'
    this.canvasDialog.visible = true
    this.initPrimaryCanvas()
    this.initBeforePlayCanvas()
    this.initGamePlayCanvas()
  }

  initPrimaryCanvas() {
    this.imgLogo.isPointerBlocker = false
    this.imgLogo.opacity = 0.8
    this.imgLogo.vAlign = "center"
    this.imgLogo.hAlign = "center"
    this.imgLogo.width = "150px"
    this.imgLogo.height = "105px"
    this.imgLogo.sourceWidth = 220
    this.imgLogo.sourceHeight = 154
    this.imgLogo.positionX = 0
    this.imgLogo.positionY = 0

    this.btnClose.isPointerBlocker = true
    this.btnClose.vAlign = "top"
    this.btnClose.hAlign = "right"
    this.btnClose.height = "50px"
    this.btnClose.width = "50px"
    this.btnClose.sourceHeight = 200
    this.btnClose.sourceWidth = 200
    this.btnClose.positionX = -10
    this.btnClose.positionY = -10
    this.btnClose.onClick = new OnClick(() => {
      // if(this.isPlaying) returns
      const msg = {
        type: msgtype.LEAVE_GAME,
        data: userData?.userId,
        unoId: this.id
      }
      if (timeout) engine.removeEntity(timeout)
      if (interval) this.removeComponent(interval)
      this.socket.send(JSON.stringify(msg))
      this.isPlaying = false
      this.setUiVisibility(false)
      this.uiPlayerCards = []
      this.uiOtherPlayerCards = []
      this.uiThrownCards = []
      this.uiElements = []
      this.playerCards = []
      this.players = []
      this.txtOtherplayerCardCnt = []
      this.colorDialog.visible = false
      this.selectedCardId = -1
      this.btnGetCard.visible = false
      this.canvasGamePlay.visible = false
      this.canvasPrimary.visible = false
      this.canvasBeforePlay.visible = false
      this.txtScore.visible = false
      this.bot = false
      // this.btnAddBot.source = addBotTexture
      this.uno_bot.endGame()
    })

  }

  initBeforePlayCanvas() {
    this.playerListUI.vAlign = "top"
    this.playerListUI.hAlign = "left"
    this.playerListUI.stackOrientation = UIStackOrientation.VERTICAL
    this.playerListUI.positionX = 10
    this.playerListUI.positionY = 100
    this.playerListUI.width = '40%'

    this.txtBeforeScreenState.value = "Waiting for opponent..."
    this.txtBeforeScreenState.vAlign = "top"
    this.txtBeforeScreenState.hAlign = "center"
    this.txtBeforeScreenState.positionX = 0
    this.txtBeforeScreenState.positionY = -50
    this.txtBeforeScreenState.visible = true

    this.btnStart.isPointerBlocker = true
    this.btnStart.vAlign = "bottom"
    this.btnStart.hAlign = "center"
    this.btnStart.height = "100px"
    this.btnStart.width = "100px"
    this.btnStart.sourceHeight = 512
    this.btnStart.sourceWidth = 512
    this.btnStart.positionX = -60
    this.btnStart.positionY = 10
    this.btnStart.onClick = new OnClick(() => {
      this.startGame()
    })
    this.btnStart.visible = false
    this.btnAddBot.isPointerBlocker = true
    this.btnAddBot.vAlign = "bottom"
    this.btnAddBot.hAlign = "center"
    this.btnAddBot.height = "100px"
    this.btnAddBot.width = "100px"
    this.btnAddBot.sourceHeight = 512
    this.btnAddBot.sourceWidth = 512
    this.btnAddBot.positionX = 60
    this.btnAddBot.positionY = 10
    this.btnAddBot.onClick = new OnClick(async () => {
      if (this.bot) {
        this.bot = false
        this.uno_bot.endGame()
      }
      else {
        this.bot = true
        // addBot(this.socket, this.id)
        const userData = await getUserData()
        const msg = {
          type: msgtype.JOIN_GAME,
          data: {
            ...userData,
            userId: this.uno_bot.botAddress
          },
          unoId: this.id
        }
        this.socket.send(JSON.stringify(msg))
      }
      this.renderView()
    })

  }
  initGamePlayCanvas() {
    this.imgCardSlot.isPointerBlocker = false
    this.imgCardSlot.opacity = 0.8
    this.imgCardSlot.vAlign = "bottom"
    this.imgCardSlot.hAlign = "center"
    this.imgCardSlot.width = "80px"
    this.imgCardSlot.height = "120px"
    this.imgCardSlot.sourceWidth = 160
    this.imgCardSlot.sourceHeight = 240
    this.imgCardSlot.positionX = 10
    this.imgCardSlot.positionY = 10

    this.btnGetCard.isPointerBlocker = true
    this.btnGetCard.vAlign = "bottom"
    this.btnGetCard.hAlign = "center"
    this.btnGetCard.height = 24
    this.btnGetCard.width = 54
    this.btnGetCard.sourceHeight = 95
    this.btnGetCard.sourceWidth = 190
    this.btnGetCard.positionX = -100
    this.btnGetCard.onClick = new OnClick(() => {
      this.getCard()
    })

    // Show color after action card
    this.uiColorCard.width = "86px"
    this.uiColorCard.height = "130px"
    this.uiColorCard.sourceHeight = 257
    this.uiColorCard.sourceWidth = 173
    this.uiColorCard.vAlign = "center"
    this.uiColorCard.hAlign = "right"
    this.uiColorCard.positionX = -30
    this.uiColorCard.positionY = 0
    this.uiColorCard.visible = false

    // Uno Image
    this.uiUnoCard.isPointerBlocker = true
    this.uiUnoCard.opacity = 1
    this.uiUnoCard.vAlign = "top"
    this.uiUnoCard.hAlign = "center"
    this.uiUnoCard.width = "30px"
    this.uiUnoCard.height = "18px"
    this.uiUnoCard.sourceWidth = 220
    this.uiUnoCard.sourceHeight = 154
    this.uiUnoCard.visible = false
    // Color Pick Dialog
    this.colorDialog.color = Color4.White()
    this.colorDialog.visible = false

    this.txtColorPick.value = "Choose a color"
    this.txtColorPick.color = Color4.Gray()
    this.txtColorPick.fontSize = 28
    this.txtColorPick.hTextAlign = "center"
    this.txtColorPick.vAlign = "top"
    this.txtColorPick.hAlign = "center"
    this.txtColorPick.positionX = 0
    this.txtColorPick.positionY = -100
    this.txtColorPick.visible = true

    this.txtCounter.value = this.counter.toString()
    this.txtCounter.color = Color4.White()
    this.txtCounter.fontSize = 28
    this.txtCounter.hTextAlign = "center"
    this.txtCounter.vAlign = "bottom"
    this.txtCounter.hAlign = "left"
    this.txtCounter.positionX = 0
    this.txtCounter.positionY = 10
    this.txtCounter.visible = false

    this.btnYellow.vAlign = "bottom"
    this.btnYellow.hAlign = "center"
    this.btnYellow.height = "130px"
    this.btnYellow.width = "86px"
    this.btnYellow.sourceHeight = 257
    this.btnYellow.sourceWidth = 173
    this.btnYellow.positionX = "10%"
    this.btnYellow.positionY = 50
    this.btnYellow.onClick = new OnClick(() => {
      this.pickColor('Y')
    })
    this.btnYellow.visible = true

    this.btnBlue.vAlign = "bottom"
    this.btnBlue.hAlign = "center"
    this.btnBlue.height = "130px"
    this.btnBlue.width = "86px"
    this.btnBlue.sourceHeight = 257
    this.btnBlue.sourceWidth = 173
    this.btnBlue.positionX = "30%"
    this.btnBlue.positionY = 50
    this.btnBlue.onClick = new OnClick(() => {
      this.pickColor('B')
    })
    this.btnBlue.visible = true

    this.btnGreen.vAlign = "bottom"
    this.btnGreen.hAlign = "center"
    this.btnGreen.height = "130px"
    this.btnGreen.width = "86px"
    this.btnGreen.sourceHeight = 257
    this.btnGreen.sourceWidth = 173
    this.btnGreen.positionX = "-10%"
    this.btnGreen.positionY = 50
    this.btnGreen.onClick = new OnClick(() => {
      this.pickColor('G')
    })
    this.btnGreen.visible = true

    this.btnRed.vAlign = "bottom"
    this.btnRed.hAlign = "center"
    this.btnRed.height = "130px"
    this.btnRed.width = "86px"
    this.btnRed.sourceHeight = 257
    this.btnRed.sourceWidth = 173
    this.btnRed.positionX = "-30%"
    this.btnRed.positionY = 50
    this.btnRed.onClick = new OnClick(() => {
      this.pickColor('R')
    })
    this.btnRed.visible = true

    // text shown after the game ended
    this.txtScore.visible = false
    this.txtScore.color = Color4.White()
    this.txtScore.fontSize = 36
    this.txtScore.hTextAlign = "center"
    this.txtScore.vAlign = "top"
    this.txtScore.hAlign = "center"
    this.txtScore.positionX = 0
    this.txtScore.positionY = -150
    this.txtScore.visible = true
  }

  initTable() {
    this.table.addComponent(new GLTFShape("models/table.glb"))
    this.table.addComponent(new Transform({ position: new Vector3(8, 0, 8) }))
    this.table.addComponent(
      new OnPointerDown(async () => {
        this.isPlaying = false
        const msg = {
          type: msgtype.JOIN_GAME,
          data: userData,
          unoId: this.id,
        }
        this.socket.send(JSON.stringify(msg))
        this.uno_bot.id = this.id
      }, {
        hoverText: "Click to Join",
        distance: 50,
      })
    )
    this.table.setParent(this)
  }

  initControlUI() {
  }

  joinLobby(data: GameState) {
    this.hostUser = data.activeUser
    if (data.onPlay == false) {
      this.isPlaying = false
      data.otherUsersData.forEach(element => {
        this.otherPlayerJoined(element)
      })
    }
    else {
      this.isObserver = true
      this.isPlaying = true
      this.txtCounter.visible = false
      this.imgCardSlot.visible = false
      this.updateGameInfo(data)
    }
    this.renderView()
  }

  throwCard(id: number) {

  }

  throwable(cardId: number): boolean {
    const selected = cards.CARD_VALUE[cardId].split('-')
    const thrown = cards.CARD_VALUE[this.uiThrownCards[this.uiThrownCards.length - 1].id].split('-')
    if (!this.skipped) {
      if (thrown[1] === "D") {
        if (selected[1] === "D") return true
      }
      if (thrown[0] === "A" && thrown[1] === "4") {
        if (selected[0] === "A" && selected[1] === "4") return true
      }
    }
    if ((selected[0] === thrown[0] || selected[1] === thrown[1]) && thrown[0] !== 'A')
      return true
    if (selected[0] === 'A') return true
    if (this.turnColor !== "" && this.turnColor === selected[0]) return true
    return false
  }

  pickColor(color: string) {
    this.colorDialog.visible = false
    const lastCard = cards.CARD_VALUE[this.uiThrownCards[this.uiThrownCards.length - 1].id]
    const msg = {
      type: msgtype.COLOR_PICK,
      data: {
        draw: lastCard === cards.CARD_VALUE[4] ? true : false,
        color,
        userId: userData?.userId,
      },
      unoId: this.id
    }
    this.socket.send(JSON.stringify(msg))
  }
  handleColorPick(gameInfo: GameState) {
    this.turnId = gameInfo.turnId
    this.turnColor = gameInfo.turnColor
    switch (this.turnColor) {
      case 'R':
        this.uiColorCard.source = redCard
        break
      case 'G':
        this.uiColorCard.source = greenCard
        break
      case 'B':
        this.uiColorCard.source = blueCard
        break
      case 'Y':
        this.uiColorCard.source = yellowCard
        break
    }

    this.uiColorCard.visible = true
    this.updateGameInfo(gameInfo)
    this.renderView()
    this.renderGetCardButton(gameInfo)
    if (this.turnId === userData?.userId) {
      this.thrown = false
      if (timeout) engine.removeEntity(timeout)
      this.counter = 10
      timeout = utils.setTimeout(humanTimeout, () => {
        this.autoThrow()
      })
      engine.addEntity(timeout)
    }
  }
  selectCard(selectedCard: SingleCardUI, id: number) {
    if (this.turnId != userData?.userId) {
      this.selectedCardId = -1
      return
    }
    if (this.selectedCardId == id) {
      if (this.uiThrownCards.length) {
        if (!this.throwable(selectedCard.id)) return
      }
      selectedCard.visible = false
      let throwCardId = -1
      for (let i = 0; i < this.uiPlayerCards.length; i++) {
        if (this.uiPlayerCards[i] == selectedCard) {
          throwCardId = i
        }
      }
      this.playerCards.splice(throwCardId, 1)
      this.uiPlayerCards.splice(throwCardId, 1)
      this.thrown = true
      if (timeout) engine.removeEntity(timeout)
      selectedCard.onHand = false
      this.turnColor = ""
      const msg = {
        type: msgtype.CARD_THROW,
        data: {
          cardId: selectedCard.id,
          userId: userData?.userId
        },
        unoId: this.id
      }
      this.txtCounter.visible = false
      this.socket.send(JSON.stringify(msg))
    } else {
      this.selectedCardId = id
    }

    this.renderView()

  }
  autoPickColor() {
    if (this.colorDialog.visible === false) return
    const colors = ["Y", "R", "G", "B"]
    const rIndex = Math.floor(Math.random() * 4)
    this.pickColor(colors[rIndex])
  }
  autoThrow() {
    if (this.turnId !== userData?.userId) return
    if (this.thrown) return
    for (let i = 0; i < this.playerCards.length; i++) {
      // const autoSelectedCardId = this.playerCards[i]
      const autoSelectedCardUI = this.uiPlayerCards[i]
      if (this.throwable(autoSelectedCardUI.id)) {
        autoSelectedCardUI.visible = false
        this.uiPlayerCards.splice(i, 1)
        this.playerCards.splice(i, 1)
        this.thrown = true
        autoSelectedCardUI.onHand = false
        this.turnColor = ""
        const msg = {
          type: msgtype.CARD_THROW,
          data: {
            cardId: autoSelectedCardUI.id,
            userId: userData?.userId
          },
          unoId: this.id
        }
        this.socket.send(JSON.stringify(msg))
        return
      }
    }
    this.getCard()

  }
  getCard() {
    if (this.turnId !== userData?.userId) return
    const msg = {
      type: msgtype.GET_CARD,
      data: userData.userId,
      unoId: this.id
    }
    this.socket.send(JSON.stringify(msg))
  }
  setUiVisibility(visible: boolean) {
    for (let i = 0; i < this.uiElements.length; i++) {
      this.uiElements[i].visible = visible
    }
  }

  otherPlayerJoined(userData: UserData) {
    this.players.push(new OtherPlayer(userData))
    this.renderView()
  }

  renderView() {
    this.canvasPrimary.visible = true
    this.canvasBeforePlay.visible = false
    this.canvasGamePlay.visible = false
    if (this.isPlaying === false) {
      this.canvasBeforePlay.visible = true
      this.renderInitialView()
    } else {
      this.canvasGamePlay.visible = true
      this.renderGameView()
    }
  }

  renderInitialView() {
    if (this.players.length > 0) {
      this.btnStart.visible = !this.isObserver ? true : false
      this.txtBeforeScreenState.value = "You can start game now"
      if (this.bot) {
        this.btnStart.positionX = this.hostUser === userData?.userId ? -60 : 0
        this.btnAddBot.positionX = 60
        this.btnAddBot.source = removeBotTexture
        this.btnAddBot.visible = this.hostUser === userData?.userId ? true : false
      }
      else {
        this.btnStart.positionX = this.hostUser === userData?.userId ? -60 : 0
        this.btnAddBot.source = addBotTexture
        this.btnAddBot.positionX = 60
        this.btnAddBot.visible = this.hostUser === userData?.userId ? true : false
      }
    } else {
      this.btnStart.visible = false
      if (!this.bot) {
        this.btnAddBot.source = addBotTexture
        this.btnAddBot.visible = this.hostUser === userData?.userId ? true : false
        this.btnAddBot.positionX = 0
      }
      this.txtBeforeScreenState.value = "Waiting for opponent"
    }
  }

  renderGameView() {
    this.imgLogo.opacity = 0.5

    this.uiThrownCards.forEach((card) => {
      card.positionX = 0
      card.positionY = 0
      card.vAlign = "center"
      card.hAlign = "center"
      card.visible = true
    })
    if (this.uiThrownCards.length > 0) {
      this.uiThrownCards[this.uiThrownCards.length - 1].visible = true
    }


    let posX = 10
    this.uiPlayerCards.forEach(card => {
      if (this.turnId == userData?.userId && card.id == this.selectedCardId) {
        card.selected = true
        card.positionY = 20
      } else {
        card.selected = false
        card.positionY = 10
      }
      card.positionX = posX
      posX += 30
    })
    const otherPlayerCnt = this.players.length
    for (let i = 0; i < this.players.length; i++) {
      const posX = 100 / (otherPlayerCnt + 1) * (i + 1) - 50
      this.uiOtherPlayerCards[i].positionX = `${posX}%`
      this.txtOtherplayerCardCnt[i].positionX = `${posX}%`
    }
  }
  // addBot () {

  // }
  startGame() {
    this.txtScore.visible = false
    const msg = {
      type: msgtype.START_GAME,
      data: userData?.userId,
      unoId: this.id
    }
    this.socket.send(JSON.stringify(msg))
  }
  mapCardUI() {
    for (let i = 0; i < this.uiPlayerCards.length; i++) {
      let card: SingleCardUI = this.uiPlayerCards[i]
      card.vAlign = "bottom"
      card.hAlign = "center"
      card.positionX = 10 + i * 30
      card.positionY = 10
    }
  }
  renderGetCardButton(gameInfo: GameState) {
    this.btnGetCard.visible = true
    if (gameInfo.turnId === userData?.userId) {
      this.btnGetCard.vAlign = "bottom"
      this.btnGetCard.hAlign = "center"
      this.btnGetCard.positionY = 10
      this.btnGetCard.positionX = -100
    }
    else {
      this.btnGetCard.vAlign = "top"
      this.btnGetCard.hAlign = "center"
      this.btnGetCard.positionY = -120
      const userIndex = gameInfo.otherPlayers.indexOf(this.turnId)
      const otherPlayerCnt = gameInfo.otherPlayers.length
      this.btnGetCard.positionX = `${100 / (otherPlayerCnt + 1) * (userIndex + 1) - 50}%` //
    }
  }
  handleGameStarted(gameInfo: GameState) {
    this.isPlaying = true
    this.txtScore.visible = false
    interval = new utils.Interval(1000, () => {
      this.counter -= 1
      this.txtCounter.value = this.counter.toString()
      if (this.turnId === userData?.userId && this.counter > 0) this.txtCounter.visible = true
      else this.txtCounter.visible = false
    })
    this.addComponent(interval)
    this.updateGameInfo(gameInfo)
    this.renderView()
    this.renderGetCardButton(gameInfo)
    if (this.turnId === userData?.userId) {
      this.thrown = false
      if (timeout) engine.removeEntity(timeout)
      this.counter = 10
      timeout = utils.setTimeout(humanTimeout, () => {
        this.autoThrow()
      })
      engine.addEntity(timeout)
    }

  }
  handlePassTurn(gameInfo: GameState) {
    this.renderGetCardButton(gameInfo)
    this.turnId = gameInfo.turnId
    if (this.turnId === userData?.userId) {
      this.thrown = false
      if (timeout) engine.removeEntity(timeout)
      this.counter = 10
      timeout = utils.setTimeout(humanTimeout, () => {
        this.autoThrow()
      })
      engine.addEntity(timeout)
    }
  }
  changeSkin(playing: boolean) {
    if (playing) this.table.addComponentOrReplace(new GLTFShape("models/tableingame.glb"))
    else this.table.addComponentOrReplace(new GLTFShape("models/table.gltf"))
  }
  endGame(gameScore: EndGameProps) {
    if (timeout) engine.removeEntity(timeout)
    if (interval) this.removeComponent(interval)
    const { winner } = gameScore
    this.isPlaying = false
    for (let i = 0; i < this.uiElements.length; i++) {
      this.uiElements[i].visible = false
    }
    this.uiPlayerCards = []
    this.uiOtherPlayerCards = []
    this.uiThrownCards = []
    this.uiElements = []
    this.playerCards = []
    this.txtOtherplayerCardCnt = []
    this.selectedCardId = -1
    this.btnGetCard.visible = false
    this.canvasGamePlay.visible = false
    this.thrown = true
    // this.renderView()
    // this.uiCanvasCards.visible = false
    // this.canvasGamePlay.visible = false
    this.canvasBeforePlay.visible = true
    const isWinner = userData?.userId === winner
    const winnerData = this.players.filter(player => player.id === winner)[0]?.userData
    this.txtScore.value = this.isObserver ? `${winnerData.displayName} won this round!` : (isWinner ? "You won this round!" : "You lose this round!")
    this.txtScore.visible = true
    this.bot = false
    this.isObserver = false
    // this.btnAddBot.visible = true
    this.renderView()
  }
  handleCardThrow(gameInfo: GameState) {
    this.updateGameInfo(gameInfo)
    this.mapCardUI()
    this.renderView()
    this.renderGetCardButton(gameInfo)
    if (this.turnId === userData?.userId) {
      if (gameInfo.isAction === true) this.thrown = true
      else {
        this.thrown = false
        this.counter = 10
        if (timeout) engine.removeEntity(timeout)
        timeout = utils.setTimeout(humanTimeout, () => {
          this.autoThrow()
        })
        engine.addEntity(timeout)
      }
    }
    this.uiColorCard.visible = false

  }

  handleGetCard(gameInfo: GameState) {
    this.updateGameInfo(gameInfo)
    this.mapCardUI()
    if (userData?.userId !== gameInfo.turnId) return
    this.btnGetCard.visible = false
    const lastId = this.playerCards[this.playerCards.length - 1]
    this.renderView()
    if (!this.throwable(lastId)) {
      const msg = {
        type: msgtype.PASS_TURN,
        data: userData?.userId,
        unoId: this.id
      }
      this.socket.send(JSON.stringify(msg))
      return
    }
    this.thrown = false
    if (timeout) engine.removeEntity(timeout)
    this.counter = 10
    timeout = utils.setTimeout(humanTimeout, () => {
      this.autoThrow()
    })
    engine.addEntity(timeout)

  }
  handleDropPlayer(gameInfo: GameState) {
    if (!gameInfo.onPlay) {
      this.players = []
      this.isPlaying = false
      gameInfo.otherUsersData.forEach(element => {
        this.otherPlayerJoined(element)
      })
      this.renderView()
      return
    }
    this.updateGameInfo(gameInfo)
    this.renderView()
    this.renderGetCardButton(gameInfo)
  }
  updateGameInfo(gameInfo: GameState) {
    this.skipped = gameInfo.skipped
    gameInfo.hand.forEach((cardId, index) => {
      if (this.playerCards.indexOf(cardId) === -1) {
        this.playerCards.push(cardId)
        let card: SingleCardUI = new SingleCardUI(cardId, this.uiCanvasCards)
        log(this.uiCanvasCards)
        card.vAlign = "bottom"
        card.hAlign = "center"
        card.positionX = 10 + this.playerCards.length * 30
        card.positionY = 10
        card.onClick = new OnClick(() => {
          card.selected = true
          this.selectCard(card, cardId)
        })
        this.uiPlayerCards.push(card)
        this.uiElements.push(card)
      }
    })
    let dropUserIndex = -1
    if (gameInfo.otherPlayers.length < this.players.length) {
      let i = 0
      for (i = 0; i < gameInfo.otherPlayers.length; i++) {
        if (this.players[i].id !== gameInfo.otherPlayers[i]) {
          dropUserIndex = i
          i = gameInfo.otherPlayers.length
        }
      }
      if (i === gameInfo.otherPlayers.length && dropUserIndex === -1)
        dropUserIndex = i
    }
    this.players = []
    this.turnId = gameInfo.turnId
    this.unoPlayerIndex = -1
    gameInfo.otherPlayers.forEach((element, id) => {
      this.players.push(new OtherPlayer(gameInfo.otherUsersData[id], gameInfo.otherPlayersHand[id]))
      if (gameInfo.otherPlayersHand[id] === 1) this.unoPlayerIndex = id
    })

    const otherPlayerCnt = this.players.length
    if (this.uiOtherPlayerCards.length > otherPlayerCnt) {
      if (dropUserIndex > -1) {
        this.uiOtherPlayerCards[dropUserIndex].visible = false
        this.txtOtherplayerCardCnt[dropUserIndex].visible = false
        this.uiOtherPlayerCards.splice(dropUserIndex, 1)
        this.txtOtherplayerCardCnt.splice(dropUserIndex, 1)
      }
    }
    // else {
    if (this.players.length !== this.uiOtherPlayerCards.length)
      for (let i = 0; i < this.players.length; i++) {
        const posX = 100 / (otherPlayerCnt + 1) * (i + 1) - 50
        let card: UIImage = new UIImage(this.uiCanvasCards, cardBackTexture)
        card.vAlign = "top"
        card.hAlign = "center"
        card.positionX = `${posX}%`
        card.positionY = -10
        card.sourceTop = 0
        card.sourceLeft = 0
        card.sourceWidth = 80
        card.sourceHeight = 120
        card.width = constants.CARD_UI_WIDTH
        card.height = constants.CARD_UI_HEIGHT
        card.visible = true
        this.uiOtherPlayerCards.push(card)
        this.uiElements.push(card)
        let txt: UIText = new UIText(this.canvasGamePlay)
        txt.vAlign = "top"
        txt.hAlign = "center"
        txt.positionX = `${posX}%`
        txt.positionY = -120
        txt.fontSize = 24
        txt.width = constants.CARD_UI_WIDTH
        txt.hTextAlign = "right"
        txt.value = this.players[i].cardCnt.toString()
        txt.visible = true
        this.txtOtherplayerCardCnt.push(txt)
        this.uiElements.push(txt)
        const avatar_url = this.players[i].userData.avatar.snapshots.face256
        const avatar_texture = new Texture(avatar_url)
        let avatar: UIImage = new UIImage(this.canvasGamePlay, avatar_texture)
        avatar.vAlign = "top"
        avatar.hAlign = "center"
        avatar.positionX = `${posX}%`
        avatar.positionY = -172
        avatar.sourceTop = 0
        avatar.sourceLeft = 0
        avatar.sourceWidth = 256
        avatar.sourceHeight = 256
        avatar.width = "35px"
        avatar.height = "35px"
        avatar.visible = true
        // this.uiOtherPlayerCards.push(card)
        this.uiElements.push(avatar)
        let name: UIText = new UIText(this.canvasGamePlay)
        const displayName = this.players[i].userData.displayName
        name.vAlign = "top"
        name.hAlign = "center"
        name.positionX = `${posX}%`
        name.positionY = -176
        name.fontSize = 10
        name.width = constants.CARD_UI_WIDTH
        name.hTextAlign = "center"
        name.value = displayName === userData?.displayName ? "BOT" : displayName
        name.visible = true
        // this.txtOtherplayerCardCnt.push(txt)
        this.uiElements.push(name)
      }
    else {
      for (let i = 0; i < this.players.length; i++) {
        this.txtOtherplayerCardCnt[i].value = this.players[i].cardCnt.toString()
      }
    }
    // }
    gameInfo.thrownCards.map((cardId: number, index: number) => {
      const exist = this.uiThrownCards.filter(element => element.id === cardId).length > 0
      if (!exist) {
        let card: SingleCardUI = new SingleCardUI(cardId, this.uiCanvasCards)
        this.uiThrownCards.push(card)
        this.uiElements.push(card)
      }
      // return card
    })
    if (userData?.userId === gameInfo.turnId && gameInfo.isAction) {
      this.colorDialog.visible = true
      // this.thrown = true
      if (timeout) engine.removeEntity(timeout)
      this.counter = 10
      timeout = utils.setTimeout(humanTimeout, () => {
        this.autoPickColor()
      })
      engine.addEntity(timeout)
    }
    if (this.unoPlayerIndex > -1) {
      this.uiUnoCard.visible = true
      this.uiUnoCard.positionY = -155
      this.uiUnoCard.positionX = `${100 / (otherPlayerCnt + 1) * (this.unoPlayerIndex + 1) - 50}%`
    }
    else this.uiUnoCard.visible = false
  }
}