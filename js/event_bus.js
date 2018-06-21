var event_bus = function() {
    console.log("Event bus init!");
    var regEvts = {}
    return {

        on: function(evtName, callback){
            if (!regEvts.hasOwnProperty(evtName)) {
                regEvts[evtName] = [];
            }
            regEvts[evtName].push(callback)
        },

        emit: function(evtName, evtValue){
            if (regEvts.hasOwnProperty(evtName)) {
                try {
                    var obj = evtValue;
                    regEvts[evtName].forEach(function (callback) {
                        callback(obj);
                    });
                } catch (e) {
                    console.log("Callback failed", e);
                }
            }
        },
    }
}