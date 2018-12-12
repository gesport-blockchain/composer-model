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

var uri = "pcs.valenciaport"
var vesselPortCallUri = "pcs.valenciaport.VesselPortCall"
var blUri = "pcs.valenciaport.BillOfLading"

/**
 * Add a vessel port call transaction .
 * This transaction can only be made by the vessel agent
 * @param {pcs.valenciaport.AddVesselPortCall} addVesselPortCall The transaction to add a vessel port call asset.
 * @transaction
 */
async function AddVesselPortCall(addVesselPortCall) {
  let vesselPortCall = addVesselPortCall.vesselPortCall
  //Important checks for creating the vessel port call
  if(!vesselPortCall.portCallNumber || !vesselPortCall.shippingAgent.organization.code) 
    throw new Error ('portCallNumber and shippingAgent.organization.code are mandatory when creating a vessel port call')  
  let vesselPortCallAsset = await vesselPortCallController.add(vesselPortCall) 
}  
  
/**
 * Change a vessel port call transaction .
 * This transaction can only be made by the vessel agent
 * @param {pcs.valenciaport.ChangeVesselPortCall} changeVesselPortCall The transactoin to change the vessel port call asset.
 * @transaction
 */
async function ChangeVesselPortCall(changeVesselPortCall) {
  let vesselPortCall = changeVesselPortCall.vesselPortCall
  //Important checks for changing the vessel port call
  if(!vesselPortCall.portCallNumber || !vesselPortCall.shippingAgent.organization.code) 
    throw new Error ('portCallNumber and shippingAgent.organization.code are mandatory when changing a vessel port call')  
  let vesselPortCallAsset = await vesselPortCallController.change(vesselPortCall) 
}  

/**
 * Cancel  a vessel port call transaction .
 * This transaction can only be made by the vessel agent
 * @param {pcs.valenciaport.CancelVesselPortCall} cancelVesselPortCall The transaction to cancel the vessel port call asset.
 * @transaction
 */
async function CancelVesselPortCall(cancelVesselPortCall) {
  let vesselPortCall = cancelVesselPortCall.vesselPortCall
  //Important checks for changing the vessel port call
  if(!vesselPortCall.portCallNumber || !vesselPortCall.shippingAgent.organization.code) 
    throw new Error ('portCallNumber and shippingAgent.organization.code are mandatory when cancelling a vessel port call')  
  let vesselPortCallAsset = await vesselPortCallController.cancel(vesselPortCall) 
}  

/**
 * Get  a vessel port call transaction.
 * @param {pcs.valenciaport.GetVesselPortCall} getVesselPortCall The transaction to get the vessel port call asset.
 * @returns {VesselPortCall} The vessel port call asset with the data that the participant can access
 * @transaction
 */
async function GetVesselPortCall(getVesselPortCall) {
  let vesselPortCall = vesselPortCallController.get(getVesselPortCall.portCallId, getCurrentParticipant())
  return vesselPortCall
}  

/**
 * Declaration for adding bls (Summary Declaration for Temporary Storage).
 * This transaction can only be made by the shipping agent representing the carrier
 * @param {pcs.valenciaport.AddBls} addBls The transaction to add BillOfLading assets.
 * @transaction
 */
async function AddBls(addBls) {
  let declaration = addBls.declaration
  //Important checks to update the vessel port call
  if(!declaration.portCallId) 
    throw new Error ('portCalId is mandatory when adding a declaration')  
  let billOfLadingRegistry = await getAssetRegistry(blUri)
  let shippingAgent = await partyController.updateParty(declaration.shippingAgent)
  let vesselPortCallAsset = await vesselPortCallController.addBls(declaration)
  for(bl of declaration.bls) {
    if(!bl.blNumber || !bl.carrier.organization.code) 
        throw new Error ('blNumber and carrier.organization.code are mandatory when creating a bill of lading')
    bl.shippingAgent = declaration.shippingAgent
    if(!bl.dischargeTerminalOperator)
      bl.dischargeTerminalOperator = declaration.dischargeTerminalOperator  
    let blAsset = await billOfLadingController.add(bl, declaration.portCallId, declaration.summaryDeclarationNumber, shippingAgent)
  }   
}  

/**
 * Declaration for changing bls (Summary Declaration for Temporary Storage).
 * This transaction can only be made by the shipping agent
 * @param {pcs.valenciaport.ChangeBls} changeBls The transaction to change BillOfLading assets.
 * @transaction
 */
async function ChangeBls(changeBls) {
  let declaration = changeBls.declaration
  //Important checks to update the vessel port call
  if(!declaration.portCallId) 
    throw new Error ('portCalId is mandatory when adding a declaration')  
  let vesselPortCallAsset = await vesselPortCallController.changeBls(declaration)
  for(bl of declaration.bls) {
    if(!bl.blNumber || !bl.carrier.organization.code) 
      throw new Error ('blNumber and carrier.organization.code are mandatory when updating a bill of lading')  
    if(!bl.dischargeTerminalOperator)
      bl.dischargeTerminalOperator = declaration.dischargeTerminalOperator  
    let blAsset = await billOfLadingController.change(bl)
  }   
}  

