const Agent = require("./Agent");
const _ = require("lodash");
const deepqlearn = require("convnetjs/build/deepqlearn");
const convnetjs = require("convnetjs");
const R = require("./R");
var zeros = R.zeros; // inherit these
var assert = R.assert;
// var randi = R.randi;

var randf = function(a, b) { return Math.random()*(b-a)+a; }
var randi = function(a, b) { return Math.floor(Math.random()*(b-a)+a); }
// var randn = function(mu, std){ return mu+gaussRandom()*std; }
// var randf = R.randf;

// 参考：『実装ディープラーニング』
class SanmokuAgent extends Agent {

  // turn: "1" or "2"
  constructor(env, opt, turn) {
    super();

    opt = opt || {};
    
    this.turn = turn;

    this.gamma = 0.8;
    this.env = env;

    this.useHistory = 2;

    this.nh = opt.num_hidden_units || 70; // number of hidden units
    this.ns = this.env.size * this.env.size * 2 * (1 + this.useHistory); // input vector size(== state size)
    this.na = this.env.size * this.env.size; // output( vector size(== action count)

    this.smooth_policy_update = true;
    this.epsilon = 0.1;
    this.alpha = 0.01;

    // this.net = {};
    // this.net.W1 = new R.RandMat(this.nh, this.ns, 0, 0.01);
    // this.net.b1 = new R.Mat(this.nh, 1, 0, 0.01);
    // this.net.W2 = new R.RandMat(this.na, this.nh, 0, 0.01);
    // this.net.b2 = new R.Mat(this.na, 1, 0, 0.01);
    
    if(opt.net){
      this.net = opt.net;
    }else{
      var layer_defs = [];
      layer_defs.push({type:'input', out_sx:1, out_sy:1, out_depth: this.ns});
      layer_defs.push({type:'fc', num_neurons: 180, activation:'relu'});
      layer_defs.push({type:'fc', num_neurons: 90, activation:'relu'});
      // layer_defs.push({type:'fc', num_neurons:20, activation:'relu'});
      // layer_defs.push({type:'conv', sx:5, filters:1, stride:1, pad:1, activation:'relu'});
      layer_defs.push({type:'softmax', num_classes: this.na});

      this.net = new convnetjs.Net();
      this.net.makeLayers(layer_defs);
    }
    
    this.trainer = new convnetjs.Trainer(this.net, {
      learning_rate:0.01,
      l2_decay:0.001,
      batch_size: 1
    });
    
    this.experience_add_every = opt.experience_add_every || 5; // number of time steps before we add another experience to replay memory
    this.experience_size = opt.experience_size || 20000; // size of experience replay
    this.learning_steps_per_iteration = opt.learning_steps_per_iteration || 10;
    this.tderror_clamp = opt.tderror_clamp || 1.0;

    // this.num_hidden_units = opt.num_hidden_units || 100;
    

    // this.brain = new deepqlearn.Brain(env.size * env.size * 2 * 3, env.size * env.size); // input count, output count

    // bdim: 9コマ * 2 = 18
    // frame: 3
    //中間層は、30 units
    // 出力は、dim = 9コマ（に対応する各Q値）
    // 学習用および、action決定に使うQ値参照用。        
    // this.Q = QNet(self.bdim*self.n_frames, 30, self.dim)

    // Q値計算・更新用のTarget Network。教師データ生成に使う。
    // this.targetQ = copy.deepcopy(self.Q);

    // Alex Graves's RMSprop
    // self.optimizer = optimizers.RMSpropGraves(lr=0.00025, alpha=0.95,
    //   momentum=0.0)
    // self.optimizer.setup(self.Q)
  }

  init() {
    this.r0 = null;
    this.r1 = null;
    this.s0 = null;
    this.s1 = null;
    this.a0 = null;
    this.a1 = null;

    this.t = 0;
    this.exp = []; // experience
    this.expi = 0; // where to insert
  }

  // ある状態から可能なアクションの中で、最大のQ値を返す
  optimalFutureValue(state) {
    // var max = 0;
    // for (var action in this.Q[state]) {
    //   max = Math.max(max, this.Q[state][action]);
    // }
    // return max;
  }

  sampleWeighted(p) {
    var r = Math.random();
    var c = 0.0;
    for (var i = 0, n = p.length; i < n; i++) {
      c += p[i];
      if (c >= r) {
        return i;
      }
    }
  }
  
