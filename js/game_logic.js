
function GameLogic(curTiming, scanTimeStamp) {
    var bus = event_bus();
    this.on = bus.on;
    this.emit = bus.emit;

    //this.gameData = gameData;
    this.gameData = {
        welcomeMsg: '预备',
        firstMsg: '开始',
        answers:   [['B'],['C'],['D'],['C'],
        				['A'],['B'],['D'],['B'],
        				['C'],['B'],['A'],['D'],
        				['B'],['A'],['C'],['D'],
        				['B'],['A'],['B'],['A'],
        				['C'],['D'],['B'],['D'],
        				['C'],['D'],['B'],['A'],
        				['D'],['B'],['C'],['B'],
        				['D'],['C'],['A'],['B'],
        				['C'],['B'],['A'],['C'],['B']],
        beatsPerMin: 600,
        answerBeats: [0, 10, 7, 6, 9, 7, 6, 8, 8, 9, 8, 6, 7, 5, 3, 4, 9, 8, 6, 8, 11, 5, 7, 5, 8, 6, 6, 6, 6, 7, 8, 7, 7, 5, 5, 6, 6, 8, 5, 5, 3, 5],
        answerWindow:    [9, 6, 5, 8, 6, 5, 7, 7, 8, 7, 5, 6, 4, 2, 3, 8, 7, 5, 6, 8,  4, 6, 4, 7, 5, 5, 5, 5, 6, 7, 6, 6, 4, 4, 5, 5, 7, 4, 4, 2, 5, 5],
        hitTolerance: 225,
        correctMsgs: [ '真棒!', '干得好!', '完美!', '耶!', '给力!', '漂亮!'],
        incorrectMsgs: ['Miss'],
        scoreMsgs: [
          { minScore: 0, msg: '呵呵' },
          { minScore: 5, msg: '不错哦' },
          { minScore: 50, msg: '厉害啦!' },
          { minScore: 65, msg: '牛掰啊!' },
          { minScore: 100, msg: '大吉大利, 今晚吃鸡!' },
        ],
        timingActualStart: 7000, // ms
        timingActualEnd: 38000,	// ms
        timingScan: curTiming * 1000, //ms
        tsScan: scanTimeStamp,
        tsLastActive: 0,
        sceanID: 0
    };
}

