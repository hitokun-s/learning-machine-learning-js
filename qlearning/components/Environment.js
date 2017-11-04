
class Environment{

    constructor(states){
        this.states = states;

        this.stateActionMap = {
            "0":["4"],
            "1":["3","5"],
            "2":["3"],
            "3":["1","2","4"],
            "4":["0","3","5"],
            "5":["5"]
        }
    }
    init(){
        // 状態の種類、アクションの種類などを定義？
    }

    // episodeを開始
    start(){


    }
    // actionを実行し、結果の状態、報酬、ゴールに達したか（例；勝負がついたか）などを返す
    // 対戦ゲームの場合は、env側は自分で手を打つ
    // 決着がついた場合は、Agent.end()が、ついていない場合は、Agent.step()が呼ばれるはず。
    step(state, action){
        if(action == "5") {
            return {finish: true, state: action, reward: 100};
        }else{
            return {finish:false, state: action, reward: 0};
        }
    }
    // 独自メソッド、なのか？
    getPossibleActions(state){
        return this.stateActionMap[state];
    }
    cleanup(){

    }
    message(message){

    }
}

module.exports =Environment;