  // ex. "12000000" => [1,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0]
  changeFormat(s){
    
    var state0 = _.range(this.env.size * this.env.size).map(() => {return 0}).join("");
    
    // s == history[0]とは限らない！
    
    var i = this.env.history.indexOf(s);
    if(i == -1){
      // console.log("s", s);
      // console.log("history", this.env.history);
      this.env.history = [];
    }
    // assert(i > -1);
    
    var s_1, s_2;
    if(this.env.history.length > i + 1){
      s_1 = this.env.history[i + 1];
    }else{
      s_1 = state0;
    }
    if(this.env.history.length > i + 2){
      s_2 = this.env.history[i + 2];
    }else{
      s_2 = state0;
    }

    var target = s + s_1 + s_2;

    // もし自分が手番2なら、判定対象のstateを白黒反転する
    if(this.turn == 2){
      target = target.replace(/1/g, "3").replace(/2/g, "1").replace(/3/g, "2");
    }
    
    target = target.replace(/0/g, "00").replace(/1/g, "10").replace(/2/g, "01").split("");
    
    // var mat = new R.Mat(s.length ,1);
    // mat.setFrom(s);
    // return mat;
    return new convnetjs.Vol(target);
  }
  
  simulate(s){
    // TODO 別に一手といわず、二手三手先まで、全手確認しても、そんな手間ではないかも？
    var actions = this.env.getPossibleActions(s);
    
    s = s.split("");
    
    // 全ての手を試して、もし勝負がつくならその手を確認する
    for(var i = 0;i < actions.length;i++){
      var a = actions[i];
      var clone = _.cloneDeep(s);
      clone[a] = this.turn;
      if(this.env.getWinner(clone)){
        console.log("============ forecast winner", this.env.getWinner(clone));
        return a;
      }
      clone[a] = this.turn == "1" ? "2" : "1";
      if(this.env.getWinner(clone)){
        console.log("============ forecast winner", this.env.getWinner(clone));
        return a;
      }
    }
    return null;
  }

  step(s) {

    if (Array.isArray(s)) {
      s = s.join("");
    }

    var poss = this.env.getPossibleActions(s);

    // simulation for 1 step later
    // - check if I can win with next step => choose that action
    // - check if the opponent can win with next step => prevent that
    var recommendedAction = this.simulate(s);

    // epsilon greedy policy
    var action;
    if (recommendedAction != null) {
      console.log("let's choose recommended action!", recommendedAction);
      action = recommendedAction;
    } else if (Math.random() < this.epsilon) {
      action = _.sample(poss); // random available action
      // this.explored = true;
    } else {
      var amat = this.net.forward(this.changeFormat(s), false);
      // action = R.maxi(amat.w); // returns index of argmax action
      // もちろん可能なaction出ないとダメ！
      
      // console.log("amat.w", amat.w);

      var target = [].slice.call(amat.w);
      
      var tmp = target.map(function(d, i){return {action: i, amount: d};});
      tmp = _.sortBy(tmp, function(d){return d.amount}).reverse();
      // console.log("tmp", tmp);
      
      var action = -1;
      
      for(var i=0;i<tmp.length;i++){
        if(_.includes(poss, tmp[i].action)){
          action = tmp[i].action;
          break;
        }
      }
      
      if(!_.includes(poss, action)){
        console.log("action", action);
        console.log("poss", poss);
        throw Error("Invalid action!");
      }
      
    }
    // console.log("action", action);

    // shift state memory
    this.s0 = this.s1;
    this.a0 = this.a1;
    this.s1 = s;
    this.a1 = action;

    // console.log("s0", this.s0, "s1", this.s1);

    return action;
  }

  learn(r1) {
    // perform an update on Q function
    if (!(this.r0 == null) && this.alpha > 0) {
      
      var input0 = this.changeFormat(this.s0);
      var input1 = this.changeFormat(this.s1);

      // learn from this tuple to get a sense of how "surprising" it is to the agent
      var tderror = this.learnFromTupleNew(input0, this.a0, this.r0, input1, this.a1);
      this.tderror = tderror; // a measure of surprise

      // decide if we should keep this experience in the replay
      if (this.t % this.experience_add_every === 0) {
        this.exp[this.expi] = [input0, this.a0, this.r0, input1, this.a1];
        this.expi += 1;
        if (this.expi > this.experience_size) {
          this.expi = 0;
        } // roll over when we run out
      }
      this.t += 1;

      // sample some additional experience from replay memory and learn from it
      for (var k = 0; k < this.learning_steps_per_iteration; k++) {
        var ri = randi(0, this.exp.length); // todo: priority sweeps?
        var e = this.exp[ri];
        this.learnFromTupleNew(e[0], e[1], e[2], e[3], e[4])
      }
    }
    this.r0 = r1; // store for next update
  }

  learnFromTupleNew(input0, a0, r0, input1, a1) {

    // compute the target Q value
    var tmat = this.net.forward(input1, false); // アクションではなくベクトル（状態s1で各アクションをとった場合のQ値）を返す
    var qmax = r0 + this.gamma * tmat.w[R.maxi(tmat.w)];

    // now predict
    var pred = this.net.forward(input0, true); // 状態s0で各アクションをとった場合のQ値
    pred.w[R.maxi(tmat.w)] = qmax;

    // 状態s0でアクションa0をとった場合の最大Q値は、qmaxの方がより正しい => ので更新する
    // => 入力をs0、出力を修正教師ベクトルとして、学習する

    this.trainer.train(input0, R.maxi(pred.w));

  }

