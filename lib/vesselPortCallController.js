/*
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

var uri = "net.gesport"
var vesselPortCallUri = "net.gesport.VesselPortCall"

/**
 * Controller class for VesselPortCall assets
 */
var vesselPortCallController = {

    /** 
     * Method to add a VesselPortCall asset from a vessel port call transaction
     * @param {VesselPortCallTransaction} vesselPortCall -The vessel port call transaction
     */
    add: async function(vesselPortCall) {
        let vesselPortCallRegistry = await getAssetRegistry(vesselPortCallUri)
        let currentParticipant = getCurrentParticipant()
        let vesselAgent = await partyController.updateParty(vesselPortCall.vesselAgent)
        //Current participant shall be the shipping agent or the PCS
        if(!partyController.isPCS(currentParticipant) && currentParticipant.officeId != vesselAgent.officeId) 
            throw new Error("The vesselPortCall shall be declared by the vesselAgent")
        //portCallId is the concatenation of portCallNumber@portOfCall.code
        var portCallId = `${vesselPortCall.portCallNumber}@${vesselPortCall.portOfCall.code}`
        var exist = await vesselPortCallRegistry.exists(portCallId)
        if(exist) {
            var vesselPortCallAsset = await vesselPortCallRegistry.get(portCallId)
            if(vesselPortCallAsset.vesselAgent.officeId != vesselAgent.officeId)
                throw new Error(`The vessel agent of the vesselPortCall is not ${vesselAgent.officeId}`)
            switch(vesselPortCallAsset.status) {
                case "CANCELLED":
                    break;
                default:
                    throw new Error ('The VesselPortCall asset cannot be created because it already exists')  
            }  
            //Mapping of the properties from the transaction towards the asset
            Object.assign(vesselPortCallAsset, {
                status: "REGISTERED",
                portCallNumber: vesselPortCall.portCallNumber,
                summaryDeclarationNumber: vesselPortCall.summaryDeclarationNumber,
                portOfCall: vesselPortCall.portOfCall,
                nextPortOfCall: vesselPortCall.nextPortOfCall,
                countryOfEntry: vesselPortCall.countryOfEntry,
                eta: vesselPortCall.eta,
                vesselAgent: vesselPortCall.vesselAgent,
                arrivalVoyageNumber: vesselPortCall.arrivalVoyageNumber,
                vessel: vesselPortCall.vessel,
                flag: vesselPortCall.flag,
                dischargePortReferences: vesselPortCall.dischargePortReferences
            })
            await vesselPortCallRegistry.update(vesselPortCallAsset)
        } else {
            //If the asset does not exist then create a new asset
            var factory = getFactory()
            var vesselPortCallAsset = factory.newResource(uri, "VesselPortCall", portCallId);
            //Mapping of the properties from the transaction towards the asset
            Object.assign(vesselPortCallAsset, {
                version: "1",
                status: "REGISTERED",
                portCallNumber: vesselPortCall.portCallNumber,
                summaryDeclarationNumber: vesselPortCall.summaryDeclarationNumber,
                portOfCall: vesselPortCall.portOfCall,
                nextPortOfCall: vesselPortCall.nextPortOfCall,
                countryOfEntry: vesselPortCall.countryOfEntry,
                eta: vesselPortCall.eta,
                vesselAgent: vesselPortCall.vesselAgent,
                arrivalVoyageNumber: vesselPortCall.arrivalVoyageNumber,
                vessel: vesselPortCall.vessel,
                flag: vesselPortCall.flag,
                dischargePortReferences: vesselPortCall.dischargePortReferences
            })
            await vesselPortCallRegistry.add(vesselPortCallAsset)
        }
        //Generate and submit the event
        var event = await eventController.vesselPortCallEvent("DECLARATION", "CREATE", vesselPortCallAsset.portCallId,
                        [vesselPortCallAsset.vesselAgent])
        return vesselPortCallAsset
    },
      
    /** 
     * Method to change a VesselPortCall asset from a vessel port call transaction
     * @param {VesselPortCallTransaction} vesselPortCall -The vessel port call transaction
     */
    change: async function(vesselPortCall) {
        let vesselPortCallRegistry = await getAssetRegistry(vesselPortCallUri)
        let currentParticipant = getCurrentParticipant()
        //portCallId is the concatenation of portCallNumber@portOfCall.code
        var portCallId = `${vesselPortCall.portCallNumber}@${vesselPortCall.portOfCall.code}`
        var exist = await vesselPortCallRegistry.exists(portCallId)
        if(exist) {
            let vesselPortCallAsset = await vesselPortCallRegistry.get(portCallId)
            //Current participant shall be the vessel agent or the PCS
            if(!partyController.isPCS(currentParticipant) && vesselPortCallAsset.vesselAgent.officeId != currentParticipant.officeId)
                throw new Error(`The vessel agent of the vesselPortCall is not ${currentParticipant.officeId}`)
            switch(vesselPortCallAsset.status) {
                case "REGISTERED":
                case "ARRIVED":
                  break
                default:
                    throw new Error (`The VesselPortCall asset cannot be updated because it is in ${vesselPortCallAsset.status} status`)  
            }
            //Mapping of the properties from the transaction towards the asset
            Object.assign(vesselPortCallAsset, {
                status: "REGISTERED",
                nextPortOfCall: vesselPortCall.nextPortOfCall,
                countryOfEntry: vesselPortCall.countryOfEntry,
                eta: vesselPortCall.eta,
                arrivalVoyageNumber: vesselPortCall.arrivalVoyageNumber,
                vessel: vesselPortCall.vessel,
                flag: vesselPortCall.flag,
                dischargePortReferences: vesselPortCall.dischargePortReferences
              })
              await vesselPortCallRegistry.update(vesselPortCallAsset)
              //Generate and submit the event
              var event = await eventController.vesselPortCallEvent("DECLARATION", "CHANGE", vesselPortCallAsset.portCallId,
                              [vesselPortCallAsset.vesselAgent])
              return vesselPortCallAsset
          }      
        else {
            throw new Error ('The VesselPortCall asset cannot be updated because it does not exist')  
        }
    },

    /** 
     * Method to cancel a VesselPortCall asset from a vessel port call transaction
     * @param {VesselPortCallTransaction} vesselPortCall -The vessel port call transaction
     */
    cancel: async function(vesselPortCall) {
        let vesselPortCallRegistry = await getAssetRegistry(vesselPortCallUri)
        let currentParticipant = getCurrentParticipant()
        //portCallId is the concatenation of portCallNumber@portOfCall.code
        var portCallId = `${vesselPortCall.portCallNumber}@${vesselPortCall.portOfCall.code}`
        var exist = await vesselPortCallRegistry.exists(portCallId)
        if(exist) {
            let vesselPortCallAsset = await vesselPortCallRegistry.get(portCallId)
            //Current participant shall be the vessel agent or the PCS
            if(!partyController.isPCS(currentParticipant) && vesselPortCallAsset.vesselAgent.officeId != currentParticipant.officeId)
                throw new Error(`The vessel agent of the vesselPortCall is not ${currentParticipant.officeId}`)
            switch(vesselPortCallAsset.status) {
                case "REGISTERED":
                  break
                default:
                    throw new Error (`The VesselPortCall asset cannot be cancelled because it is in ${vesselPortCallAsset.status} status`)  
            }
            //Mapping of the properties from the transaction towards the asset
            Object.assign(vesselPortCallAsset, {
                status: "CANCELLED",
            })
            await vesselPortCallRegistry.update(vesselPortCallAsset)
            //Generate and submit the event
            var event = await eventController.vesselPortCallEvent("DECLARATION", "CANCEL", vesselPortCallAsset.portCallId,
                            [vesselPortCallAsset.vesselAgent])
            return vesselPortCallAsset
        }     
        else {
            throw new Error ('The VesselPortCall asset cannot be cancelled because it does not exist')  
        }
    },

    /**
     * Method to notify that a vessel arrived
     * The Port Authority or the PCS are entitled to notify the vessel arrival
     * @param {String} portCallId -The vessel port call id (portCallNumber@portOfCall.code
     * @param {DateTime} arrivalTime -The time of arrival of the vessel
     */
    vesselArrived: async function(portCallId, arrivalTime) {
        let vesselPortCallRegistry = await getAssetRegistry(vesselPortCallUri)
        let currentParticipant = getCurrentParticipant()
        //Current participant shall be the shipping agent or the PCS
        if(!partyController.isPCS(currentParticipant) && !partyController.isPortAuthority(currentParticipant))
            throw new Error("The vessel arrival shall be informed by the Port Authority")
        var exist = await vesselPortCallRegistry.exists(portCallId)
        if(exist) {
            let vesselPortCallAsset = await vesselPortCallRegistry.get(portCallId)
            switch(vesselPortCallAsset.status) {
              case "REGISTERED":
              case "ARRIVED":
                    vesselPortCallAsset.status = "ARRIVED"
                    vesselPortCallAsset.activationTime = arrivalTime
                    vesselPortCallAsset.arrivalTime = arrivalTime
                  break
                default:
                    throw new Error (`The VesselPortCall asset cannot be updated because it is in ${vesselPortCallAsset.status} status`)
            }
              vesselPortCallRegistry.update(vesselPortCallAsset)
              //Generate and submit the event
              var event = await eventController.vesselPortCallEvent("NOTIFICATION", "ARRIVAL", vesselPortCallAsset.portCallId,
                              [vesselPortCallAsset.vesselAgent])
              return vesselPortCallAsset
          }
        else {
            throw new Error ('The VesselPortCall asset cannot be updated because it does not exist')
        }
    },

    /** 
     * Method to get a VesselPortCall asset from a portCallId
     * @param {String} portCallId -The vessel port call id
     * @param {Office} participant -The participant that requests the asset
     * @returns {VesselPortCall} -The vessel port call asset with the data that the participant can access
     */
    get: async function(portCallId, participant) {
        let vesselPortCallRegistry = await getAssetRegistry(vesselPortCallUri)
        let vesselPortCallAsset = await vesselPortCallRegistry.get(portCallId)
        return vesselPortCallAsset
    },
  
   /** 
     * Method to register/update a shipping agent's summary declaration of a vessel port call when adding BillOfLading assets
     * We register a summary declaration for each shippingAgent of the VesselPortCall 
     * @param {ShippingAgentDeclaration} declaration -The shipping agent declaration to add BillOfLading assets
     * @param {String[]} blIds -Array of  blIds to add in the summary declaration (this is used in addGoodsItems transaction)
     */
    addBls: async function(declaration, blIds) {
        let vesselPortCallRegistry = await getAssetRegistry(vesselPortCallUri) 
        let currentParticipant = getCurrentParticipant()
        let shippingAgent = await partyController.updateParty(declaration.shippingAgent)
        //Current participant shall be the shipping agent or the PCS
        if(!partyController.isPCS(currentParticipant) && currentParticipant.officeId != shippingAgent.officeId) 
            throw new Error("The Bls shall be declared by the shippingAgent")
        var exist = await vesselPortCallRegistry.exists(declaration.portCallId)
        if(exist) {
            let vesselPortCallAsset = await vesselPortCallRegistry.get(declaration.portCallId)
            switch(vesselPortCallAsset.status) {
                case "REGISTERED":
                case "ARRIVED":
                    //We prepare the Summary Declaration
                    let factory = getFactory()
                    let summaryDeclaration = factory.newConcept(uri,"SummaryDeclaration")
                    Object.assign(summaryDeclaration,  
                        {
                            summaryDeclarationNumber: declaration.summaryDeclarationNumber,
                            shippingAgent: declaration.shippingAgent,
                            registrationTime: declaration.registrationTime,
                            dischargePortReferences: declaration.dischargePortReferences,
                            blIds: declaration.bls.map((bl) => {
                                return `${bl.blNumber}@${bl.carrier.organization.code}`
                            })
                    })
                    //In the case blIds are indicated we include only these blIds
                    if(blIds && blIds.length>0) {
                       summaryDeclaration.blIds = blIds 
                    }
                    if(!vesselPortCallAsset.declarations) {
                        //If there is not any declaration we add the declaration
                        Object.assign(vesselPortCallAsset, {
                            declarations: [summaryDeclaration]
                        })
                    } else {
                        //We check if there is an already registered declaration
                        let registeredDeclaration = vesselPortCallAsset.declarations.find((registeredDeclaration) => {
                            return registeredDeclaration.shippingAgent.organization.code == summaryDeclaration.shippingAgent.organization.code
                        })
                        if(!registeredDeclaration) {
                            //If the declaration is not registered we add it
                            vesselPortCallAsset.declarations.push(summaryDeclaration)
                        } else {
                            //Filter declarations to not repeat them
                          	registeredDeclaration.blIds = registeredDeclaration.blIds.filter(blId => {
                              return !summaryDeclaration.blIds.includes(blId)
                          	})
                            //If the declaration is registered we update it and concat the added BillOfLading ids.
                            Object.assign(registeredDeclaration, {
                                registrationTime: summaryDeclaration.registrationTime,
                                dischargePortReferences: summaryDeclaration.dischargePortReferences,
                                blIds: summaryDeclaration.blIds.concat(registeredDeclaration.blIds)
                            })
                        }
                    }
                    await vesselPortCallRegistry.update(vesselPortCallAsset)
                    //Generate and submit the event
                    var event = await eventController.vesselPortCallEvent("DECLARATION", "UPDATE", vesselPortCallAsset.portCallId,
                                    [vesselPortCallAsset.vesselAgent])
                    return vesselPortCallAsset
                default:
                    throw new Error (`The VesselPortCall asset cannot be updated because it is in ${vesselPortCallAsset.status} status`)  
            }
          }      
        else {
            throw new Error ('The VesselPortCall asset cannot be updated because it does not exist')  
        }
    },

    /** 
     * Method to update a shipping agent's summary declaration of a vessel port call when updating BillOfLading assets
     * We register a summary declaration for each shippingAgent of the VesselPortCall 
     * @param {ShippingAgentDeclaration} declaration -The shipping agent declaration transaction to update BillOfLading assets
     */
    changeBls: async function(declaration) {
        let vesselPortCallRegistry = await getAssetRegistry(vesselPortCallUri) 
        let currentParticipant = getCurrentParticipant()
        let shippingAgent = await partyController.updateParty(declaration.shippingAgent)
        //Current participant shall be the shipping agent or the PCS
        if(!partyController.isPCS(currentParticipant) && currentParticipant.officeId !=  shippingAgent.officeId) 
            throw new Error("The Bls shall be declared by the shippingAgent")
        var exist = await vesselPortCallRegistry.exists(declaration.portCallId)
        if(exist) {
            let vesselPortCallAsset = await vesselPortCallRegistry.get(declaration.portCallId)
            switch(vesselPortCallAsset.status) {
                case "REGISTERED":
                case "ARRIVED":
                    //We prepare the Summary Declaration
                    //The summary declaration shall exist and the Bill of Lading ids do not need to be updated
                    let summaryDeclaration = {
                        shippingAgent: declaration.shippingAgent,
                        registrationTime: declaration.registrationTime,
                        dischargePortReferences: declaration.dischargePortReferences,
                    }
                    if(vesselPortCallAsset.declarations==null) {
                        throw new Error('A summary declaration of the shipping agent shall exist to update the BillOfLading assets')
                    } else {
                        //We check if there is an already registered declaration
                        registeredDeclaration = vesselPortCallAsset.declarations.find((registeredDeclaration) => {
                            return registeredDeclaration.shippingAgent.organization.code == declaration.shippingAgent.organization.code
                        })
                        if(registeredDeclaration == null) {
                            throw new Error('A summary declaration of the shipping agent shall exist to update the BillOfLading assets')
                        } else {
                            //If the declaration is registered we update it. No need to change bls id
                            Object.assign(registeredDeclaration, {
                                registrationTime: summaryDeclaration.registrationTime || registeredDeclaration.registrationTime,
                                dischargePortReferences: summaryDeclaration.dischargePortReferences  || registeredDeclaration.dischargePortReferences
                            })
                        }
                    }
                    await vesselPortCallRegistry.update(vesselPortCallAsset)
                    //Generate and submit the event
                    var event = await eventController.vesselPortCallEvent("DECLARATION", "UPDATE", vesselPortCallAsset.portCallId,
                                    [vesselPortCallAsset.vesselAgent])
                    return vesselPortCallAsset
                default:
                    throw new Error (`The VesselPortCall asset cannot be updated because it is in ${vesselPortCallAsset.status} status`)  
            }
          }      
        else {
            throw new Error ('The VesselPortCall asset cannot be updated because it does not exist')  
        }
    },

    /** 
     * Method to register/update a shipping agent's summary declaration of a vessel port call when removing BillOfLading assets
     * We register a summary declaration for each shippingAgent of the VesselPortCall 
     * @param {ShippingAgentDeclaration} declaration -The shipping agent declaration transaction to remove BillOfLading assets
     * @param {String[]} blIds -Array of additional blIds to remove in the summary declaration (this is used in remove goods items transaction)
     */
    removeBls: async function(declaration, blIds) {
        let vesselPortCallRegistry = await getAssetRegistry(vesselPortCallUri) 
        let currentParticipant = getCurrentParticipant()
        let shippingAgent = await partyController.updateParty(declaration.shippingAgent)
        //Current participant shall be the shipping agent or the PCS
        if(!partyController.isPCS(currentParticipant) && currentParticipant.officeId != shippingAgent.officeId) 
            throw new Error("The Bls shall be declared by the shippingAgent")
        var exist = await vesselPortCallRegistry.exists(declaration.portCallId)
        if(exist) {
            let vesselPortCallAsset = await vesselPortCallRegistry.get(declaration.portCallId)
            switch(vesselPortCallAsset.status) {
                case "REGISTERED":
                case "ARRIVED":
                    //We prepare the Summary Declaration
                    let summaryDeclaration = {
                        shippingAgent: declaration.shippingAgent,
                        registrationTime: declaration.registrationTime,
                        dischargePortReferences: declaration.dischargePortReferences,
                        blIds: declaration.bls.map((bl) => {
                            return `${bl.blNumber}@${bl.carrier.organization.code}`
                        })
                    }
                    //In the case blIds are indicated we include only these blIds
                    if(blIds && blIds.length>0) {
                       summaryDeclaration.blIds = blIds 
                    }
                    if(!vesselPortCallAsset.declarations) {
                        throw new Error('A summary declaration of the shipping agent shall exist to update the BillOfLading assets')
                    } else {
                        //We check if there is an already registered declaration
                        registeredDeclaration = vesselPortCallAsset.declarations.find((registeredDeclaration) => {
                            return registeredDeclaration.shippingAgent.organization.code == summaryDeclaration.shippingAgent.organization.code
                        })
                        if(!registeredDeclaration) {
                            throw new Error('A summary declaration of the shipping agent shall exist to update the BillOfLading assets')
                        } else {
                            let updatedBlIds = registeredDeclaration.blIds.filter((blId) => {
                                //Si coincide un blId se elimina del array
                                return !summaryDeclaration.blIds.includes(blId)
                            })
                            //If the declaration is registered we update it and concat the added BillOfLading ids.
                            Object.assign(registeredDeclaration, {
                                registrationTime: summaryDeclaration.registrationTime || registeredDeclaration.registrationTime,
                                dischargePortReferences: summaryDeclaration.dischargePortReferences  || registeredDeclaration.dischargePortReferences,
                                blIds: updatedBlIds
                            })  
                        }
                    }
                    await vesselPortCallRegistry.update(vesselPortCallAsset)
                    var factory = getFactory()
                    //Generate and submit the event
                    var event = await eventController.vesselPortCallEvent("DECLARATION", "UPDATE", vesselPortCallAsset.portCallId,
                                    [vesselPortCallAsset.vesselAgent])
                    return vesselPortCallAsset
                default:
                    throw new Error (`The VesselPortCall asset cannot be updated because it is in ${vesselPortCallAsset.status} status`)  
            }
          }      
        else {
            throw new Error ('The VesselPortCall asset cannot be removed because it does not exist')  
        }
    }

}
  