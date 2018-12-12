var eventController = {
    newEvent: function(transactionName, notifiedOffices, assetId, cnAsset, blAsset, vesselPortCallAsset) {
        var factory = getFactory()
        var event = factory.newEvent(uri,"BusinessEvent")
        event.transactionName = transactionName
        event.notifiedOffices = notifiedOffices
        event.assetId = assetId
        event.cnAsset = cnAsset
        event.blAsset = blAsset
        event.vesselPortCallAsset = vesselPortCallAsset
        return event
    },

    emitEvent: function(event) {
        var seenOffices = {}
        var filteredOffices = notifiedOffices.filter(function(item) {
            if(!item) return false
            return seenOffices.hasOwnProperty(`${item}`) ? false : (seenOffices[`${item}`] = true)
        })
        filteredOffices.array.forEach(element => { 
            
        });
        emit(event)
    }
}