GameLogic.prototype = {
	waitSecCounter: 0,
	waitTimer:null,

    countdownTimer: null,
    countdownTime: 0,
    timerStartTime: 0,
    handledTimings: [],

    buttonsEnabled: false,
    currQuestion: 0,
    playerScore: 0,
    regEvts: {},
    
    gameStats: {},

    tsMarker: 0,

    init: function () {
        var scope = this;
		var tsStart = this.gameData.tsScan;
		this.gameData.sceanID = tsStart - (tsStart % 10000); // set last 4 digits to 0
		
        this.emit("staticMessage", this.gameData.welcomeMsg);
        this.playerScore = 0;

        this.hitTimings = [];
        this.handledTimings = [];
        this.activateTimings = [];
        var inc = 0;
        var tsBefore = this.getCurTimeStamp();
        var httpRspData = $.ajax({url:'http://www.91qzb.com/thinkphp/public/index.php/api/index/getservertime',
                                    type: "get",
                                    jsonType: "json",
                                    async:false});
        var httpDur = this.getCurTimeStamp() - tsBefore;

        this.markTimeStart();

        var tsServer = httpRspData.responseJSON.data['ts'];

        var serverDur = tsServer - this.gameData.tsScan;

        
        var old_value = this.gameData.timingScan;
        // 加上一段补偿时间: server校对的时间流逝, 加上本地http请求的一半
        this.gameData.timingScan += serverDur + httpDur * 0.5;

        console.log("httpDur = " + httpDur + " serverDur = " + serverDur);
        console.log(" timingScan repay "+ old_value + " -> " + this.gameData.timingScan);

        var alreadPastDur = this.getAlreadyPastDuration();
        
        this.gameData.answerBeats.forEach( function(val, idx){
          inc+= val/scope.gameData.beatsPerMin*60*1000;
          scope.hitTimings[idx] = inc;
          var activateTime = scope.hitTimings[idx]; // - scope.gameData.hitTolerance;
          scope.handledTimings[activateTime] = activateTime > alreadPastDur ? false : true;
          scope.activateTimings[idx] = activateTime;
        });

        this.totalGameTime = this.hitTimings[this.hitTimings.length - 1];

        this.emit("screen", "loading");
        this.emit("gameInit");

        var loadingDur = this.getLoadingDuration();
        if (loadingDur <=0) {
            scope.emit("screen", "game");
        } else {
            setTimeout(function () {
                scope.emit("screen", "game");
              }, loadingDur);
        }
        
        
        this.startWaitTimer();
        this.gameStats = this.getUserInfo(tsStart);
        this.logStats(this.gameStats);
        // this.initWeChat();
    },

    startGame: function () {
        this.startCountdownTimer();
        this.enableAnswerButtons();
        this.emit("gameStart");
        this.emit("flashMessage", { message: this.gameData.firstMsg, duration: 1000 });
    },
    
    startWaitTimer: function () {
    		var tmp = this.getLoadingDuration();
    		if (tmp < 1000) {
    			return;
    		}
    		
    		this.waitSecCounter = (this.getLoadingDuration() / 1000).toFixed(0);
    		this.updateWaitTimer();
    		var scope = this;
        this.waitTimer = setInterval(function () { scope.waitSecCounter -- ; scope.updateWaitTimer(); }, 1000);
    },
    
    updateWaitTimer: function () {
    		if (this.waitSecCounter < 0) {
    			clearInterval(this.waitTimer);
    			this.waitTimer = null;
    			this.waitSecCounter = null;
    		} else {
    			this.emit("waitTimer", this.waitSecCounter);
    		}
    },

    startCountdownTimer: function () {
        this.markTimeLog("startCountdownTimer");

        this.countdownTime = this.totalGameTime;
        var scope = this;
        var performance_now = this.getCurTimeStamp();
        console.log("starter performance_now = " + performance_now);
        this.timerStartTime = performance_now - this.getAlreadyPastDuration();
        scope.updateCountdownTimer();
        this.countdownTimer = setInterval(function () { scope.updateCountdownTimer(); }, 10);
    },

    stopCountdownTimer: function () {
        clearInterval(this.countdownTimer);
        this.countdownTimer = null;
        this.countdownTime = this.totalGameTime;
        this.timerStartTime = 0;
    },

    updateCountdownTimer: function () {
        this.emit("timer", this.countdownTime);
        var performance_now = this.getCurTimeStamp();
        if(performance_now < 2000) {
            console.log("updater performance_now = " + performance_now);
        }


        this.countdownTime = this.totalGameTime - (performance_now - this.timerStartTime);
        if (this.countdownTime <= 0) {
            this.stopCountdownTimer();
            var scope = this;
            setTimeout(function () {
              scope.onGameComplete();
            }, 2500);
            return;
        }
        var elapsedTime = this.totalGameTime - this.countdownTime;

        for (var i = 0, j = this.activateTimings.length; i < j; i++) {
            if (elapsedTime >= this.activateTimings[i] && !this.handledTimings[this.activateTimings[i]]) {
                this.handledTimings[this.activateTimings[i]] = true;
                // console.info(elapsedTime.toFixed(0)+' vs '+this.activateTimings[i]);
                this.activateButtons(i);
            }
        }
    },

    // getMaxScore: function(){
    //   var score = 0;
    //   this.gameData.answers.forEach( function(arr){
    //     score+= arr.length;
    //   });
    //   return score;
    // },

    getScoreMessage: function(){
    //   var score = Math.round(this.playerScore/this.getMaxScore()*100);
      var msg = this.gameData.scoreMsgs[0].msg;
      for( var i=0, j=this.gameData.scoreMsgs.length; i<j; i++ ){
          var obj = this.gameData.scoreMsgs[i];
          if(this.playerScore > obj.minScore ){
            msg = this.gameData.scoreMsgs[i].msg;
          } else {
            break;
          }
      }
      return msg;
    },

    onGameComplete: function () {
        var scope = this;
        this.gameStats ['score'] = scope.playerScore;
        this.gameStats ['msg'] = scope.getScoreMessage(scope.playerScore);
        this.gameStats ['logTimeStampEnd'] = this.getCurTimeStamp();
        this.gameStats ['sceanID'] = scope.gameData.sceanID;

        scope.emit("gameComplete", this.gameStats);
        scope.emit("screen", "thanks");
    },

    activateButtons: function (num) {
        // console.log('Question ' + (num + 1) + ' = ' + this.gameData.answers[num]);
        var scope = this;
        // add class to relevant buttons
        this.gameData.answers[num].forEach( function(button) {
          scope.tsLastActive = scope.getCurTimeStamp();
          scope.emit("activate",button);
          // remove class after hitTolerance*2 period
          setTimeout(function () {
              scope.emit("deactivate",button);
          }, scope.gameData.answerWindow[num] *60*1000/scope.gameData.beatsPerMin) //scope.gameData.hitTolerance * 2)
        });
    },

    showCorrectAnswer: function () {
        this.playerScore += this.evaluateScore();
        console.log ("adding score = " + this.playerScore);
        this.emit("updateScore", this.playerScore);
        // update message
        var idx = Math.floor(Math.random() * this.gameData.correctMsgs.length);
        var message = this.gameData.correctMsgs[idx];
        this.emit("flashMessage", { message: message });
    },

    showIncorrectAnswer: function () {
        // update message
        var idx = Math.floor(Math.random() * this.gameData.incorrectMsgs.length);
        var message = this.gameData.incorrectMsgs[idx];
        this.emit("flashMessage", { message: message });
        // TODO: add red tap effect
    },

    disableAnswerButtons: function () {
        console.log('disabling answer buttons');
        this.buttonsEnabled = false;
    },

    enableAnswerButtons: function () {
        console.log('enabling answer buttons');
        this.buttonsEnabled = true;
    },

    registerUIEvents: function (ui) {
        var scope = this;
        ui.on("button", function (evt) {
            switch (evt) {
                case "playAgain":
                    scope.init();
                    break;
                case "close":
                    intrasonics.closeView();
                    break;
                case "hit":
                    if (scope.buttonsEnabled) {
                        scope.showCorrectAnswer();
                    }
                    break;
                case "miss":
                    if (scope.buttonsEnabled) {
                        scope.showIncorrectAnswer();
                    }
                    break;
                default:
                    console.log("Unhandled event",evt);
            }
        });
    },
    getUserInfo: function (tsStart) {
    		var stats = {
                logTimeStampStart:tsStart,
                logTimeStampEnd:0,
                sceanID: this.gameData.sceanID,
                score: 0,
                msg: "",
                name: window.localStorage.getItem('name'),  
                thumb: window.localStorage.getItem('imgURL'),
                openid: window.localStorage.getItem('openid'),
                country: window.localStorage.getItem('country'),
                city: window.localStorage.getItem('city'),
                sex: window.localStorage.getItem('sex'),
                mobile: window.localStorage.getItem('mobile'),
                user_id: window.localStorage.getItem('user_id'),
                lat:0,
                lng:0,
        }
        return stats;
    },

    getLoadingDuration: function () {
        var dur = this.gameData.timingActualStart - this.gameData.timingScan;
        if (dur < 0) {
            dur = 0;
        }
        console.log ("getLoadingDuration scanTiming = " + this.gameData.timingScan + " dur = " + dur);
        return dur;
    },
    
    // handle join after game start
    getAlreadyPastDuration: function () {
        var dur = this.gameData.timingScan - this.gameData.timingActualStart;
        if (dur < 0) {
            dur = 0;
        }
        // console.log ("getAlreadyPastDuration scanTiming = " + this.gameData.timingScan + " dur = " + dur);
        return dur;
    },
    
    initWeChat: function () {
        var scope = this;
	    // console.log('wx_config', wx_config);
	 
	    wx.config({
	        debug: false,
	        appId: wx_config['appId'],
	        timestamp: wx_config['timestamp'],
	        nonceStr: wx_config['nonceStr'],
	        signature: wx_config['signature'],
	        jsApiList: [
	        //    'openLocation',
	           'getLocation',
	        ]
	    });
	
	    wx.ready(function () {
	        console.log('wx ready');
	        wx.getLocation({
			    type: 'wgs84', // 默认为wgs84的gps坐标，如果要返回直接给openLocation用的火星坐标，可传入'gcj02'
			    success: function (res) {
			        scope.gameStats['lat'] = res.latitude; // 纬度，浮点数，范围为90 ~ -90
                    scope.gameStats['lng'] = res.longitude; // 经度，浮点数，范围为180 ~ -180。
                    console.log("lat=" + res.latitude + ";lng=" + res.longitude);
			        // var speed = res.speed; // 速度，以米/每秒计
                    // var accuracy = res.accuracy; // 位置精度
                    scope.logStats(scope.gameStats);
			    }
			});
	    });
    },

    getCurTimeStamp:function () {
        var tmp = new Date().getTime();
        return tmp;
    },

    evaluateScore:function () {
        var cur = this.getCurTimeStamp();
        var delta = cur - this.gameData.tsLastActive;
        var score = 0;
        if (delta > 0.9) {
            score = 1;
        } else if (delta > 0.8) {
            score = 2;
        } else if (delta > 0.7) {
            score = 3;
        } else if (delta > 0.6) {
            score = 4;
        } else if (delta > 0.5) {
            score = 5;
        } else if (delta > 0.4) {
            score = 6;
        } else if (delta > 0.3) {
            score = 7;
        } else if (delta > 0.2) {
            score = 8;
        } else if (delta > 0.1) {
            score = 9;
        }else {
            score = 10;
        }
        return score;
    },

    logStats:function (stats) {
        var url = "http://h5.edisonx.cn/h5game/getprize/core/core.php?a=log" + 
        "&st=" + stats['logTimeStampStart'] + 
        "&ed="+ stats['logTimeStampEnd'] + 
        "&sceneID=" + stats['sceanID'] + 
        "&nickname=" + stats['name'] + 
        "&sex=" + stats['sex'] + 
        "&city=" + stats['city'] + 
        "&country=" + stats['country'] + 
        "&openid=" + stats['openid'] + 
        "&headimgurl=" + stats['thumb'] + 
        "&user_id=" + stats['user_id'] + 
        "&lat=" + stats['lat'] + "&lng=" + stats['lng'];
        
        // console.log("logging:" + url);
        
        $.get(url,function(data,status){
            console.log("sent log Status=" + status);
        });
    },

    markTimeStart:function () {
        this.tsMarker = this.getCurTimeStamp();
    },

    markTimeLog:function (prefix) {
        var tmp = this.getCurTimeStamp() - this.tsMarker;
        console.log ("ts_marker: " + prefix + " " + tmp);
    },
};