/**
 * Declaration for removing bls (Summary Declaration for Temporary Storage).
 * This transaction can only be made by the shipping agent
 * @param {pcs.valenciaport.RemoveBls} removeBls The transaction to remove BillOfLading assets.
 * @transaction
 */
async function RemoveBls(removeBls) {
  let declaration = removeBls.declaration
  //Important checks to update the vessel port call
  if(!declaration.portCallId) 
    throw new Error ('portCalId is mandatory when adding a declaration')  
  let vesselPortCallAsset = await vesselPortCallController.removeBls(declaration, vesselPortCallRegistry)
  for(bl of declaration.bls) {
    if(!bl.blNumber || !bl.carrier.organization.code) 
      throw new Error ('blNumber and carrier.organization.code are mandatory when updating a bill of lading')  
    let blAsset = await billOfLadingController.remove(bl)
  }
}
  
/**
 * Get a bill of lading transaction.
 * @param {pcs.valenciaport.GetBillOfLading} getBillOfLading The transaction to get a bill of lading asset.
 * @returns {BillOfLading} The bill of lading asset with the data that the participant can access
 * @transaction
 */
async function GetBillOfLading(getBillOfLading) {
  let billOfLading = billOfLadingController.get(getBillOfLading.blId)
  return billOfLading
}  

/**
 * Get a Container transaction.
 * @param {pcs.valenciaport.GetContainer} getContainer The transaction to get a container asset.
 * @returns {Container} The container asset with the data that the participant can access
 * @transaction
 */
async function GetContainer(getContainer) {
  let container = containerController.get(getContainer.cnId)
  return container
}  

/**
 * Notify the arrival 
 * This transaction can only be made by the shipping agent
 * If the cargo is released generates the delivery order
 * @param {pcs.valenciaport.NotifyArrival} notifyArrival The transaction for the arrival notification.
 * @transaction
 */
async function NotifyArrival(notifyArrival) {
  let arrivalNotice = notifyArrival.arrivalNotice
  //Important checks to update the bill of lading
  if(!arrivalNotice.blId) 
    throw new Error ('blId is mandatory for the arrival notice')  
  if(!arrivalNotice.blHolder)
    arrivalNotice.blHolder= arrivalNotice.consignee
  let blAsset = await billOfLadingController.arrivalNotification(arrivalNotice)
}  

/**
 * Transfers the BillOfLading to another B/L holder. This transaction can only be made by the B/L Holder or the shipping agent
 * @param {pcs.valenciaport.TransferBillOfLading} transferBillOfLading The transfer bill of lading transaction
 * @transaction
 */
async function TransferBillOfLading(transferBillOfLading) {
  //Important checks to update the bill of lading
  if(!transferBillOfLading.blId) 
    throw new Error ('blId is mandatory to transfer the bill of lading')  
  let newBLHolder = await partyController.updateParty(transferBillOfLading.newBLHolder)
  let blAsset = await billOfLadingController.transfer(transferBillOfLading.blId, newBLHolder)
  }  

  /**
 * Requests the delivery of the goods of the BillOfLading. 
 * This transaction can only be made by the B/L Holder or the shipping agent
 * @param {pcs.valenciaport.RequestDelivery} requestDelivery The transaction to request the delivery
 * @transaction
 */
async function RequestDelivery(requestDelivery) {
  //Important checks to update the bill of lading
  if(!requestDelivery.blId) 
    throw new Error ('blId is mandatory to release the cargo of the bill of lading')  
  let blAsset = await billOfLadingController.requestDelivery(requestDelivery.blId, requestDelivery.requestedDeliveryDate, 
    requestDelivery.transportType)
}  

/**
 * Notify the payment of the BillOfLading charges. 
 * This transaction can only be made by the B/L Holder or the bank office
 * @param {pcs.valenciaport.NotifyBlPayment} notifyBlPayment The transaction to notify the B/L payment
 * @transaction
 */
async function NotifyBlPayment(notifyBlPayment) {
  //Important checks to update the bill of lading
  if(!notifyBlPayment.blId) 
    throw new Error ('blId is mandatory to notify the payment of the bill of lading charges')  
  let blAsset = await billOfLadingController.notifyPayment(notifyBlPayment.blId, notifyBlPayment.paymentDate, 
    notifyBlPayment.proofOfPayment)
}  

/**
 * Transaction to register the data to release the bill of lading and determine if it shall be generated the delivery order. 
 * This transaction can only be made by the shipping agent
 * @param {pcs.valenciaport.BlRelease} blRelease The transaction to release the B/L
 * @transaction
 */
