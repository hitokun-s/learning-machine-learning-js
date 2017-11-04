// rlGlueのpythonのAgent親クラス、というかinterface

class Agent{
  // see https://stackoverflow.com/questions/29480569/does-ecmascript-6-have-a-convention-for-abstract-classes
  constructor(){
    if (new.target === Agent) {
      throw new TypeError("Cannot construct Agent instances directly");
    }
  }
  
  //(string) -> void
  // Q学習の場合には、Qテーブルを準備する
  init(taskSpecification){
    if(this.method === undefined){
      throw new Error("you must override this method!");
    }
  }
  // (Observation) -> Action
  // Environment.start()の次に呼ばれる
  // n目並べの場合、一手目を打つ
  // epsilonを更新する（epsilon-greedy法）
  start(observation){
    
  }
  // (double, Observation) -> Action
  // 基本は、action を決めること（＋それをENVに伝えること）、それだけ。
  // Q学習の場合は、この中でQ値の更新などを行う
  step(reward, observation){
    
  }
  // (double) -> void
  // # ゲームが終了した時点で呼ばれる
  end(reward){
    
  }
  cleanup(){
    
  }
  message(message){
    
  }

}

module.exports = Agent;