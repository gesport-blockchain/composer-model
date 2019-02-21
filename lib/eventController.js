var eventController = {
    vesselPortCallEvent: function(eventType, eventFunction, vesselPortCallId, parties) {
        var factory = getFactory()
        var event = factory.newEvent(uri,"BusinessEvent")
        event.eventType = eventType
        event.eventFunction = eventFunction
        event.eventName = "VesselPortCall"
        event.mainAssetId = vesselPortCallId
        event.vesselPortCallId = vesselPortCallId
        event.officeIds = this.filterOffices(parties)
        this.emitEvent(event)
        return event
    },

    billOfLadingEvent: function(eventType, eventFunction, blId, parties, vesselPortCallId) {
        var factory = getFactory()
        var event = factory.newEvent(uri,"BusinessEvent")
        event.eventType = eventType
        event.eventFunction = eventFunction
        event.eventName = "BillOfLading"
        event.mainAssetId = blId
      	event.blId = blId
        event.vesselPortCallId = vesselPortCallId
        event.officeIds = this.filterOffices(parties)
        this.emitEvent(event)
        return event
    },

    containerEvent: function(eventType, eventFunction, cnId, parties, blId, vesselPortCallId) {
        var factory = getFactory()
        var event = factory.newEvent(uri,"BusinessEvent")
        event.eventType = eventType
        event.eventFunction = eventFunction
        event.eventName = "Container"
        event.mainAssetId = cnId
      	event.cnId = cnId
      	event.blId = blId
        event.vesselPortCallId = vesselPortCallId
        event.officeIds = this.filterOffices(parties)
        this.emitEvent(event)
        return event
    },
  
    paymentEvent: function(eventType, eventFunction, paymentId, parties) {
        var factory = getFactory()
        var event = factory.newEvent(uri,"BusinessEvent")
        event.eventType = eventType
        event.eventFunction = eventFunction
        event.eventName = "Payment"
        event.mainAssetId = paymentId
      	event.paymentId = paymentId
        event.officeIds = this.filterOffices(parties)
        this.emitEvent(event)
        return event
    },

    filterOffices: function(parties) {
        var seenOffices = {}
        return parties.filter(function(party) {
            if(!party) return false
            if(!party.officeId) return false
            return seenOffices.hasOwnProperty(`${party.officeId}`) ? false : (seenOffices[`${party.officeId}`] = true)
        }).map(party => party.officeId)
    },
 
    emitEvent: function(event) {
        emit(event)
    }
}