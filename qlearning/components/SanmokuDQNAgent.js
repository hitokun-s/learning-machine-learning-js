const Agent = require("./Agent");
const _ = require("lodash");
const deepqlearn = require("convnetjs/build/deepqlearn");

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

  constructor(env, opt) {
    super();

    opt = opt || {};

    this.gamma = 0.8;
    this.env = env;


    this.nh = opt.num_hidden_units || 30; // number of hidden units
    this.ns = this.env.size * this.env.size * 2; // input vector size(== state size)
    this.na = this.env.size * this.env.size; // output( vector size(== action count)

    this.smooth_policy_update = true;
    this.epsilon = 0.1;
    this.alpha = 0.01;

    this.net = {};
    this.net.W1 = new R.RandMat(this.nh, this.ns, 0, 0.01);
    this.net.b1 = new R.Mat(this.nh, 1, 0, 0.01);
    this.net.W2 = new R.RandMat(this.na, this.nh, 0, 0.01);
    this.net.b2 = new R.Mat(this.na, 1, 0, 0.01);

    this.experience_add_every = opt.experience_add_every || 25; // number of time steps before we add another experience to replay memory
    this.experience_size = opt.experience_size || 5000; // size of experience replay
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

  // String => Mat に変換
  // ex. "12000000" => [1,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0]
  changeFormat(s){
    var s =  s.replace(/0/g, "00").replace(/1/g, "10").replace(/2/g, "01").split("");
    var mat = new R.Mat(s.length ,1);
    mat.setFrom(s);
    return mat;
  }

  // s should be Mat object!
  forwardQ(net, s, needs_backprop) {
    
    // if(Array.isArray(s)){
    //   s = s.join("");
    // }
    // var _s = this.changeFormat(s);
    // s = new R.Mat(_s.length ,1);
    // s.setFrom(_s);
    
    // console.log("s", s);
    // console.log("net.W1", net.W1);
    
    var G = new R.Graph(needs_backprop);
    var a1mat = G.add(G.mul(net.W1, s), net.b1);
    var h1mat = G.tanh(a1mat);
    var a2mat = G.add(G.mul(net.W2, h1mat), net.b2);
    this.lastG = G; // back this up. Kind of hacky isn't it
    return a2mat;
  }

  step(s) {

    if(Array.isArray(s)){
      s = s.join("");
    }

    var poss = this.env.getPossibleActions(s);
    
    var s_mat = this.changeFormat(s);
    

    // epsilon greedy policy
    var action;
    if (Math.random() < this.epsilon) {
      action = _.sample(poss); // random available action
      // this.explored = true;
    } else {
      var amat = this.forwardQ(this.net, s_mat, false);
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

      // learn from this tuple to get a sense of how "surprising" it is to the agent
      var tderror = this.learnFromTuple(this.s0, this.a0, this.r0, this.s1, this.a1);
      this.tderror = tderror; // a measure of surprise

      // decide if we should keep this experience in the replay
      if (this.t % this.experience_add_every === 0) {
        this.exp[this.expi] = [this.s0, this.a0, this.r0, this.s1, this.a1];
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
        this.learnFromTuple(e[0], e[1], e[2], e[3], e[4])
      }
    }
    this.r0 = r1; // store for next update
  }

  learnFromTuple(s0, a0, r0, s1, a1) {
    // want: Q(s,a) = r + gamma * max_a' Q(s',a')
    
    var s0_mat = this.changeFormat(s0);
    var s1_mat = this.changeFormat(s1);

    // compute the target Q value
    var tmat = this.forwardQ(this.net, s1_mat, false);
    var qmax = r0 + this.gamma * tmat.w[R.maxi(tmat.w)];

    // now predict
    var pred = this.forwardQ(this.net, s0_mat, true);

    var tderror = pred.w[a0] - qmax;
    var clamp = this.tderror_clamp;
    if (Math.abs(tderror) > clamp) {  // huber loss to robustify
      if (tderror > clamp) tderror = clamp;
      if (tderror < -clamp) tderror = -clamp;
    }
    pred.dw[a0] = tderror;
    this.lastG.backward(); // compute gradients on net params

    // update net
    R.updateNet(this.net, this.alpha);
    return tderror;
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
    var s_mat = this.changeFormat(s);

    var amat = this.forwardQ(this.net, s_mat, false);

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