async function BlRelease(blRelease) {
  //Important checks to update the bill of lading
  if(!blRelease.blId) 
    throw new Error ('blId is mandatory to release the bill of lading')  
  let blAsset = await billOfLadingController.blRelease(blRelease.blId, blRelease.deliveryOrder)
}  

/**
 * Transaction to release a container. 
 * The movement will be automatically assigned to an existing or new container movement
 * This transaction can only be made by the shipping agent
 * @param {pcs.valenciaport.ContainerRelease} containerRelease The transaction to release a container
 * @transaction
 */
async function ContainerRelease(containerRelease) {
  //Important checks to update the container
  if(!containerRelease.cnId) 
    throw new Error ('cnId is mandatory to release the container')  
  let cnAsset = await containerController.containerRelease(containerRelease.cnId, containerRelease.movement)
}  

/**
 * Transaction to return a container. 
 * To return a container, the release order number may be indicated. If not, the movement will be automatically assigned 
 * This transaction can only be made by the shipping agent
 * @param {pcs.valenciaport.ContainerReturn} containerReturn The transaction to return a container
 * @transaction
 */
async function ContainerReturn(containerReturn) {
  //Important checks to update the container
  if(!containerReturn.cnId) 
    throw new Error ('cnId is mandatory to release the container')  
  let cnAsset = await containerController.containerReturn(containerReturn.cnId, containerReturn.movement)
}  

/**
 * Transaction to transport a container. 
 * To transport a container, the release or acceptance order number may be indicated. If not, the movement will be automatically assigned 
 * This transaction can only be made by the blHolder for merchant haulage or by the shipping agent otherwise 
 * @param {pcs.valenciaport.ContainerTransport} containerTransport The transaction to transport a container
 * @transaction
 */
async function ContainerTransport(containerTransport) {
  //Important checks to update the container
  if(!containerTransport.cnId) 
    throw new Error ('cnId is mandatory to release the container')  
  let billOfLadingRegistry = await getAssetRegistry(blUri)
  let cnAsset = await containerController.containerTransport(containerTransport.cnId, containerTransport.movement)
}  

/** 
 * Transaction to subcontract transport 
 * The new transport order can be made by the carrier of the movement (movement type will be always carrier haulage)
 * When subcontracting it is enough to indicate in the subcontracted movement:
 *   -indicate the release order number to transfer the container release order to the subcontractor
 *   -indicate the acceptance order number to transfer the container acceptance order number to the subcontractor
 *   -indicate the transport order number, date and new carrier. 
 * The rest of the data elements will be transferred from the main order.
 * If there are new release or acceptance parties in the movement it will be necesary to create new release and acceptance orders by the carrier 
 * @param {pcs.valenciaport.SubcontractTransport} subcontractTransport The transaction to subcontract the transport
 * @transaction
 */
async function SubcontractTransport(subcontractTransport) {
  let cnAsset = await containerController.containerTransport(subcontractTransport.movement, subcontractTransport.subcontractMovement)
}  

/**
 * Transaction to notify the movement details of the carrier. 
 * To identify the movement it can be used the transport, release or acceptance orderId.
 * To transport a container, the release or acceptance order number may be indicated. If not, the movement will be automatically assigned 
 * If transport details at release or acceptance are not indicated, they are asumed to be the same as the transportDetails
 * Payment details can be indicated in this transaction
 * This transaction can only be made by the carrier 
 * @param {pcs.valenciaport.NotifyMovementDetails} notifyMovementDetails The transaction to notify the movement details
 * @transaction
 */
async function NotifyMovementDetails(notifyMovementDetails) {
  //Important checks to update the container
  if(!notifyMovementDetails.movementDetails.orderId) 
    throw new Error ('orderId is mandatory to notify the movement details')  
  let cnAsset = await containerController.NotifyMovementDetails(notifyMovementDetails.movementDetails)
}  

/**
 * Transaction to cancel a release order. 
 * This transaction can only be made by the ordering party or the PCS
 * @param {pcs.valenciaport.CancelReleaseOrder} cancelReleaseOrder The transaction to cancel the release order 
 */
async function CancelReleaseOrder(cancelReleaseOrder) {

}

/**
 * Transaction to cancel an acceptance order. 
 * This transaction can only be made by the ordering party or the PCS
 * @param {pcs.valenciaport.CancelAcceptanceOrder} cancelAcceptanceOrder The transaction to cancel the acceptance order 
 */
async function CancelAcceptanceOrder(cancelAcceptanceOrder) {
  
}

/**
 * Transaction to cancel a transportOrder. 
 * This transaction can only be made by the ordering party or the PCS
 * @param {pcs.valenciaport.CancelTransportOrder} cancelTransportOrder The transaction to cancel the transport order 
 */
async function CancelTransportOrder(cancelTransportOrder) {
  
}

async function ReleaseNotification(releaseNotification) {

}

async function AcceptanceNotification(acceptanceNotification) {

}

