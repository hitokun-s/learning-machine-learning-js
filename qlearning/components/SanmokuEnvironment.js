const _ = require("lodash");

class SanmokuEnvironment {

  /**
   *
   * @param size: 碁盤の一辺のコマ数
   * @param n: 勝利を決めるコマ数
   */
  constructor(size, n) {
    // this.states = [0,0,0,0,0,0,0,0,0];
    this.size = size;
    this.n = n;
  }

  init() {
    // 状態の種類、アクションの種類などを定義？
    // this.states = [0,0,0,0,0,0,0,0,0];
  }

  // episodeを開始
  start() {


  }

  // state is array
  // 勝利判定は、動的計画法の匂いがする。。。
  getWinner(state) {

    var getIndex = (row, col) => {
      return this.size * row + col;
    }
        
    const test = function (target, startRow, startCol, n) {
      // この中が1windowの探査
      for (var row = startRow; row < startRow + n; row++) {
        if (_.every(_.range(n), (t => {
            return state[getIndex(row, startCol + t)] == target;
          }))) {
          return true;
        }
        // if(state[getIndex(row, 0)] == target && state[getIndex(row, 1)] == target && state[getIndex(row, 2)] == target){
        //     return target;
        // }
      }
      for (var col = startCol; col < startCol + n; col++) {
        if (_.every(_.range(n), (t => {
            return state[getIndex(startRow + t, col)] == target;
          }))) {
          return true;
        }
        // if(state[getIndex(0,col)] == target && state[getIndex(1,col)] == target && state[getIndex(2, col)] == target){
        //     return target;
        // }
      }
      if (_.every(_.range(n), (t => {
          return state[getIndex(startRow + t, startCol + t)] == target;
        }))) {
        return true;
      }
      if (_.every(_.range(n), (t => {
          return state[getIndex(startRow + n - t, startCol + t)] == target;
        }))) {
        return true;
      }
      // if(state[getIndex(0,0)] == target && state[getIndex(1,1)] == target && state[getIndex(2,2)] == target){
      //   return target;
      // }
      // if(state[getIndex(0,2)] == target && state[getIndex(1,1)] == target && state[getIndex(2,0)] == target){
      //   return target;
      // }
      return false;
    }
    

    // 1もしくは2が、縦・横・斜めに3つ並んでいれば勝負あり。

    // n*nをwindowとみて探査する
    for (var target = 1; target <= 2; target++) {
      for (var row = 0; row <= this.size - this.n; row++) {
        for (var col = 0; col <= this.size - this.n; col++) {
          if (test(target, row, col, this.n)) {
            return target;
          }
        }
      }
    }
    return null;
  }

  // actionを実行し、結果の状態、報酬、ゴールに達したか（例；勝負がついたか）などを返す
  // 対戦ゲームの場合は、env側は自分で手を打つ
  // 決着がついた場合は、Agent.end()が、ついていない場合は、Agent.step()が呼ばれるはず。
  step(state, action) {

    state = state.split("");

    // actionはインデックス
    state[action] = 1;
    var winner = this.getWinner(state);
    if (winner) {
      return {finish: true, state: state.join(""), reward: winner == 1 ? 100 : -100};
    }
    var actions = this.getPossibleActions(state.join(""));

    // 引き分け
    if (actions.length == 0) {
      return {finish: true, state: state.join(""), reward: 0};
    }


    var action = _.sample(actions);
    state[action] = 2;

    var winner = this.getWinner(state);
    if (winner) {
      return {finish: true, state: state.join(""), reward: winner == 1 ? 100 : -100};
    }

    // 引き分け
    if (this.getPossibleActions(state.join("")).length == 0) {
      return {finish: true, state: state.join(""), reward: 0};
    }

    return {finish: false, state: state.join(""), reward: 0};
  }

  getPossibleActions(state) {

    state = state.split("");

    // 空いているマスのインデックスをリストで返す
    return state.map((s, i) => {
      return s == 0 ? i : null;
    }).filter(s => s != undefined && s != null);
  }

  cleanup() {

  }

  message(message) {

  }
}

module.exports = SanmokuEnvironment;

