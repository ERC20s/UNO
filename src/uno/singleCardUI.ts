// import utils from '../node_modules/decentraland-ecs-utils/index'
// import * as RestrictedActions from '@decentraland/RestrictedActions'
// import { movePlayerTo } from '@decentraland/RestrictedActions'

import constants from '../constants'

// DeckImage is 2389*2049
// Single card w=171px h=256

const CARD_TEXTURE = new Texture('images/card_deck.png')

export default class SingleCardUI extends UIImage {
  
  id: number

  onHand: boolean = false
  selected: boolean = false

  constructor(id: number, parent: UICanvas) {
    super(parent, CARD_TEXTURE)
    log(id % 8)
    log(14 - Math.floor(id / 8))
    this.id = id
    this.sourceTop = constants.CARD_IMG_HEIGHT * (id % 8)
    this.sourceLeft = constants.CARD_IMG_WIDTH * (13 - Math.floor(id / 8))
    this.sourceWidth = constants.CARD_IMG_WIDTH
    this.sourceHeight = constants.CARD_IMG_HEIGHT
    this.width = constants.CARD_UI_WIDTH
    this.height = constants.CARD_UI_HEIGHT
    // this.onClick = new OnClick(() => {
    //   log('click')
    // })
    
  }

  public clickCard(): void {
    this.selected = true
    // this.positionY = this.positionY + 10
    log(this.positionY)
  }

  deselectCard() {
    this.selected = false
  }

  setOnHand() {
    this.onHand = true
  }

}