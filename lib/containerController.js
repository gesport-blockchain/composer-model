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
var cnUri = "net.gesport.Container"

/**
 * Controller class for Container assets
 */
var containerController = {

    /** 
     * Method to register a Container asset from a container declaration in a  bill of lading declaration 
     * If the container asset does not exist then it is created and if it exists it is updated
     * @param {ContainerDeclaration} cn -The container declaration
     * @param {BLDeclaration} bl -The bill of lading declaration
     * @param {BillOfLadingAsset} blAsset -The bill of lading asset
     * @returns {Container} The container asset 
     */
    register: async function(cn, bl, blAsset) {
        let containerRegistry = await getAssetRegistry(cnUri)
        //cnId is the concatenation of containerNumber@blId
        var cnId = `${cn.containerNumber}@${blAsset.blId}`
        var exist = await containerRegistry.exists(cnId)
        if(exist) {
            let cnAsset = await containerRegistry.get(cnId)
            switch(cnAsset.status) {
                case "REGISTERED":
                    //Mapping of the properties from the transaction towards the asset
                    Object.assign(cnAsset, {
                        dischargeShippingAgent: blAsset.dischargeShippingAgent,
                        dischargeTerminalOperator: cn.dischargeTerminalOperator || bl.dischargeTerminalOperator,
                        dischargeBerth: bl.dischargeBerth,
                        summaryContainerType: cn.containerType,
                        shipmentClause: cn.shipmentClause,
                        subsequentTransportMode: cn.subsequentTransportMode || blAsset.subsequentTransportMode || cnAsset.subsequentTransportMode,
                        tareWeight: cn.tareWeight,
                        seals: cn.seals,
                        goodsItems: cn.goodsItems
                    })
                    await containerRegistry.update(cnAsset)
                    var event = await eventController.containerEvent("DECLARATION", "CHANGE", cnAsset.cnId,
                                       [blAsset.shippingAgent, blAsset.carrier, 
                                        blAsset.consignee, blAsset.blHolder,
                                        cnAsset.dischargeTerminalOperator], 
                                        blAsset.portCallId)
                    return cnAsset
                default:
                    throw new Error (`The Container asset ${cnId} cannot be updated because it is in ${cnAsset.status} status`)  
            }
        } else {
            //If the asset does not exist then create a new asset
            var factory = getFactory()
            var cnAsset = factory.newResource(uri, "Container", cnId);
            //Mapping of the properties from the transaction towards the asset
            Object.assign(cnAsset, {
              	version: "1",
                status: "REGISTERED",
                containerNumber: cn.containerNumber,
                blNumber: blAsset.blNumber,
                shipmentClause: cn.shipmentClause,
                summaryDeclarationNumber: blAsset.summaryDeclarationNumber,
                carrier: blAsset.carrier,
                dischargeShippingAgent: blAsset.dischargeShippingAgent,
                dischargeTerminalOperator: cn.dischargeTerminalOperator || bl.dischargeTerminalOperator,
                dischargeBerth: blAsset.dischargeBerth,
                summaryContainerType: cn.containerType,
                subsequentTransportMode: cn.subsequentTransportMode || bl.subsequentTransportMode || cnAsset.subsequentTransportMode,
                tareWeight: cn.tareWeight,
                seals: cn.seals,
                goodsItems: cn.goodsItems,
                movementIds: [],
                releaseOrders: [],
                acceptanceOrders: [],
                transportOrders: []              
            })
            await containerRegistry.add(cnAsset)
            var event = await eventController.containerEvent("DECLARATION", "CREATE", cnAsset.cnId,
                           [blAsset.dischargeShippingAgent, blAsset.carrier, 
                            blAsset.consignee, blAsset.blHolder,
                            cnAsset.dischargeTerminalOperator], 
                           blAsset.portCallId)
            return cnAsset
        }
    },
      
    /** 
     * Method to register goods items in a Container asset from a container declaration in a  bill of lading declaration 
     * If the container asset does not exist then it is created and if it exists it is updated.
     * If the goods items do not exist then they are added and if they exist they are replaced
     * @param {ContainerDeclaration} cn -The container declaration
     * @param {BLDeclaration} bl -The bill of lading declaration
     * @param {BillOfLadingAsset} blAsset -The bill of lading asset
     * @returns {Container} The container asset 
     */
    registerItems: async function(cn, bl, blAsset) {
        let containerRegistry = await getAssetRegistry(cnUri)
        //cnId is the concatenation of containerNumber@blId
        var cnId = `${cn.containerNumber}@${blAsset.blId}`
        var exist = await containerRegistry.exists(cnId)
        if(exist) {
            let cnAsset = await containerRegistry.get(cnId)
            switch(cnAsset.status) {
                case "REGISTERED":
                    //Mapping of the properties from the transaction towards the asset
                    Object.assign(cnAsset, {
                        dischargeShippingAgent: blAsset.dischargeShippingAgent,
                        dischargeTerminalOperator: cn.dischargeTerminalOperator || bl.dischargeTerminalOperator,
                        dischargeBerth: bl.dischargeBerth,
                        summaryContainerType: cn.containerType,
                        shipmentClause: cn.shipmentClause,
                        subsequentTransportMode: cn.subsequentTransportMode || blAsset.subsequentTransportMode || cnAsset.subsequentTransportMode,
                        tareWeight: cn.tareWeight,
                        seals: cn.seals
                    })
                	//Check the goods items
                	let itemIds = cnAsset.goodsItems.map(item => item.goodsItemNumber);
                	//Identify the items to update
                	let itemsToUpdate = cn.goodsItems.filter(newItem => {
                      return itemIds.find(id => id === newItem.goodsItemNumber);
                    })
                    //Update the items
                    itemsToUpdate.forEach(item => {
                      let index = cnAsset.goodsItems.findIndex(existingItem => {
                        			return existingItem.goodsItemNumber === item.goodsItemNumber
                      			  })
                      cnAsset.goodsItems[index] = item
                    })
                    //Identify the items to add
                	let itemsToAdd = cn.goodsItems.filter(newItem => {
                      return !itemIds.find(id => id === newItem.goodsItemNumber);
                    })
                    //Add the items
                    itemsToAdd.forEach(item => cnAsset.goodsItems.push(item))
                    await containerRegistry.update(cnAsset)
                    var event = await eventController.containerEvent("DECLARATION", "CHANGE", cnAsset.cnId,
                                       [blAsset.shippingAgent, blAsset.carrier, 
                                        blAsset.consignee, blAsset.blHolder,
                                        cnAsset.dischargeTerminalOperator], 
                                        blAsset.portCallId)
                    return cnAsset
                default:
                    throw new Error (`The Container asset ${cnId} cannot be updated because it is in ${cnAsset.status} status`)  
            }
        } else {
            //If the asset does not exist then create a new asset
            var factory = getFactory()
            var cnAsset = factory.newResource(uri, "Container", cnId);
            //Mapping of the properties from the transaction towards the asset
            Object.assign(cnAsset, {
              	version: "1",
                status: "REGISTERED",
                containerNumber: cn.containerNumber,
                blNumber: blAsset.blNumber,
                shipmentClause: cn.shipmentClause,
                summaryDeclarationNumber: blAsset.summaryDeclarationNumber,
                carrier: blAsset.carrier,
                dischargeShippingAgent: blAsset.dischargeShippingAgent,
                dischargeTerminalOperator: cn.dischargeTerminalOperator || bl.dischargeTerminalOperator,
                dischargeBerth: blAsset.dischargeBerth,
                summaryContainerType: cn.containerType,
                subsequentTransportMode: cn.subsequentTransportMode || bl.subsequentTransportMode || cnAsset.subsequentTransportMode,
                tareWeight: cn.tareWeight,
                seals: cn.seals,
                goodsItems: cn.goodsItems,
                movementIds: [],
                releaseOrders: [],
                acceptanceOrders: [],
                transportOrders: []              
            })
            await containerRegistry.add(cnAsset)
            var event = await eventController.containerEvent("DECLARATION", "CREATE", cnAsset.cnId,
                           [blAsset.dischargeShippingAgent, blAsset.carrier, 
                            blAsset.consignee, blAsset.blHolder,
                            cnAsset.dischargeTerminalOperator], 
                           blAsset.portCallId)
            return cnAsset
        }
    },
      
    /** 
     * Method to remove goods items in a Container asset from a container declaration in a  bill of lading declaration 
     * If the container asset does not have more items the the container asset is removed .
     * @param {ContainerDeclaration} cn -The container declaration
     * @param {BLDeclaration} bl -The bill of lading declaration
     * @param {BillOfLadingAsset} blAsset -The bill of lading asset
     * @returns {Container} The container asset 
     */
    removeItems: async function(cn, bl, blAsset) {
        let containerRegistry = await getAssetRegistry(cnUri)
        //cnId is the concatenation of containerNumber@blId
        var cnId = `${cn.containerNumber}@${blAsset.blId}`
        var exist = await containerRegistry.exists(cnId)
        if(exist) {
            let cnAsset = await containerRegistry.get(cnId)
            switch(cnAsset.status) {
                case "REGISTERED":
                    //Mapping of the properties from the transaction towards the asset
                    Object.assign(cnAsset, {
                        dischargeShippingAgent: blAsset.dischargeShippingAgent,
                        dischargeTerminalOperator: cn.dischargeTerminalOperator || bl.dischargeTerminalOperator,
                        dischargeBerth: bl.dischargeBerth,
                        summaryContainerType: cn.containerType || cnAsset.summaryContainerType,
                        shipmentClause: cn.shipmentClause,
                        subsequentTransportMode: cn.subsequentTransportMode || blAsset.subsequentTransportMode || cnAsset.subsequentTransportMode,
                        tareWeight: cn.tareWeight,
                        seals: cn.seals
                    })
                	//Check the goods items
                	let itemIdsToRemove = cn.goodsItems.map(item => item.goodsItemNumber);
                	//Identify the new items after removing the items to remove
                	var items = cnAsset.goodsItems.filter(item => {
                      return !itemIdsToRemove.find(itemId => itemId === item.goodsItemNumber);
                    })
                    //If there are not more items then remove the container asset
                    if(items.length === 0) {
                      //We will return the container asset as cancelled
                      cnAsset.status = "CANCELLED"
                      await containerRegistry.remove(cnAsset)
                      var event = await eventController.containerEvent("DECLARATION", "CANCEL", cnAsset.cnId,
                                      [blAsset.shippingAgent, blAsset.carrier, 
                                       blAsset.consignee, blAsset.blHolder,
                                       cnAsset.dischargeTerminalOperator], 
                                      blAsset.portCallId)
                    } else {
                        cnAsset.goodsItems = items
	                    await containerRegistry.update(cnAsset)
    	                var event = await eventController.containerEvent("DECLARATION", "CHANGE", cnAsset.cnId,
                                       [blAsset.shippingAgent, blAsset.carrier, 
                                        blAsset.consignee, blAsset.blHolder,
                                        cnAsset.dischargeTerminalOperator], 
                                        blAsset.portCallId)
                    }
                    return cnAsset
                    break;
                default:
                    throw new Error (`The Container asset ${cnId} cannot be updated because it is in ${cnAsset.status} status`)  
            }
        } else {
            throw new Error (`The Container asset ${cnId} cannot be changed because it does not exist`)  
        }
    },

    /** 
     * Method to remove a Container asset from a container declaration in a bill of lading declaration
     * @param {String} cnNumber The container number
     * @param {BillOfLadingAsset} blAsset The bill of lading asset
     * @returns {Container} The container asset 
     */
    remove: async function(cnNumber, blAsset) {
        let containerRegistry = await getAssetRegistry(cnUri)
        //cnId is the concatenation of containerNumber@blId
        var cnId = `${cnNumber}@${blAsset.blId}`
        var exist = await containerRegistry.exists(cnId)
        if(exist) {
            let cnAsset = await containerRegistry.get(cnId)
            if(cnAsset.movementIds.length>0 || blAsset.deliveryOrder) {

            }
            switch(cnAsset.status) {
                case "REGISTERED":
                    await containerRegistry.remove(cnAsset)
                    var event = await eventController.containerEvent("DECLARATION", "CANCEL", cnAsset.cnId,
                                   [blAsset.dischargeShippingAgent, blAsset.carrier, 
                                    blAsset.consignee, blAsset.blHolder,
                                    cnAsset.dischargeTerminalOperator], 
                                   blAsset.portCallId)
                    return cnAsset
                default:
                    throw new Error (`The Container ${cnId} asset cannot be removed because it is in ${cnAsset.status} status`)  
            }
        } else {
            throw new Error (`The Container ${cnId} asset cannot be removed because it does not exist`)  
        }
    },

    /** 
     * Method to get a Container asset from a cnId
     * @param {String} cnId -The container id
     * @returns {Container} -The container asset 
     */
    get: async function(cnId) {
        let containerRegistry = await getAssetRegistry(cnUri)
        var cnAsset = await containerRegistry.get(cnId)
        return cnAsset
    },

    /**
     * Method to create/update the release order of a movement
     * @param {Movement} movement The movement reported
     * @param {Movement} movementAsset The movement registered in the container asset
     * @param {Container} cnAsset The container asset
     * @param {BillOfLading} blAsset The bill of lading asset
     * @param {Array} events The array of events to report
     */
    releaseOrder: async function(movement, movementAsset, cnAsset, blAsset, events) {
        let eventName = ""
        if(movementAsset.releaseOrder) {
            //Update the order
            eventName = "ReleaseOrderChanged"
            if(releaseOrder.releaseTime)
                throw new Error("Release order cannot be changed if the order has been executed")
        } else {
            //Create the order
            eventName = "ReleaseOrderCreated"
            movementAsset.releaseOrder = {}
            if(!movement.releaseOrder.orderNumber || !movement.releaseOrder.orderingParty)
                throw new Error("To create a release order it is mandatory to indicate the order number and the ordering party")
            cnAsset.releaseOrders.push(`${movement.releaseOrder.orderNumber}@${movement.releaseOrder.orderingParty.organization.code}`)
        }
        let releaseOrder = movement.releaseOrder
        let orderingParty = partyController.updateParty(releaseOrder.orderingParty)
        let releaseParty = partyController.updateParty(releaseOrder.releaseParty)
        let oldOrderingParty = movementAsset.releaseOrder.orderingParty
        let oldReleaseParty = movementAsset.releaseOrder.releaseParty
        Object.assign(movementAsset.releaseOrder, {
            orderNumber: releaseOrder.orderNumber,
            barCode: releaseOrder.barCode,
            status: releaseOrder.status,
            orderDate: releaseOrder.orderDate, 
            validFrom: releaseOrder.validFrom,
            expirationDate: releaseOrder.expirationDate,
            plannedExecutionTime: releaseOrder.plannedExecutionTime, 
            orderingParty: orderingParty,
            releaseParty: releaseParty 
        })
        var event = eventController.newEvent(eventName, 
                        [orderingParty.office, releaseParty.office, 
                            blAsset.blHolder.office, blAsset.dischargeShippingAgent.office],
                        `${releaseOrder.orderNumber}@${cnId}`, cnAsset, blAsset, null)
        events.push(event)
        let oldParties = {}
        partyController.checkOldParty(oldOrderingParty, orderingParty, oldParties)
        partyController.checkOldParty(oldReleaseParty, releaseParty, oldParties)
        eventName = "ReleaseOrderRemoved"
        var event = eventController.newEvent(eventName, 
            oldParties,
            `${movementAsset.releaseOrder.orderNumber}@${orderingParty.office.officeId}`, cnAsset, blAsset, null)
        events.push(event)
        return movementAsset.releaseOrder
    },

    /**
     * Method to register the transport details to the release order 
     * @param {TransportDetails} transportDetails The transport details
     * @param {Movement} movementAsset The movement registered in the container asset
     * @param {Container} cnAsset The container asset
     * @param {BillOfLading} blAsset The bill of lading asset
     * @param {Array} events The array of events to report
     */
    releaseTransportDetails: async function(transportDetails, movementAsset, cnAsset, blAsset, events) {
        let eventName = ""
        releaseOrder = movementAsset.releaseOder
        //If there is not a release order ignore the operation
        if(!releaseOrder)
            return 
        //If the order is executed ignore the operation
        if(releaseOrder.releaseTime)
            return
        if(releaseOrder.transportDetails) {
            //Update the transport details
            eventName = "ReleaseTransportDetailsChanged"
        } else {
            //Assign the transport details
            eventName = "ReleaseTransportDetailsAssigned"
        }
        releaseOrder.transportDetails = transportDetails
        var event = eventController.newEvent(eventName, 
                        [releaseOrder.orderingParty.office, releaseOrder.releaseParty.office, 
                            blAsset.blHolder.office, blAsset.dischargeShippingAgent.office],
                        `${releaseOrder.orderNumber}@${releaseOrder.orderingParty.office.officeId}`, cnAsset, blAsset, null)
        events.push(event)
        return movementAsset.releaseOrder
    },

    /**
     * Method to create/update the acceptance order of a movement 
     * @param {Movement} movement The movement reported
     * @param {Movement} movementAsset The movement registered in the container asset
     * @param {Container} cnAsset The container asset
     * @param {BillOfLading} blAsset The bill of lading asset
     * @param {Array} events The array of events to report
     */
    acceptanceOrder: async function(movement, movementAsset, cnAsset, blAsset, events) {
        let eventName = ""
        if(movementAsset.acceptanceOrder) {
            //Update the order
            eventName = "AcceptanceOrderChanged"
            if(acceptanceOrder.acceptanceTime)
                throw new Error("Acceptance order cannot be changed if the order has been executed")
        } else {
            //Create the order
            eventName = "AcceptanceOrderCreated"
            movementAsset.acceptanceOrder = {}
            if(!movement.acceptanceOrder.orderNumber || !movement.acceptanceOrder.orderingParty)
                throw new Error("To create an acceptance order it is mandatory to indicate the order number and the ordering party")
            cnAsset.acceptanceOrders.push(`${movement.acceptanceOrder.orderNumber}@${movement.acceptanceOrder.orderingParty.organization.code}`)
        }
        let acceptanceOrder = movement.acceptanceOrder
        let orderingParty = partyController.updateParty(acceptanceOrder.orderingParty)
        let acceptanceParty = partyController.updateParty(acceptanceOrder.acceptanceParty)
        let oldOrderingParty = movementAsset.releaseOrder.orderingParty
        let oldReleaseParty = movementAsset.releaseOrder.releaseParty
        Object.assign(movementAsset.acceptanceOrder, {
            orderNumber: acceptanceOrder.orderNumber,
            barCode: acceptanceOrder.barCode,
            status: acceptanceOrder.status,
            orderDate: acceptanceOrder.orderDate, 
            validFrom: acceptanceOrder.validFrom,
            expirationDate: acceptanceOrder.expirationDate,
            plannedExecutionTime: releaseOrder.plannedExecutionTime, 
            orderingParty: orderingParty,
            acceptanceParty: acceptanceParty    
        })
        var event = eventController.newEvent(eventName, 
                        [orderingParty.office, acceptanceParty.office, 
                            blAsset.blHolder.office, blAsset.dischargeShippingAgent.office],
                        `${acceptanceOrder.orderNumber}@${cnId}`, cnAsset, blAsset, null)
        events.push(event)
        let oldParties = {}
        partyController.checkOldParty(oldOrderingParty, orderingParty, oldParties)
        partyController.checkOldParty(oldReleaseParty, acceptanceParty, oldParties)
        eventName = "AcceptanceOrderRemoved"
        var event = eventController.newEvent(eventName, 
            oldParties,
            `${movementAsset.acceptanceOrder.orderNumber}@${orderingParty.office.officeId}`, cnAsset, blAsset, null)
        events.push(event)
        return movementAsset.acceptanceOrder
    },

    /**
     * Method to register the transport details to the acceptance order 
     * @param {TransportDetails} transportDetails The transport details
     * @param {Movement} movementAsset The movement registered in the container asset
     * @param {Container} cnAsset The container asset
     * @param {BillOfLading} blAsset The bill of lading asset
     * @param {Array} events The array of events to report
     */
    acceptanceTransportDetails: async function(transportDetails, movementAsset, cnAsset, blAsset, events) {
        let eventName = ""
        acceptanceOrder = movementAsset.acceptanceOder
        //If there is not an acceptance order ignore the operation
        if(!acceptanceOrder)
            return 
        //If the order is executed ignore the operation
        if(acceptanceOrder.releaseTime)
            return
        if(acceptanceOrder.transportDetails) {
            //Update the transport details
            eventName = "AcceptanceTransportDetailsChanged"
        } else {
            //Assign the transport details
            eventName = "AcceptanceTransportDetailsAssigned"
        }
        acceptanceOrder.transportDetails = transportDetails
        var event = eventController.newEvent(eventName, 
                        [acceptanceOrder.orderingParty.office, acceptanceOrder.releaseParty.office, 
                            blAsset.blHolder.office, blAsset.dischargeShippingAgent.office],
                        `${acceptanceOrder.orderNumber}@${acceptanceOrder.orderingParty.office.officeId}`, cnAsset, blAsset, null)
        events.push(event)
        return movementAsset.acceptanceOrder
    },

    /**
     * Method to create/update the transport order of a movement
     * @param {Movement} movement The movement reported
     * @param {Movement} movementAsset The movement registered in the container asset
     * @param {Container} cnAsset The container asset
     * @param {BillOfLading} blAsset The bill of lading asset
     * @param {Array} events The array of events to report
     */
    transportOrder: async function(movement, movementAsset, cnAsset, blAsset, events) {
        let eventName = ""
        if(movementAsset.transportOrder) {
            //Update the order
            eventName = "TransportOrderChanged"
            if(transportOrder.shipmentTime)
                throw new Error("Transport order cannot be changed if the order has been initiated")
            if(transportOrder.deliveryTime)
                throw new Error("Transport order cannot be changed if the order has been executed")
        } else {
            //Create the order
            eventName = "TransportOrderCreated"
            movementAsset.acceptanceOrder = {}
            if(!movement.transportOrder.orderNumber || !movement.transportOrder.orderingParty)
                throw new Error("To create a transport order it is mandatory to indicate the transport number and the ordering party")
            cnAsset.transportOrders.push(`${movement.transportOrder.orderNumber}@${movement.transportOrder.orderingParty.organization.code}`)
        }
        let transportOrder = movement.transportOrder
        let orderingParty = partyController.updateParty(transportOrder.orderingParty)
        let forwardingParty = partyController.updateParty(transportOrder.forwardingParty)
        let senderParty = partyController.updateParty(transportOrder.senderParty)
        let carrierParty = partyController.updateParty(transportOrder.carrier)
        let receiverParty = partyController.updateParty(transportOrder.receiverParty)
        let oldOrderingParty = movementAsset.transportOrder.orderingParty
        let oldForwardingParty = movementAsset.transportOrder.forwardingParty
        let oldSenderParty = movementAsset.transportOrder.senderParty
        let oldCarrierParty = movementAsset.transportOrder.carrierParty
        let oldreceiverParty = movementAsset.transportOrder.receiverParty
        Object.assign(movementAsset.transportOrder, {
            orderNumber: transportOrder.orderNumber,
            barCode: transportOrder.barCode,
            orderDate: transportOrder.orderDate,
            requestedShipmentTime: transportOrder.requestedShipmentTime,
            requestedDeliveryTime: transportOrder.requestedDeliveryTime,
            orderingParty: orderingParty,
            forwardingParty: forwardingParty,
            senderParty: senderParty,
            carrierParty: carrierParty,
            receiverParty:receiverParty                         
        })
        var event = eventController.newEvent("CreateTransportOrder", 
                        [orderingParty.office, forwardingParty.office,
                            senderParty.office, carrierParty.office, receiverParty.office,
                            blAsset.blHolder.office, blAsset.dischargeShippingAgent.office],
                        `${transportOrder.orderNumber}@${cnId}`, cnAsset, blAsset, null)
        events.push(event)
        let oldParties = {}
        eventName = "TransportOrderRemoved"
        partyController.checkOldParty(oldOrderingParty, orderingParty, oldParties)
        partyController.checkOldParty(oldForwardingParty, forwardingParty, oldParties)
        partyController.checkOldParty(oldSenderParty, senderParty, oldParties)
        partyController.checkOldParty(oldCarrierParty, carrierParty, oldParties)
        partyController.checkOldParty(oldreceiverParty, receiverParty, oldParties)
        var event = eventController.newEvent(eventName, 
            oldParties,
            `${movementAsset.transportOrder.orderNumber}@${cnId}`, cnAsset, blAsset, null)
        events.push(event)
        return movementAsset.transportOrder
    },

    /**
     * Method to register the transport details to the transport order 
     * @param {TransportDetails} transportDetails The transport details
     * @param {Movement} movementAsset The movement registered in the container asset
     * @param {Container} cnAsset The container asset
     * @param {BillOfLading} blAsset The bill of lading asset
     * @param {Array} events The array of events to report
     */
    transportDetails: async function(transportDetails, movementAsset, cnAsset, blAsset, events) {
        let eventName = ""
        transportOrder = movementAsset.releaseOder
        //If there is not a release order ignore the operation
        if(!transportOrder)
            return 
        //If the order is executed ignore the operation
        if(transportOrder.releaseTime)
            return
        if(transportOrder.transportDetails) {
            //Update the transport details
            eventName = "TransportDetailsChanged"
        } else {
            //Assign the transport details
            eventName = "TransportDetailsAssigned"
        }
        transportOrder.transportDetails = transportDetails
        var event = eventController.newEvent(eventName, 
                        [transportOrder.orderingParty.office, transportOrder.carrierParty.office,
                            blAsset.blHolder.office, blAsset.dischargeShippingAgent.office],
                        `${transportOrder.orderNumber}@${transportOrder.orderingParty.office.officeId}`, cnAsset, blAsset, null)
        events.push(event)
        return this.transportOrder
    },

    /** 
     * Method to release a container. 
     * This transaction can only be made by the shipping agent or the PCS
     * In carrier and agent haulage, all the details of the movement (release, acceptance and transport order) can be indicated 
     * In merchant haulage, both the release and acceptance order can be indicated  
     * @param {String} cnId The container id
     * @param {Movement} movement The movement details
     */
    containerRelease: async function(cnId, movement) {
        let blRegistry = await getAssetRegistry(blUri)
        let containerRegistry = await getAssetRegistry(cnUri)
        let blId = cnId.substr(cnId.indexOf("@")+1)
        var exist = await containerRegistry.exists(cnId)
        if(exist) {
            let cnAsset = await containerRegistry.get(cnId)
            let blAsset = await blRegistry.get(blId)
            //The Bl asset may not exist if it has been registered only in the discharge operation (normally for empty containers) 
            if(!blAsset) blAsset = {}
            let currentParticipant = getCurrentParticipant()
            //Only the shipping agent can submit a container release order
            if(!partyController.isPCS(currentParticipant) && !partyController.compareOffices(currentParticipant, blAsset.dischargeShippingAgent.office))
                throw new Error("The container release shall be generated by the shipping agent")
            //Check in the movement was already registered
            let movements = cnAsset.movements
            let events = new Array()
            let movementAsset = movements.find((mvItem) => {
                return mvItem.releaseOrder.orderNumber == movement.releaseOrder.orderNumber
            })
            //If not, check if there is any movement without a release order number 
            if(!movementAsset) {
                movementAsset = movements.find((mvItem) => {
                    if(mvItem.releaseOrder.releaseTime) return false
                    return !mvItem.releaseOrder.orderNumber || mvItem.releaseOrder.orderNumber == ""
                })
            }
            //If not, create a new movement
            if(!movementAsset) {
                movementAsset = {}
                cnAsset.movements.push(movementAsset)
            }
             //If the ordering and release parties are not indicated in the release order they are taken by default from the container asset
            if(movement.releaseOrder) {
                movement.releaseOrder.orderingParty = movement.releaseOrder.orderingParty || cnAsset.dischargeShippingAgent
                movement.releaseOrder.releaseParty = movement.releaseOrder.releaseParty || cnAsset.dischargeTerminalOperator
                this.releaseOrder(movement, movementAsset, cnAsset, blAsset, events)
            } else {
                new Error("Release order shall be reported in transaction")
            }
            //If the transport type is not indicated in the release order take the value from the blAsset
            if(!movement.transportType)
                movement.transportType = movementAsset.transportType || blAsset.transportType
            //If the transport is not merchant, the transport order can be included.
            //If the ordering, forwarding, sender, delivery parties are not indicated in the transport order they are taken by default from the container asset
            //If sender party is not included, sender party will be release party
            //If receiver party is not included, receiver party will be consignee party
            if(movement.transportType != "MERCHANT" && movement.transportOrder) {
                movement.transportOrder.orderingParty = movement.transportOrder.orderingParty || cnAsset.dischargeShippingAgent
                movement.transportOrder.forwardingParty = movement.transportOrder.forwardingParty || blAsset.blHolder
                movement.transportOrder.sender = movement.transportOrder.sender || movement.releaseOrder.releaseParty
                movement.transportOrder.receiverParty = movement.transportOrder.receiverParty || blAsset.consignee
                this.transportOrder(movement, movementAsset, cnAsset, blAsset, events)
            } 
            //If the ordering and acceptance parties are not indicated in the acceptance order they are taken by default from the container asset
            if(movement.acceptanceOrder) {
                movement.acceptanceOrder.orderingParty = movement.acceptanceOrder.orderingParty || cnAsset.dischargeShippingAgent
                movement.acceptanceOrder.releaseParty = movement.acceptanceOrder.releaseParty || cnAsset.dischargeTerminalOperator
                this.acceptanceOrder(movement, movementAsset, cnAsset, blAsset, events)
            }
            containerRegistry.update(cnAsset)
            //Generate events
            events.forEach(event => emit(event))
            return cnAsset
        }
    },

    /** 
     * Method to return a container (empty or full). 
     * This transaction can only be made by the shipping agent or the PCS
     * @param {String} cnId The container id
     * @param {Movement} movement The movement details
     */
    containerReturn: async function(cnId, movement) {
        let blRegistry = await getAssetRegistry(blUri)
        let containerRegistry = await getAssetRegistry(cnUri)
        let blId = cnId.substr(cnId.indexOf("@")+1)
        var exist = await containerRegistry.exists(cnId)
        if(exist) {
            let cnAsset = await containerRegistry.get(cnId)
            let blAsset = await blRegistry.get(blId) 
            //The Bl asset may not exist if it has been registered only in the discharge operation (normally for empty containers) 
            if(!blAsset) blAsset = {}
            let currentParticipant = getCurrentParticipant()
            //Only the shipping agent can submit a container release order 
            if(!partyController.isPCS(currentParticipant) && !partyController.compareOffices(currentParticipant, blAsset.dischargeShippingAgent.office))
                throw new Error("The container release shall be generated by the shipping agent")
            //Check in the movement was already registered
            let movements = cnAsset.movements
            let events = new Array()
            let movementAsset = movements.find((mvItem) => {
                return mvItem.acceptanceOrder.orderNumber == movement.acceptanceOrder.orderNumber
            })
            //If not, check if there is any movement with the related release order 
            if(!movementAsset) {
                if(movement.releaseOrder && movement.releaseOrder.orderNumber) {
                    movementAsset = movements.find((mvItem) => {
                        if(!mvItem.releaseOrder) return false
                        return mvItem.releaseOrder.orderNumber == movement.releaseOrder.orderNumber
                     })    
                }
            }
            //If not, check if there is any movement without an acceptance order 
            if(!movementAsset) {
                movementAsset = movements.find((mvItem) => {
                    if(mvItem.acceptanceOrder.acceptanceTime) return false
                    return !mvItem.acceptanceOrder.orderNumber || mvItem.acceptanceOrder.orderNumber == ""
                 })
            }
            //If not, create a new movement
            if(!movementAsset) {
                movementAsset = {}
                cnAsset.movements.push(movementAsset)
            }
            //If the ordering and acceptance parties are not indicated in the acceptance order they are taken by default from the container asset
            if(movement.acceptanceOrder) {
                movement.acceptanceOrder.orderingParty = movement.acceptanceOrder.orderingParty || cnAsset.dischargeShippingAgent
                movement.acceptanceOrder.releaseParty = movement.acceptanceOrder.releaseParty || cnAsset.dischargeTerminalOperator
                this.acceptanceOrder(movement, movementAsset, cnAsset, blAsset, events)
            }
            containerRegistry.update(cnAsset)
            //Generate events
            events.forEach(event => emit(event))
            return cnAsset
        }
    },

    /** 
     * Method to transport a container. 
     * The transport order can be made by the PCS, or the blHolder for merchant haulage or by the shipping agent otherwise 
     * @param {String} cnId The container id
     * @param {Movement} movement The movement details
     */
    containerTransport: async function(cnId, movement) {
        let blRegistry = await getAssetRegistry(blUri)
        let containerRegistry = await getAssetRegistry(cnUri)
        var exist = await containerRegistry.exists(cnId)
        if(exist) {
            let cnAsset = await containerRegistry.get(cnId)
            let blId = cnId.substr(cnId.indexOf("@")+1)
            let blAsset = await blRegistry.get(blId) 
            //The Bl asset may not exist if it has been registered only in the discharge operation (normally for empty containers)
            if(!blAsset) blAsset = {}
            //Check in the movement was already registered
            let movements = cnAsset.movements
            let events = new Array()
            let movementAsset = movements.find((mvItem) => {
                return mvItem.transportOrder.orderNumber == movement.transportOrder.orderNumber
            })
            //If not, check if there is any movement with the related release order 
            if(!movementAsset) {
                if(movement.releaseOrder && movement.releaseOrder.orderNumber) {
                    movementAsset = movements.find((mvItem) => {
                        if(mvItem.releaseOrder.releaseTime) return false
                        if(!mvItem.releaseOrder) return false
                        return mvItem.releaseOrder.orderNumber == movement.releaseOrder.orderNumber
                     })    
                }
            }
            //If not, check if there is any movement with the related acceptance order 
            if(!movementAsset) {
                if(movement.acceptanceOrder && movement.acceptanceOrder.orderNumber) {
                    movementAsset = movements.find((mvItem) => {
                        if(!mvItem.releaseOrder) return false
                        return mvItem.releaseOrder.orderNumber == movement.releaseOrder.orderNumber
                     })    
                }
            }
            //If not, check if there is any movement without a transport order 
            if(!movementAsset) {
                movementAsset = movements.find((mvItem) => {
                    if(mvItem.transportOrder.shipmentTime || mvItem.transportOrder.deliveryTime) 
                        return false
                    return !mvItem.transportOrder.orderNumber || mvItem.transportOrder.orderNumber == ""
                 })
            }
            //If not, create the movemement
            if(!movementAsset) {
                movementAsset = {}
                movementAsset = blAsset.transportType
                cnAsset.movements.push(movementAsset)
            }
            let currentParticipant = getCurrentParticipant()
            //If merchant haulage the transport shall be ordered by the blHolder
            if(movementAsset.transportType == "MERCHANT") {
                movement.transportOrder = blAssset.blHolder
                if(!partyController.isPCS(currentParticipant) && !partyController.compareOffices(currentParticipant, blAsset.blHolder.office))
                    throw new Error("A merchant haulage transport order can only be generated by the blHolder")
            } else if(!partyController.isPCS(currentParticipant) && !partyController.compareOffices(currentParticipant, blAsset.dischargeShippingAgent.office)) {
                    throw new Error("A carrier/agent haulage transport order can only be generated by the shipping agent")
            }
            if(movement.transportOrder) {
                movement.transportOrder.orderingParty = movement.transportOrder.orderingParty || cnAsset.dischargeShippingAgent
                movement.transportOrder.forwardingParty = movement.transportOrder.forwardingParty || blAsset.blHolder
                movement.transportOrder.sender = movement.transportOrder.sender || movement.releaseOrder.releaseParty
                movement.transportOrder.receiverParty = movement.transportOrder.receiverParty || blAsset.consignee
                this.transportOrder(movement, movementAsset, cnAsset, blAsset, events)
            } 
            containerRegistry.update(cnAsset)
            //Generate events
            events.forEach(event => emit(event))
            return cnAsset
        } else {
            throw Error(`Container ${cnId} does not exist`)
        }
    },

    /** 
     * Method to subcontract transport 
     * The new transport order can be made by the carrier of the movement (movement type will be always carrier haulage) or the PCS
     * When subcontracting it is enough to indicate in the subcontracted movement:
     *   -indicate the release order number to transfer the container release order to the subcontractor
     *   -indicate the acceptance order number to transfer the container acceptance order number to the subcontractor
     *   -indicate the transport order number, date and new carrier. 
     * The rest of the data elements will be transferred from the main order.
     * If there are new release or acceptance parties in the movement it will be necesary to create new release and acceptance orders by the carrier 
     * @param {Movement} movement The current movement details that will be subcontracted (totally or partially)
     * @param {Movement} subcontractMovement The subcontracted movement details
     */
    subcontractTransport: async function(movement, subcontractedMovement) {
        let containerRegistry = await getAssetRegistry(cnUri)
        if(!movement.transportOrder || !movement.transportOrder.orderNumber || !movement.transportOrder.orderingParty || !movement.transportOrder.orderingParty.organization.code)
            throw new Error("To subcontract a movement it is required to include the order and ordering organization code in the transport order")
        //Subcontracted movement is carrier haulage (being the contractor the carrier of the main transport) 
        movement.transportType = "CARRIER"
        //Get the container asset of the main movement
        let orderId = `${movement.transportOrder.orderNumber}@${movement.transportOrder.orderingParty.organization.code}`
        let cnAssets = await query('GetTransportOrders', {orderid: orderId})
        if(cnAssets.length == 0 ) {
            throw new Error(`Transport Order ${orderId} to subcontract not found`)
        } else if(cnAssets.length > 1) {
            throw new Error(`Transport Order ${orderId} is not unique.`)
        } 
        let cnAsset = cnAssets[0]
        let cnId = cnAsset.cnId
        let blId = cnId.substr(cnId.indexOf("@")+1)
        let blAsset = await blRegistry.get(blId) 
        //Get the main movement
        let movements = cnAsset.movements
        let movementAsset = movements.find((mvItem) => {
            return mvItem.transportOrder.orderNumber == movement.transportOrder.orderNumber
        })
        let currentParticipant = getCurrentParticipant()
        //Subcontractor shall be the carrier of the main order
        if(!partyController.isPCS(currentParticipant) && !partyController.compareOffices(currentParticipant, movmentAsset.carrier.office))
            throw new Error("Subcontractor shall be the carrier of the main order")
        //When subcontracting the ordering party will be always the carrier of the main order
        subcontractedMovement.transportOrder.orderingParty = movementAsset.transportOrder.carrier
        //Get the subcontracted movement
        let subcontractOrderId = `${subcontratedMovement.transportOrder.orderNumber}@${subcontratedMovement.transportOrder.orderingParty.organization.code}`
        cnAssets = await query('GetTransportOrders', {orderid: subcontractOrderId})
        let events = new Array()
        let eventName = ""
        var subcontractMovementAsset
        if(cnAssets.length == 0 ) {
            eventName = "TransportSubcontractCreated"
            subcontractMovementAsset = {}
            movementAsset.movements.push(subcontracteMovementAsset)
        } else if(cnAssets.length == 1) {
            if(cnAssets[0].cnId != cnAsset.cnId)
                throw Error(`The subcontracted order ${subcontractOrderId} is not for main transport order ${orderId}`)
            eventName = "TransportSubcontractChanged"
            subcontractMovementAsset = movementAsset.movements.find((mvItem) => {
                return mvItem.transportOrder.orderNumber == subcontratedMovement.transportOrder.orderNumber 
            })
        } else if(cnAssets.length > 1) {
            throw new Error(`Subcontracted transport Order ${subcontractOrderId} is not unique.`)
        } 
        //Assign values in the subcontracted transport order movement
        subcontractedMovement.transportOrder.forwardingParty = subcontractedMovement.transportOrder.forwardingParty || movement.transportOrder.forwardingParty
        subcontractedMovement.transportOrder.sender = subcontractedMovement.transportOrder.sender || movement.transportOrder.sender
        subcontractedMovement.transportOrder.receiverParty = subcontractedMovement.transportOrder.receiverParty || movement.transportOrder.receiverParty
        subcontractedMovement.transportOrder.requestedShipmentTime =  subcontractedMovement.transportOrder.requestedShipmentTime || movement.transportOrder.requestedShipmentTime
        subcontractedMovement.transportOrder.requestedDeliveryTime =  subcontractedMovement.transportOrder.requestedDeliveryTime || movement.transportOrder.requestedDeliveryTime
        //Create/update the subcontracted transport order
        this.transportOrder(subcontractedMovement, subcontractedMovementAsset, cnAsset, blAsset, events)
        //Transfer de release and acceptance orders to the subcontractor
        if(subcontractedMovement.releaseOrder && movement.releaseOrder && subcontractedMovement.releaseOrder.orderNumber == movement.releaseOrder.orderNumber) {
            subcontractedReleaseMovement.releaseOrder = movement.releaseOrder
        } else {
            this.releaseOrder(subcontractedMovement, subcontractMovementAsset, cnAsset, blAsset, events)
        }
        if(subcontractedMovement.acceptanceOrder && movement.acceptanceOrder 
            && subcontractedMovement.acceptanceOrder.orderNumber == movement.acceptanceOrder.orderNumber) {
            subcontractedReleaseMovement.acceptanceOrder = movement.acceptanceOrder
        } else {
            this.acceptanceOrder(subcontractedMovement, subcontractMovementAsset, cnAsset, blAsset, events)
        }
        containerRegistry.update(cnAsset)
        //Generate events
        events.forEach(event => emit(event))
        return cnAsset
    },

    /**
     * Transaction to notify the movement details of the carrier. 
     * To identify the movement it can be used the transport, release or acceptance orderId.
     * To transport a container, the release or acceptance order number may be indicated. If not, the movement will be automatically assigned
     * If transport details at release or acceptance are not indicated, they are asumed to be the same as the transportDetails
     * Payment details can be indicated in this transaction
     * This transaction can only be made by the carrier or the PCS
     * @param {MovementDetails} movementDetails The movement details indicated by the carrier
     */
    notifyMovementDetails: async function(movementDetails) {
        let containerRegistry = await getAssetRegistry(cnUri)
        //Get the container asset of the main movement
        let orderId = movementDetails.orderId
        let cnAssets = await query('GetTransportOrders', {orderid: orderId})
        //Search cnAsset
        if(cnAssets.length == 0 ) {
            cnAssets =  await query('GetReleaseOrders', {orderid: orderId})
            if(cnAssets.length == 0) {
                cnAssets = await query('GetAcceptanceOrders', {orderid: orderId})
                if(cnAssets.length == 0) {
                    throw new Error(`There is not any order ${orderId} to assign movement details`)
                } else if(cnAssets.length > 1) {
                    throw new Error(`Acceptance Order ${orderId} is not unique.`)
                }
            } else if(cnAssets.length > 1) {
                throw new Error(`Release Order ${orderId} is not unique.`)
            }
        } else if(cnAssets.length > 1) {
            throw new Error(`Transport Order ${orderId} is not unique.`)
        }
        let cnAsset = cnAssets[0]
        let cnId = cnAsset.cnId
        let blId = cnId.substr(cnId.indexOf("@")+1)
        let blAsset = await blRegistry.get(blId) 
        //Get the main movement
        let movements = cnAsset.movements
        let movementAsset = movements.find((mvItem) => {
            return mvItem.transportOrder.orderNumber == movement.transportOrder.orderNumber ||
                mvItem.releaseOrder.orderNumber == movement.releaseOrder.orderNumber ||
                mvItem.acceptanceOrder.orderNumber == movement.acceptanceOrder.orderNumber   
        })
        if(!movementDetails.releaseTransportDetails)
            movementDetails.releaseTransportDetails = movementDetails.releaseTransportDetails
        if(!movementDetails.acceptanceTransportDetails)
            movementDetails.acceptanceTransportDetails = movementDetails.releaseTransportDetails
        let events = new Array()
        this.releaseTransportDetails(movementDetails.releaseTransportDetails, movementAsset, cnAsset, blAsset, events)
        this.acceptanceTransportDetails(movementDetails.releaseTransportDetails, movementAsset, cnAsset, blAsset, events)
        this.transportDetails(movementDetails.releaseTransportDetails, movementAsset, cnAsset, blAsset, events)
        if(movementDetails.payment) {
            let bank = await partyController.updateParty(movementDetails.payment.bank)
            let oldBank 
            if(movementAsset.transportOrder.payment) {
                eventName="RegisterContainerTransportCharges"
            } else {
                eventName="ChangeContainerTransportCharges"
                oldBank = partyController.updateParty(movementAsset.transportOrder.payment.bank)
            }
            movementAsset.transportDetails.payment = movementDetails.payment
            var event = eventController.newEvent(eventName, 
                            [movementAsset.transportOrder.orderingParty.office, movementAsset.transportOrder.carrierParty.office, 
                                bank.office],
                            `${transportOrder.orderNumber}@${transportOrder.orderingParty.office.officeId}`, cnAsset, blAsset, null)
            events.push(event)
        }
        containerRegistry.update(cnAsset)
        //Generate events
        events.forEach(event => emit(event))
        return cnAsset
     }

}