  learnFromTuple(s0, a0, r0, s1, a1) {
    // want: Q(s,a) = r + gamma * max_a' Q(s',a')
    
    // var s0_mat = this.changeFormat(s0);
    // var s1_mat = this.changeFormat(s1);
    
    // s0 = s0.split("");
    // s1 = s1.split("");

    // compute the target Q value
    var tmat = this.net.forward(this.changeFormat(s1), false); // アクションではなくベクトル（状態s1で各アクションをとった場合のQ値）を返す
    var qmax = r0 + this.gamma * tmat.w[R.maxi(tmat.w)];

    // now predict
    var pred = this.net.forward(this.changeFormat(s0), true); // 状態s0で各アクションをとった場合のQ値
    pred.w[R.maxi(tmat.w)] = qmax;
    
    // 状態s0でアクションa0をとった場合の最大Q値は、qmaxの方がより正しい => ので更新する
    // => 入力をs0、出力を修正教師ベクトルとして、学習する

    // var tderror = pred.w[a0] - qmax;
    // var clamp = this.tderror_clamp;
    // if (Math.abs(tderror) > clamp) {  // huber loss to robustify
    //   if (tderror > clamp) tderror = clamp;
    //   if (tderror < -clamp) tderror = -clamp;
    // }
    // pred.dw[a0] = tderror;
    // this.lastG.backward(); // compute gradients on net params
    // var x = new convnetjs.Vol(s0);
    this.trainer.train(this.changeFormat(s0), R.maxi(pred.w));

    // update net
    // R.updateNet(this.net, this.alpha);
    // return tderror;
  }

  updatePolicy(s) {
    throw Error("updatePolicy cannot be called!");

    // var poss = this.env.getPossibleActions(s);
    //
    // // Pの初期値は、各アクション均等割
    // if (!this.P[s]) {
    //   this.P[s] = {};
    //   poss.forEach(action => {
    //     this.P[s][action] = 1 / poss.length;
    //   });
    // }
    //
    // // set policy at s to be the action that achieves max_a Q(s,a)
    // // first find the maxy Q values
    // var qmax, nmax;
    // var qs = [];
    // poss.forEach((action, i) => {
    //   var qval = this.Q[s][action];
    //   qs.push(qval);
    //   if (i === 0 || qval > qmax) {
    //     qmax = qval;
    //     nmax = 1;
    //   }
    //   else if (qval === qmax) {
    //     nmax += 1;
    //   }
    // });
    // // now update the policy smoothly towards the argmaxy actions
    // var psum = 0.0;
    // poss.forEach((a, i) => {
    //   var target = (qs[i] === qmax) ? 1.0 / nmax : 0.0;
    //
    //   if (this.smooth_policy_update) {
    //     // slightly hacky :p
    //     this.P[s][a] += this.beta * (target - this.P[s][a]);
    //     psum += this.P[s][a];
    //   } else {
    //     // set hard target
    //     this.P[s][a] = target;
    //   }
    // });
    // if (this.smooth_policy_update) {
    //   // renomalize P if we're using smooth policy updates
    //   poss.forEach((a, i) => {
    //     var a = poss[i];
    //     this.P[s][a] /= psum;
    //   });
    // }
  }

  bestAction(s) {

    if(Array.isArray(s)){
      s = s.join("");
    }

    var poss = this.env.getPossibleActions(s);
    // var s_mat = s.split("");

    var amat = this.net.forward(this.changeFormat(s), false);

    var target = [].slice.call(amat.w);

    var tmp = target.map(function(d, i){return {action: i, amount: d};});
    tmp = _.sortBy(tmp, function(d){return d.amount}).reverse();


    var action = -1;

    for(var i=0;i<tmp.length;i++){
      if(_.includes(poss, tmp[i].action)){
        action = tmp[i].action;
        break;
      }
    }

    if(!_.includes(poss, action)){
      console.log("action", action);
      console.log("poss", poss);
      throw Error("Invalid action!");
    }

    return action;

  }

  // update_targetQ() {
  //   if (this.step_counter % this.update_freq == 0) {
  //     this.targetQ = copy.deepcopy(this.Q); // 学習したパラメータをコピー    
  //   }
  // }


  store_transition(s, a, r) {
    while (this.replayMem.length >= this.capacity) {
      this.replayMem.shift();
    }
    this.replayMem.push({
      lastState: s,
      lastAction: a,
      reward: r,
      state: this.state,
      terminal: terminal
    });
  }

  // 学習メイン処理。Experience Replayを実行している
  replayExperience() {
    // 保持した10000レコードから、バッチサイズ（32）分をランダムに選んで取得

    // # 〇を打った後の状態s2から、次のa（= action）を推測 = 一手先のQ値を推測
    // ここではtargetQを使って計算。入力がs2、出力がQ値

    // 次の行動の最大Q値（ベクトル。要素数==コマ数） = np.sign(r) + (1 - t) * self.gamma * max_Q_data の値を計算 => これが教師データになる

  }

}

module.exports = SanmokuAgent;