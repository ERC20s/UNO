export interface UserData {
  displayName: string
  userId: string
  avatar: any
}
export default class Player {
  hand: number[] = []
  score: number = 0
  id: string
  userData: UserData
  constructor(id: string, userData: UserData) {
    this.id = id
    this.userData = userData
  }

  drawCard(id: number) {
    this.hand.push(id)
  }

  throwCard(id: number) {
    let i = this.hand.indexOf(id)
    if(i != -1) {
      this.hand.splice(i, 1)
    }
  }
}