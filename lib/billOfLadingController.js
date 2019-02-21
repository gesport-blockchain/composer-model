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
var blUri = "net.gesport.BillOfLading"
var cnUri = "net.gesport.Container"

/**
 * Controller class for BillOfLading assets
 */
var billOfLadingController = {

    /** 
     * Method to add a BillOfLading asset from a bill of lading declaration
     * This method can only be called by the shipping agent of the carrier or the PCS 
     * @param {BillOfLadingDeclaration} bl -The bill of lading declaration
     * @param {String} portCallId -The port call id of the VesselPortCall asset
     * @param {String} summaryDeclarationNumber -The summary declaration for temporary storage number
     * @param {Party} shippingAgent -The shipping agent presenting the summary declaration
     * @returns {BillOfLading} -The bill of lading asset
     */
    add: async function(bl, portCallId, summaryDeclarationNumber, shippingAgent) {
        let billOfLadingRegistry = await getAssetRegistry(blUri)
        let terminalOperator = await partyController.updateParty(bl.dischargeTerminalOperator)
        let carrier = await partyController.updateParty(bl.carrier)
        let currentParticipant = getCurrentParticipant()
        if(!partyController.isPCS(currentParticipant) && currentParticipant.officeId != shippingAgent.officeId)
            throw new Error(`Only the shipping agency can add the B/L ${arrivalNotice.blId}`)
        //Check in the agency is agent of the carrier of the B/L
        if(!await partyController.isAgentOf(shippingAgent, bl.carrier)) {
            throw new Error (`The BillOfLading asset ${blId} cannot be created because the agency is not agent of the carrier`)  
        }
        //blId is the concatenation of blNumber@carrier.organization.code
        var blId = `${bl.blNumber}@${bl.carrier.organization.code}`
        var exist = await billOfLadingRegistry.exists(blId)
        if(exist) {
            throw new Error (`The BillOfLading asset ${blId} cannot be created because it already exists`)  
        } else {
            //If the asset does not exist then create a new asset
            var factory = getFactory()
            var blAsset = factory.newResource(uri, "BillOfLading", blId);
            //Mapping of the properties from the transaction towards the asset
            Object.assign(blAsset, {
              	version: "1",
                status: "REGISTERED",
                blNumber: bl.blNumber,
                carrier: bl.carrier,
                shippingAgent: shippingAgent,
                dischargeShippingAgent: shippingAgent,
                vessel: bl.vessel,
                flag: bl.flag,
                voyageNumber: bl.voyageNumber,
                portCallId: portCallId,
                summaryDeclarationNumber: summaryDeclarationNumber,
                placeOfOrigin: bl.placeOfOrigin,
                portOfLoading: bl.portOfLoading,
                portOfTranshipment: bl.portOfTranshipment,
                portOfDischarge: bl.portOfDischarge,
                placeOfDelivery: bl.placeOfDelivery,
                countryOfEntry: bl.countryOfEntry,
                subsequentTransportMode: bl.subsequentTransportMode,
                dischargePortReferences: bl.dischargePortReferences,
                goodsItems: bl.goodsItems,
                containerNumbers:  bl.containers.map((cn) => {
                    return `${cn.containerNumber}`
                })
            })
            await billOfLadingRegistry.add(blAsset)
            for(cn of bl.containers)
            {
                let cnAsset = await containerController.register(cn, bl, blAsset)
            }
            var event = await eventController.billOfLadingEvent("DECLARATION", "CREATE", blAsset.blId,
                               [blAsset.dischargeShippingAgent, blAsset.carrier, 
                                blAsset.consignee, blAsset.blHolder], 
                                blAsset.portCallId)
            return blAsset
        }
    },
      
    /** 
     * Method to change a BillOfLading asset from a bill of lading declaration
     * This method can only be called by the shipping agent or the PCS 
     * @param {BillOfLadingDeclaration} bl -The bill of lading declaration
     * @param {String} portCallId -The port call id of the VesselPortCall asset
     * @param {String} summaryDeclarationNumber -The summary declaration for temporary storage number
     * @param {Party} shippingAgent -The shipping agent presenting the summary declaration
     * @returns {BillOfLading} -The bill of lading asset
     */
    change: async function(bl, portCallId, summaryDeclarationNumber, shippingAgent) {
        let billOfLadingRegistry = await getAssetRegistry(blUri)
        shippingAgent = await partyController.updateParty(shippingAgent)
        let terminalOperator = await partyController.updateParty(bl.dischargeTerminalOperator)
        let carrier = await partyController.updateParty(bl.carrier)
        //blId is the concatenation of blNumber@carrier.organization.code
        var blId = `${bl.blNumber}@${bl.carrier.organization.code}`
        var exist = await billOfLadingRegistry.exists(blId)
        if(exist) {
            let blAsset = await billOfLadingRegistry.get(blId)
            let currentParticipant = getCurrentParticipant()            
            if(!partyController.isPCS(currentParticipant) && currentParticipant.officeId != blAsset.shippingAgent.officeId)
                throw new Error(`Only the shipping agency can change the B/L ${bl.blId}`)
            switch(blAsset.status) {
                case "REGISTERED":
                case "RELEASED":
                    let cnNumbers= bl.containers.map((cn) => {
                        return `${cn.containerNumber}`
                    })
                    let cnToRemove = blAsset.containerNumbers.filter((cnNumber) => {
                        //Si coincide un cnNumber se elimina del array
                        return !cnNumbers.includes(cnNumber)
                    })
                    //Mapping of the properties from the transaction towards the asset
                    Object.assign(blAsset, {
		                shippingAgent: shippingAgent,
        		        dischargeShippingAgent: shippingAgent,
                		vessel: bl.vessel,
		                flag: bl.flag,
		                voyageNumber: bl.voyageNumber,
		                portCallId: portCallId,
        		        summaryDeclarationNumber: summaryDeclarationNumber,
                        placeOfOrigin: bl.placeOfOrigin,
                        portOfLoading: bl.portOfLoading,
                        portOfDischarge: bl.portOfDischarge,
                        portOfTranshipment: bl.portOfTranshipment,
                        placeOfDelivery: bl.placeOfDelivery,
                        countryOfEntry: bl.countryOfEntry,
                        subsequentTransportMode: bl.subsequentTransportMode,
                        dischargePortReferences: bl.dischargePortReferences,
                        goodsItems: bl.goodsItems,
                        containerNumbers: cnNumbers
                    })
                    await billOfLadingRegistry.update(blAsset)
                    for(cn of bl.containers) {
                        let cnAsset = await containerController.register(cn, bl, blAsset)
                    }
                    for(cnNumber of cnToRemove) {
                        let cnAsset = await containerController.remove(cnNumber, blAsset)
                    }
                    var event = await eventController.billOfLadingEvent("DECLARATION", "CHANGE", blAsset.blId,
                                       [blAsset.dischargeShippingAgent, blAsset.carrier, 
                                        blAsset.consignee, blAsset.blHolder], 
                                        blAsset.portCallId)
                    return blAsset
                default:
                    throw new Error (`The BillOfLading asset ${blId} cannot be updated because it is in ${blAsset.status} status`)
            }
        } else {
            throw new Error (`The BillOfLading ${blId} asset cannot be updated because it does not exist`)  
        }
    },

    /** 
     * Method to remove a BillOfLading asset from a bill of lading declaration
     * This method can only be called by the shipping agent or the PCS 
     * @param {BillOfLadingDeclaration} bl The bill of lading declaration
     * @returns {BillOfLading} -The bill of lading asset
     */
    remove: async function(bl) {
        let billOfLadingRegistry = await getAssetRegistry(blUri)
        let shippingAgent = await partyController.updateParty(bl.shippingAgent)
        let terminalOperator = await partyController.updateParty(bl.dischargeTerminalOperator)
        let carrier = await partyController.updateParty(bl.carrier)
        //blId is the concatenation of blNumber@carrier.organization.code
        var blId = `${bl.blNumber}@${bl.carrier.organization.code}`
        var exist = await billOfLadingRegistry.exists(blId)
        if(exist) {
            let blAsset = await billOfLadingRegistry.get(blId)
            let currentParticipant = getCurrentParticipant()            
            if(!partyController.isPCS(currentParticipant) && currentParticipant.officeId != blAsset.shippingAgent.officeId)
                throw new Error(`Only the shipping agency can remove the B/L ${bl.blId}`)
            switch(blAsset.status) {
                case "REGISTERED":
                    await billOfLadingRegistry.remove(blAsset)
                    for(cnNumber of blAsset.containerNumbers) {
                        let cnAsset = await containerController.remove(cnNumber, blAsset)
                    }
                  var event = await eventController.billOfLadingEvent("DECLARATION", "CANCEL", blAsset.blId,
                                     [blAsset.dischargeShippingAgent, blAsset.carrier, 
                                      blAsset.consignee, blAsset.blHolder], 
                                      blAsset.portCallId)
                    return blAsset
                default:
                    throw new Error (`The BillOfLading ${blId} asset cannot be removed because it is in ${blAsset.status} status`)  
            }
        } else {
            throw new Error (`The BillOfLading ${blId} asset cannot be removed because it does not exist`)  
        }
    },


    /** 
     * Method to add goods items in a BillOfLading asset from a bill of lading declaration
     * This method can only be called by the shipping agent or the PCS 
     * If the goods items are included in an existing b/l asset, then only the blNumber, shipping agent and carrier shall be included.
     * In the case the goods items are included in a new b/l asset, then the b/l will be created and all b/l data is required (it will be like adding a new b/l)
     * @param {BillOfLadingDeclaration} bl -The bill of lading declaration
     * @param {String} portCallId -The port call id of the VesselPortCall asset
     * @param {String} summaryDeclarationNumber -The summary declaration for temporary storage number
     * @param {Party} shippingAgent -The shipping agent presenting the summary declaration     
     * @returns {BillOfLading} -The bill of lading asset
     */
    addGoodsItems: async function(bl, portCallId, summaryDeclarationNumber, shippingAgent) {
        let billOfLadingRegistry = await getAssetRegistry(blUri)
        shippingAgent = await partyController.updateParty(shippingAgent)
        let carrier = await partyController.updateParty(bl.carrier)
        //blId is the concatenation of blNumber@carrier.organization.code
        var blId = `${bl.blNumber}@${bl.carrier.organization.code}`
        var exist = await billOfLadingRegistry.exists(blId)
        if(exist) {
            let blAsset = await billOfLadingRegistry.get(blId)
            let currentParticipant = getCurrentParticipant()            
            if(!partyController.isPCS(currentParticipant) && currentParticipant.officeId != blAsset.shippingAgent.officeId)
                throw new Error(`Only the shipping agency can change the B/L ${bl.blId}`)
            switch(blAsset.status) {
                case "REGISTERED":
                case "RELEASED":
                    //Check that the goods items are new
                    let itemNumbers= bl.goodsItems.map(item => item.goodsItemNumber)
                    blAsset.goodsItems.forEach(item => {
                      if(itemNumbers.find(itemNumber => itemNumber === item.goodsItemNumber))
                        throw new Error(`Goods item number ${item.goodsItemNumber} cannot be added because it already exists`)
                    })
                    //If they are new we add them
                	bl.goodsItems.forEach(item => blAsset.goodsItems.push(item))
                	//We calculate the containers to add
                    let cnNumbers= bl.containers.map(cn => cn.containerNumber)
                    let cnToAdd = cnNumbers.filter((cnNumber) => {
                        //Si coincide un cnNumber se elimina del array
                        return !blAsset.containerNumbers.find(containerNumber => containerNumber === cnNumber)
                    })
                    //Include the new container numbers in the b/l asset
                    cnToAdd.forEach(cnNumber => blAsset.containerNumbers.push(cnNumber))
                    await billOfLadingRegistry.update(blAsset)
                    for(cn of bl.containers) {
                        let cnAsset = await containerController.registerItems(cn, bl, blAsset)
                    }
                    var event = await eventController.billOfLadingEvent("DECLARATION", "CHANGE", blAsset.blId,
                                       [blAsset.dischargeShippingAgent, blAsset.carrier, 
                                        blAsset.consignee, blAsset.blHolder], 
                                        blAsset.portCallId)
                    return blAsset
                default:
                    throw new Error (`The BillOfLading asset ${blId} cannot be updated because it is in ${blAsset.status} status`)
            }
        } else {
          	blAsset = this.add(bl, portCallId, summaryDeclarationNumber, shippingAgent)
          	blAsset.status = "NEW"
          	return blAsset
        }
    },

    /** 
     * Method to change goods items in a BillOfLading asset from a bill of lading declaration
     * This method can only be called by the shipping agent or the PCS 
     * If the goods items are included in an existing b/l asset, then only the blNumber, shipping agent and carrier shall be included.
     * In the case the goods items are included in a new b/l asset, then the b/l will be created and all b/l data is required (it will be like adding a new b/l)
     * When changing goods items a container that becomes without any goods item will be removed
     * @param {BillOfLadingDeclaration} bl -The bill of lading declaration
     * @param {String} portCallId -The port call id of the VesselPortCall asset
     * @param {String} summaryDeclarationNumber -The summary declaration for temporary storage number
     * @param {Party} shippingAgent -The shipping agent presenting the summary declaration     
     * @returns {BillOfLading} -The bill of lading asset
     */
    changeGoodsItems: async function(bl, portCallId, summaryDeclarationNumber, shippingAgent) {
        let billOfLadingRegistry = await getAssetRegistry(blUri)
        shippingAgent = await partyController.updateParty(shippingAgent)
        let carrier = await partyController.updateParty(bl.carrier)
        //blId is the concatenation of blNumber@carrier.organization.code
        var blId = `${bl.blNumber}@${bl.carrier.organization.code}`
        var exist = await billOfLadingRegistry.exists(blId)
        if(exist) {
            let blAsset = await billOfLadingRegistry.get(blId)
            let currentParticipant = getCurrentParticipant()            
            if(!partyController.isPCS(currentParticipant) && currentParticipant.officeId != blAsset.shippingAgent.officeId)
                throw new Error(`Only the shipping agency can change the B/L ${bl.blId}`)
            switch(blAsset.status) {
                case "REGISTERED":
                case "RELEASED":
                    let itemNumbers= bl.goodsItems.map(item => item.goodsItemNumber)
                	//Check no new items are included
                    let newItems = itemNumbers.filter(itemNumber => !blAsset.goodsItems.find(item => itemNumber === item.goodsItemNumber))
                    if(newItems.length>0)
                      throw new Error('There are new items. If you want to add items use the add goods items transaction')
                    //Change the existing good Items
                    let changeItems = blAsset.goodsItems.filter(item => {
                      return itemNumbers.find(itemNumber => itemNumber === item.goodsItemNumber)
                    })
                    changeItems.forEach(changeItem => {
                      let index = blAsset.goodsItems.findIndex(item => {
                        	return item.goodsItemNumber == changeItem.goodsItemNumber
                      })
                      blAsset.goodsItems[index] = changeItem
                    })
                	//We calculate the containers to add
                    let cnNumbers= bl.containers.map(cn => cn.containerNumber)
                    //For the existing containers not reported, remove the items reported (if they exist)
                    let cnIdsToCheck = blAsset.containerNumbers.filter(containerNumber => {
                      return !cnNumbers.find(cnNumber => containerNumber === cnNumber)
                    }).map(cnNumber => `${cnNumber}@${blId}`) 
                    //If they are included remove this items
                    for(cnId of cnIdsToCheck) {
					  let cnToCheck = await containerController.get(cnId)
                      if(cnToCheck) {
                         let itemsToRemove = cnToCheck.goodsItems.filter(item => {
                           return itemNumbers.find(itemNumber => itemNumber === item.goodsItemNumber)
                         })
                         if(itemsToRemove.length > 0) {
	                         cnToCheck.goodsItems = itemsToRemove
    	                     let cnAsset = await containerController.removeItems(cnToCheck, bl, blAsset)
        	                 //If the container is removed we exclude it from the list
            	             if(cnAsset.status==="CANCELLED") {
                	           let index = blAsset.containerNumbers.findIndex(cnNumber => cnNumber === cnAsset.containerNumber)
                    	       blAsset.containerNumbers.splice(index,1)
                        	 }
                         }
                      }
                    }
                    let cnToAdd = cnNumbers.filter((cnNumber) => {
                        //Si coincide un cnNumber se elimina del array
                        return !blAsset.containerNumbers.find(containerNumber => containerNumber === cnNumber)
                    })
                    //Include the new container numbers in the b/l asset
                    cnToAdd.forEach(cn => blAsset.containerNumbers.push(cn))
                	//We update all the container assets with the items reported
                    for(cn of bl.containers) {
                        let cnAsset = await containerController.registerItems(cn, bl, blAsset)
                    }
                    await billOfLadingRegistry.update(blAsset)
                    var event = await eventController.billOfLadingEvent("DECLARATION", "CHANGE", blAsset.blId,
                                       [blAsset.dischargeShippingAgent, blAsset.carrier, 
                                        blAsset.consignee, blAsset.blHolder], 
                                        blAsset.portCallId)
                    return blAsset
                default:
                    throw new Error (`The BillOfLading asset ${blId} cannot be updated because it is in ${blAsset.status} status`)
            }
        } else {
            throw new Error (`The BillOfLading ${blId} asset cannot be updated because it does not exist`)  
        }
    },

    /**
     * Method to remove goods items in a BillOfLading asset from a bill of lading declaration
     * This method can only be called by the shipping agent or the PCS 
     * When removing goods items a bill of lading that becomes without any goods item will be removed
     * When removing goods items a container that becomes without any goods item will be removed
     * @param {BillOfLadingDeclaration} bl -The bill of lading declaration
     * @param {String} portCallId -The port call id of the VesselPortCall asset
     * @param {String} summaryDeclarationNumber -The summary declaration for temporary storage number
     * @param {Party} shippingAgent -The shipping agent presenting the summary declaration     
     * @returns {BillOfLading} -The bill of lading asset
     */
    removeGoodsItems: async function(bl, portCallId, summaryDeclarationNumber, shippingAgent) {
        let billOfLadingRegistry = await getAssetRegistry(blUri)
        shippingAgent = await partyController.updateParty(shippingAgent)
        let carrier = await partyController.updateParty(bl.carrier)
        //blId is the concatenation of blNumber@carrier.organization.code
        var blId = `${bl.blNumber}@${bl.carrier.organization.code}`
        var exist = await billOfLadingRegistry.exists(blId)
        if(exist) {
            let blAsset = await billOfLadingRegistry.get(blId)
            let currentParticipant = getCurrentParticipant()            
            if(!partyController.isPCS(currentParticipant) && currentParticipant.officeId != blAsset.shippingAgent.officeId)
                throw new Error(`Only the shipping agency can change the B/L ${bl.blId}`)
            switch(blAsset.status) {
                case "REGISTERED":
                case "RELEASED":
                    let itemNumbers= bl.goodsItems.map(item => item.goodsItemNumber)
                    //The items after removing the indicated in the function
                    let items = blAsset.goodsItems.filter(item => !itemNumbers.find(itemNumber => itemNumber === item.goodsItemNumber))
                    blAsset.goodsItems = items
                    let cnNumbersToRemove= bl.containers.map(cn => cn.containerNumber)
                	//Remove the items from the container assets
                    for(cn of bl.containers) {
                        let cnAsset = await containerController.removeItems(cn, bl, blAsset)
                        //If the container is removed we exclude it from the list
                        if(cnAsset.status === "CANCELLED") {
                          let index = blAsset.containerNumbers.findIndex(cnNumber => cnNumber === cnAsset.containerNumber)
                          blAsset.containerNumbers.splice(index,1)
                        }
                    }
                    //In the other containers, check that the item to change was not previously included
                    let cnIdsToCheck = blAsset.containerNumbers.filter(cnNumber => !cnNumbersToRemove.find(cnToRemove => cnToRemove === cnNumber)).map(cn => `${cn}@${blId}`) 
                    //If they are included remove this items
                	for (cnId of cnIdsToCheck)  {
                      cnToCheck = await containerController.get(cnId)
                      if(cnToCheck) {
                         let itemsToRemove = cnToCheck.goodsItems.filter(item => itemNumbers.find(itemNumber => itemNumber === item.goodsItemNumber))
                         if(itemsToRemove.length>0) {
	                         cnToCheck.goodsItems = itemsToRemove
    	                     let cnAsset = await containerController.removeItems(cnToCheck, bl, blAsset)
        	                 //If the container is removed we exclude it from the list
            	             if(cnAsset.status === "CANCELLED") {
                	           let index = blAsset.containerNumbers.findIndex(cnNumber => cnNumber === cnAsset.containerNumber)
                    	       blAsset.containerNumbers.splice(index,1)
                        	 }
                         }
                      }
                    }
                    await billOfLadingRegistry.update(blAsset)
                    var event = await eventController.billOfLadingEvent("DECLARATION", "CHANGE", blAsset.blId,
                                       [blAsset.dischargeShippingAgent, blAsset.carrier, 
                                        blAsset.consignee, blAsset.blHolder], 
                                        blAsset.portCallId)
                    return blAsset
                default:
                    throw new Error (`The BillOfLading asset ${blId} cannot be updated because it is in ${blAsset.status} status`)
            }
        } else {
            throw new Error (`The BillOfLading ${blId} asset cannot be updated because it does not exist`)  
        }
    },

    /** 
     * Method to get a BillOfLading asset from a portCallId
     * @param {String} blId -The vessel port call id
     * @returns {BillOfLading} -The bill of lading asset
     */
    get: async function(blId) {
        let billOfLadingRegistry = await getAssetRegistry(blUri)
        let currentParticipant = getCurrentParticipant()            
        let blAsset = await billOfLadingRegistry.get(blId)
        return blAsset
    },

    /** 
     * Method to notify the arrival 
     * This transaction can only be made by the shipping agent or the PCS
     * If the cargo is released generates the delivery order
     * @param {NotifyArrival} arrivalNoticeTransaction The arrival notification transaction.
     * @returns {BillOfLading} The bill of lading asset
     */
    arrivalNotification: async function(arrivalNotice, charges) {
        let billOfLadingRegistry = await getAssetRegistry(blUri)
        let shipper = await partyController.updateParty(arrivalNotice.shipper)
        let consignee = await partyController.updateParty(arrivalNotice.consignee)
        let blHolder = await partyController.updateParty(arrivalNotice.blHolder)
        let bank = await partyController.updateParty(arrivalNotice.bank)
        var exist = await billOfLadingRegistry.exists(arrivalNotice.blId)
        if(exist) {
            let blAsset = await billOfLadingRegistry.get(arrivalNotice.blId)
            let currentParticipant = getCurrentParticipant()            
            if(!partyController.isPCS(currentParticipant) && currentParticipant.officeId != blAsset.dischargeShippingAgent.officeId)
                throw new Error(`Only the shipping agency can change the B/L ${arrivalNotice.blId}`)
            switch(blAsset.status) {
                case "REGISTERED":
                case "RELEASED":
                    //Mapping of the properties from the transaction towards the asset
                    Object.assign(blAsset, {
                        blType: arrivalNotice.blType || blAsset.blType,
                        haulierArrangement: arrivalNotice.haulierArrangement || blAsset.haulierArrangement,
                        arrivalNoticeDate: arrivalNotice.arrivalNoticeDate || blAsset.arrivalNoticeDate,
                        shipper: arrivalNotice.shipper || blAsset.shipper,
                        consignee: arrivalNotice.consignee || blAsset.consignee,
                        blHolder: arrivalNotice.blHolder || blAsset.blHolder,
                        freeDemurrageDays: arrivalNotice.freeDemurrageDays || blAsset.freeDemurrageDays,
                        freeDetentionDays: arrivalNotice.freeDetentionDays || blAsset.freeDetentionDays
                    })
                    Object.assign(charges, {
                        from: blAsset.dischargeShippingAgent,
                        to: charges.to || blAsset.blHolder,
                        issueDate: charges.issueDate || now
                    })                	
                    paymentAsset = await paymentController.createFreightCharges(blAsset.blId, charges)
                    blAsset.paymentId = paymentAsset.paymentId
                    //Check if the B/L has the conditions to automatically generate the delivery order
                    await this.checkCargoRelease(blAsset)
                    await billOfLadingRegistry.update(blAsset)
                    var event = await eventController.billOfLadingEvent("NOTIFICATION", "CREATE", blAsset.blId,
                                       [blAsset.dischargeShippingAgent, blAsset.carrier, 
                                        blAsset.consignee, blAsset.blHolder], 
                                       blAsset.portCallId)
                    if(blAsset.status="RELEASED") {
                        var event = await eventController.billOfLadingEvent("NOTIFICATION", "CREATE", blAsset.blId,
                                       [blAsset.dischargeShippingAgent, blAsset.carrier, 
                                        blAsset.consignee, blAsset.blHolder], 
                                        blAsset.portCallId)
                    }
                    return blAsset
                default:
                    throw new Error (`The BillOfLading ${blId} asset cannot be updated because it is in ${blAsset.status} status`)  
            }
        } else {
            throw new Error (`The BillOfLading ${blId} asset cannot be updated because it does not exist`)
        }
    },

    /**
     * Method to transfer the BillOfLading to another B/L holder. 
     * This transaction can only be made by the B/L Holder or the shipping agent or the PCS
     * @param {String} blId The B/L id is formed by the blNumber@carrier.organization.code
     * @param {Party} newBlHolder The new blHolder
     * @returns {BillOfLading} The bill of lading asset
     */
    transfer: async function(blId,  newBlHolder) {
        let billOfLadingRegistry = await getAssetRegistry(blUri)
        var exist = await billOfLadingRegistry.exists(blId)
        if(exist) {
            let blAsset = await billOfLadingRegistry.get(blId)            
            let currentParticipant = getCurrentParticipant()            
            if(!partyController.isPCS(currentParticipant) && !partyController.compareOffices(currentParticipant, blAsset.dischargeShippingAgent.office) 
                && !partyController.compareOffices(currentParticipant, blAsset.blHolder.office))
                throw new Error('Only the shpping agency or the B/L holder offices can transfer the B/L')
            switch(blAsset.status) {
                case "REGISTERED":
                case "RELEASED":
                    //Mapping of the properties from the transaction towards the asset
                    let oldBLHolder = blAsset.blHolder
                    Object.assign(blAsset, {
                        blHolder: newBlHolder
                    })
                    billOfLadingRegistry.update(blAsset)
                    var event = eventController.newEvent("TransferBL", 
                                    [blAsset.dischargeShippingAgent.office, blAsset.carrier.office, 
                                        blAsset.consignee.office, blAsset.blHolder.office, oldBLHolder],
                                    blAsset.blId, null, blAsset, null)
                    emit(event)
                    return blAsset
                default:
                    throw new Error (`The BillOfLading ${blId} asset cannot be transfered because it is in ${blAsset.status} status`)  
            }
        } else {
            throw new Error (`The BillOfLading ${blId} asset cannot be transferred because it does not exist`)  
        }        
    },

    /**
     * Method to register the data to release the cargo and determine if it shall be generated the delivery order.
     * This transaction can only be made by the shipping agent or the PCS
     * @param {String} blId The B/L id is formed by the blNumber@carrier.organization.code
     * @param {DeliveryOrder} deliveryOrder The delivery order transaction
     * @returns {BillOfLading} The bill of lading asset
     */
    blRelease: async function(blId, deliveryOrder) {
        let billOfLadingRegistry = await getAssetRegistry(blUri)
        var exist = await billOfLadingRegistry.exists(blId)
        if(exist) {
            let blAsset = await billOfLadingRegistry.get(blId)
            let currentParticipant = getCurrentParticipant()            
            if(!partyController.isPCS(currentParticipant) && !partyController.compareOffices(currentParticipant, blAsset.dischargeShippingAgent.office))
                throw new Error('Only the shpping agency office can release the cargo')
            let deliveryOrderAsset = blAsset.deliveryOrder
            switch(blAsset.status) {
                case "REGISTERED":
                    if(blAsset.deliveryOrder == null ) {
                        blAsset.deliveryOrder = deliveryOrder
                        deliveryOrderAsset = blAsset.deliveryOrder                        
                    } else {
                        deliveryOrderAssset = blAsset.deliveryOrder
                        //Mapping of the properties from the transaction towards the asset
                        //The data provided by the agency replaces existing data, except with deliveryTime
                        Object.assign(blAsset.deliveryOrder, {
                            deliveryOrderNumber: deliveryOrder.deliveryOrderNumber || deliveryOrderAssset.deliveryOrderNumber,
                            deliveryOrderDate: deliveryOrder.deliveryOrderDate || deliveryOrderAsset.deliveryOrderDate,
                            blSurrenderDate: deliveryOrder.blSurrenderDate || deliveryOrderAsset.blSurrenderDate,
                            blChargesPaymentDate: deliveryOrder.blChargesPaymentDate || deliveryOrderAssset.blChargesPaymentDate,
                            freeDemurrageDate: deliveryOrder.freeDemurrageDate || deliveryOrderAsset.freeDemurrageDate,
                            freeDetentionDate: deliveryOrder.freeDetentionDate || deliveryOrderAsset.freeDetentionDate,
                            requestedDeliveryDate: deliveryOrder.requestedDeliveryDate || deliveryOrderAssset.requestedDeliveryDate
                        })
                        if(blAsset.deliveryOrder.blChargesPaymentDate) 
                            blAsset.payment.paymentDate = blAsset.payment.paymentDate || blAsset.deliveryOrder.blChargesPaymentDate
                    }
                    this.checkCargoRelease(blAsset)
                    billOfLadingRegistry.update(blAsset)
                    if(blAsset.status="RELEASED") {
                        var event = eventController.newEvent("DeliveryOrder", 
                                        [blAsset.dischargeShippingAgent.office, blAsset.carrier.office, 
                                            blAsset.consignee.office, blAsset.blHolder.office],
                                        blAsset.blId, null, blAsset, null)
                        emit(event)    
                    }
                    return blAsset
                default:
                    throw new Error (`The BillOfLading ${blId} asset release cannot be updated because it is in ${blAsset.status} status`)  
            }
        } else {
            throw new Error (`The BillOfLading ${blId} asset cannot be released because it does not exist`)  
        }        
    },

    /**
     * Method to notify the payment of the BillOfLading charges. 
     * This transaction can only be made by the B/L Holder or the bank office or the PCS
     * @param {String} blId The B/L id is formed by the blNumber@carrier.organization.code
     * @param {DateTime} paymentDate The requested delivery date
     * @param {String} proofOfPayment The proof of payment 
     * @returns {BillOfLading} The bill of lading asset
     */
    notifyPayment: async function(blId, paymentDate, proofOfPayment) {
        let billOfLadingRegistry = await getAssetRegistry(blUri)
        if(exist) {
            let blAsset = await billOfLadingRegistry.get(blId)
            if(!blAsset.payment.bank)
                blAsset.payment.bank = {}
            let currentParticipant = getCurrentParticipant()
            if(!partyController.isPCS(currentParticipant) && !partyController.compareOffices(currentParticipant, blAsset.blHolder.office)
                && !partyController.compareOffices(currentParticipant, blAsset.payment.bank.office))
                throw new Error('Only the bank or the blHolder office can notify the payment')
            let paymentAsset = blAsset.payment
            let notifiedByBank = paymentAsset.bank.office == currentParticipant.office
            switch(blAsset.status) {
                case "REGISTERED":
                    paymentAsset.proofOfPayment = proofOfPayment || paymentAsset.proofOfPayment
                    if(notifiedByBank) {
                        paymentAsset.paymentDate = paymentDate || now
                    } else {
                        paymentAsset.notifiedPaymentDate = paymentDate || now
                    }
                    billOfLadingRegistry.update(blAsset)
                    var event = eventController.newEvent("PaymentNotified",
                                    [blAsset.dischargeShippingAgent.office, blAsset.carrier.office,
                                        blAsset.consignee.office, blAsset.blHolder.office, blAsset.payment.bank.office],
                                    blAsset.blId, null, blAsset, null)
                    emit(event)
                    return blAsset
                default:
                    throw new Error (`The BillOfLading ${blId} asset payment notification cannot be updated because it is in ${blAsset.status} status`)
            }
        } else {
            throw new Error (`The BillOfLading ${blId} asset cannot be payed because it does not exist`)
        }

    },

    /**
     * Mehtod to request the delivery of the goods of the BillOfLading.
     * This transaction can only be made by the B/L Holder or the shipping agent or the PCS
     * @param {String} blId The id of the BillOfLadingAsset
     * @param {DateTime} requestedDeliveryDate The requested delivery date
     * @param {TransportType} transportType The requested transport type (merchant, carrier or agent haulage)
     * @returns {BillOfLading} The bill of lading asset
     */
    requestDelivery: async function(blId, requestedDeliveryDate, transportType) {
        let billOfLadingRegistry = await getAssetRegistry(blUri)
        var exist = await billOfLadingRegistry.exists(blId)
        if(exist) {
            let blAsset = await billOfLadingRegistry.get(blId)
            let currentParticipant = getCurrentParticipant()
            if(!partyController.isPCS(currentParticipant) && !partyController.compareOffices(currentParticipant, blAsset.dischargeShippingAgent.office)
                && !partyController.compareOffices(currentParticipant, blAsset.blHolder.office))
                throw new Error('Only the bank or the blHolder office can notify the payment')
            let deliveryOrderAsset = blAsset.deliveryOrder
            let requestedByAgent = blAsset.dischargeShippingAgent.office == currentParticipant.office
            switch(blAsset.status) {
                case "REGISTERED":
                case "RELEASED":
                    if(blAsset.deliveryOrder == null ) {
                        blAsset.deliveryOrder = {}
                        deliveryOrderAsset = blAsset.deliveryOrder
                    }
                    deliveryOrderAsset.requestedDeliveryTime = requestedDeliveryDate || deliveryOrderAsset.requestedDeliveryTime
                    if(requestedByAgent) {
                        blAsset.transportType = transportType || blAsset.transportType
                    } else if (bl.transportType != "CARRIER") {
                        blAsset.transportType = transportType || blAsset.transportType
                    }
                    billOfLadingRegistry.update(blAsset)
                    var event = eventController.newEvent("RequestedDelivery",
                                    [blAsset.dischargeShippingAgent.office, blAsset.carrier.office,
                                        blAsset.consignee.office, blAsset.blHolder.office],
                                    blAsset.blId, null, blAsset, null)
                    emit(event)    
                    return blAsset
                default:
                    throw new Error (`The BillOfLading ${blId} asset request delivery cannot be updated because it is in ${blAsset.status} status`)  
            }
        } else {
            throw new Error (`The BillOfLading ${blId} asset cannot be changed because it does not exist`)  
        }        
    },

    //Method that will determine if the B/L complies the conditions to be released and generate the deliveryOrder
    //the funtion calculates the freeDemurrageTime and freeDetentionTime in the case the free days were reported in the ArrivalNotification
    checkCargoRelease: async function(blAsset, paymentAsset) {
        //We will check the cargo release only if B/L status is registered 
        if(blAsset.status=="REGISTERED") {
            //If the delivery order is already notified we release the B/L
            if(blAsset.deliveryOrder && blAsset.deliveryOrder.deliveryOrderDate) {
                blAsset.status = "RELEASED"
            //If the original B/L is presented, we check for the payment status 
            } else if(blAsset.deliveryOrder && blAsset.deliveryOrder.blSurrenderDate) {
                //Payment is cleared if the customer has credit or the charges are payed. If payment is cleared we release the B/L
                if(paymentAsset && paymentAsset.paymentMethod==="CREDIT") {
                    blAsset.status="RELEASED"
                } else if(paymentAsset && paymentAsset.paymentDate!=null) {
                    blAsset.status="RELEASED"
                }
            //If the blAsset is a SEAWAYBILL we will check for the payment status
            } else if(blAsset.blType==="SEAWAYBILL") {
                if(paymentAsset && paymentAsset.paymentMethod==="CREDIT") {
                    blAsset.status="RELEASED"                
                } else if(paymentAsset && paymentAsset.paymentDate) {
                    blAsset.status="RELEASED"
                }
            } 
            if(blAsset.status="RELEASED") {
                //If the delivery order is generated, complete the delivery order data
                var deliveryOrder = blAsset.deliveryOrder
                if(!deliveryOrder) {
                  let factory = getFactory()
                  deliveryOrder = await factory.newConcept(uri, "DeliveryOrder")
                }
                deliveryOrder.deliveryOrderNumber = deliveryOrder.deliveryOrderNumber || blAsset.blNumber
                deliveryOrder.deliveryOrderDate = deliveryOrder.deliveryOrderDate || today()
                //Calculate the free demurrage and detention dates
                if(blAsset.freeDemurrageDays)
                    deliveryOrder.freeDemurrageDate = deliveryOrder.freeDemurrageDate || addDays(today(), blAsset.freeDemurrageDays)
                if(blAsset.freeDetentionDays)
                    deliveryOrder.freeDetentionDate = deliveryOrder.freeDetentionDate || addDays(today(), blAsset.freeDetentionDays)
            }
        } 
    }

}
