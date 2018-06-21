var gameUI = {
    init: function (game) {
        console.log("game_ui loaded");

        var bus = event_bus();
        this.on = bus.on;
        this.emit = bus.emit;

        $('div.buttons div').each(function (i) {
            console.log("Registering handlers");
            $(this).click(function () {
                if ($(this).hasClass('active')) {
                    bus.emit("button", "hit");
                } else {
                    bus.emit("button", "miss");
                    $(this).effect('shake',{
                      direction: 'left',
                      distance: 10,
                      times: 2
                    }, 300);
                }
            });
        });

        //Register click handlers
        $('a#btn-play-again', 'div.thanks').click(function () {
            bus.emit('button', "playAgain");
        });
        $('a#btn-back').click(function () {
            bus.emit('button', "close");
        })

        //Pass the UI event bus back to the game so it can listen to the UI events
        game.registerUIEvents(bus);

        //Register game engine events
        game.on("gameInit", function(){
            $('#timer').removeClass('active');
            $( ".progress-bar" ).width('0%').animate({ width: "100%" }, 4000, function(){
              $('#timer').addClass('active');
              $('div.buttons div').each(function() {
                  $(this).delay(250).fadeIn(750);
              });
            });
        });
        game.on("gameStart", function(){

        });
        
        game.on("gameComplete", function(stats){
        //   $('div.message'/*, 'div.thanks'*/)
        //     .html(''+ stats.score + "分");
            setTimeout(function () {
                console.log("redirecting ...");
            	bus.emit("toResultPage", stats);
	        }, 2000);
            
        });
        
        game.on("waitTimer", function (evt) {
        		var d0 = evt % 10;
        		var d1 = (evt - d0) / 10;
        		
            if(evt < 10) {
            	    $('#wait_count_down_d1').hide();
            } else {
            		$('#wait_count_down_d1').show();
            		$('#wait_count_down_d1').attr("src", "img/" + d1 + ".png");
            }
			$('#wait_count_down_d0').attr("src", "img/" + d0 + ".png");
        });
        
        game.on("timer", function (evt) {
            var timerText = '00:' + ('00' + Math.round(evt / 1000).toString()).substr(-2);
            $('#timer span').html(timerText);
        });

        //Register screen transitions
        game.on("screen", function (screenClass) {
            $('div.screen').hide();
            $('div.'+screenClass).show();
        });

        //Register button activation
        game.on("activate", function (btn) {
            $('#btn' + btn).addClass('active');
        });

        //Register button deactivation
        game.on("deactivate", function (btn) {
             $('#btn' + btn).removeClass('active');
        });

        game.on("updateScore", function (value) {
            console.log("updating score = " + value);
            var timerText = '' + value + '分';
            $('#score_bar span').html(timerText);
        });


        //Trigger message display
        game.on("staticMessage", function (msg) {
            $('div.message', 'div.game')
              .css('opacity', 1)
              .html(msg);
        });
        game.on("flashMessage", function (obj) {
            var displayTime = obj.duration || 600;
            $('div.message', 'div.game')
              .stop(true,true,true)
              .css('opacity', 1)
              .html(obj.message)
              .delay(displayTime)
              .fadeTo(400, 0)
        });
        
        this.on("toResultPage", function(stats){
            
            var url = "http://h5.edisonx.cn/h5game/getprize/core/core.php?";
            var url_params = "a=enter" + 
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
            "&score=" + stats['score'] +
            "&lat=" + stats['lat'] + "&lng=" + stats['lng'];

            // console.log (url + url_params);

            url += encodeURIComponent(url_params);

            // window.location.href = url;
		});
    }
    
}
