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
var blUri = "net.gesport.BillOfLading"

/**
 * Add a vessel port call transaction .
 * This transaction can only be made by the vessel agent
 * @param {net.gesport.AddVesselPortCall} addVesselPortCall -The transaction to add a vessel port call asset.
 * @transaction
 */
async function AddVesselPortCall(addVesselPortCall) {
  let vesselPortCall = addVesselPortCall.vesselPortCall
  //Important checks for creating the vessel port call
  if(!vesselPortCall.portCallNumber || !vesselPortCall.vesselAgent.organization.code) 
    throw new Error ('portCallNumber and vesselAgent.organization.code are mandatory when creating a vessel port call')  
  let vesselPortCallAsset = await vesselPortCallController.add(vesselPortCall) 
}  
  
/**
 * Change a vessel port call transaction .
 * This transaction can only be made by the vessel agent
 * @param {net.gesport.ChangeVesselPortCall} changeVesselPortCall -The transactoin to change the vessel port call asset.
 * @transaction
 */
async function ChangeVesselPortCall(changeVesselPortCall) {
  let vesselPortCall = changeVesselPortCall.vesselPortCall
  //Important checks for changing the vessel port call
  if(!vesselPortCall.portCallNumber) 
    throw new Error ('portCallNumber is mandatory when changing a vessel port call')  
  let vesselPortCallAsset = await vesselPortCallController.change(vesselPortCall) 
}  

/**
 * Cancel  a vessel port call transaction .
 * This transaction can only be made by the vessel agent
 * @param {net.gesport.CancelVesselPortCall} cancelVesselPortCall -The transaction to cancel the vessel port call asset.
 * @transaction
 */
async function CancelVesselPortCall(cancelVesselPortCall) {
  let vesselPortCall = cancelVesselPortCall.vesselPortCall
  //Important checks for cancelling the vessel port call
  if(!vesselPortCall.portCallNumber) 
    throw new Error ('portCallNumber is mandatory when cancelling a vessel port call')  
  let vesselPortCallAsset = await vesselPortCallController.cancel(vesselPortCall) 
}  

/**
 * Notifies the arrival of a vessel
 * @param {net.gesport.VesselArrived} vesselArrived -The vessel arrival transaction
 * @transaction
 */
async function VesselArrived(vesselArrived) {
  let vesselPortCall = vesselArrived.vesselPortCall
  //Important checks for notifying arrival
  if(!vesselArrived.portCallId) 
    throw new Error ('portCallId is mandatory when notifying the vessel arrival')  
  let vesselPortCallAsset = await vesselPortCallController.vesselArrived(vesselArrived.portCallId, vesselArrived.arrivalTime) 
}  

/**
 * Get  a vessel port call transaction.
 * @param {net.gesport.GetVesselPortCall} getVesselPortCal -The transaction to get the vessel port call asset.
 * @returns {VesselPortCall} -The vessel port call asset with the data that the participant can access
 * @transaction
 */
async function GetVesselPortCall(getVesselPortCall) {
  let vesselPortCall = vesselPortCallController.get(getVesselPortCall.portCallId, getCurrentParticipant())
  return vesselPortCall
}  

/**
 * Declaration for adding bls (Summary Declaration for Temporary Storage).
 * This transaction can only be made by the shipping agent representing the carrier
 * @param {net.gesport.AddBls} addBls -The transaction to add BillOfLading assets.
 * @transaction
 */
async function AddBls(addBls) {
  let declaration = addBls.declaration
  //Important checks to update the vessel port call
  if(!declaration.portCallId) 
    throw new Error ('portCalId is mandatory when adding a declaration')  
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
 * @param {net.gesport.ChangeBls} changeBls -The transaction to change BillOfLading assets.
 * @transaction
 */
async function ChangeBls(changeBls) {
  let declaration = changeBls.declaration
  //Important checks to update the vessel port call
  if(!declaration.portCallId)
    throw new Error ('portCalId is mandatory when adding a declaration')  
  let shippingAgent = await partyController.updateParty(declaration.shippingAgent)
  let vesselPortCallAsset = await vesselPortCallController.changeBls(declaration)
  for(bl of declaration.bls) {
    if(!bl.blNumber || !bl.carrier.organization.code) 
      throw new Error ('blNumber and carrier.organization.code are mandatory when updating a bill of lading')  
    if(!bl.dischargeTerminalOperator)
      bl.dischargeTerminalOperator = declaration.dischargeTerminalOperator  
    let blAsset = await billOfLadingController.change(bl, declaration.portCallId, declaration.summaryDeclarationNumber, shippingAgent)
  }
}  

/**
 * Declaration for removing bls (Summary Declaration for Temporary Storage).
 * This transaction can only be made by the shipping agent
 * @param {net.gesport.RemoveBls} removeBls -The transaction to remove BillOfLading assets.
 * @transaction
 */
async function RemoveBls(removeBls) {
  let declaration = removeBls.declaration
  //Important checks to update the vessel port call
  if(!declaration.portCallId) 
    throw new Error ('portCalId is mandatory when adding a declaration')  
  let vesselPortCallAsset = await vesselPortCallController.removeBls(declaration)
  for(bl of declaration.bls) {
    if(!bl.blNumber || !bl.carrier.organization.code) 
      throw new Error ('blNumber and carrier.organization.code are mandatory when updating a bill of lading')
    let blAsset = await billOfLadingController.remove(bl)
  }
}
  

/**
 * Declaration for adding goods items (Summary Declaration for Temporary Storage).
 * This transaction can only be made by the shipping agent representing the carrier
 * @param {net.gesport.AddGoodsItems} addGoodsItems -The transaction to add goods items in BillOfLading assets.
 * @transaction
 */
async function AddGoodsItems(addGoodsItems) {
  let declaration = addGoodsItems.declaration
  //Important checks to update the vessel port call
  if(!declaration.portCallId) 
    throw new Error ('portCalId is mandatory when adding a declaration')  
  let shippingAgent = await partyController.updateParty(declaration.shippingAgent)
  let blIds = []
  for(bl of declaration.bls) {
    if(!bl.blNumber || !bl.carrier.organization.code) 
        throw new Error ('blNumber and carrier.organization.code are mandatory when adding goods items in a bill of lading')
    bl.shippingAgent = declaration.shippingAgent
    if(!bl.dischargeTerminalOperator)
      bl.dischargeTerminalOperator = declaration.dischargeTerminalOperator  
    let blAsset = await billOfLadingController.addGoodsItems(bl, declaration.portCallId, declaration.summaryDeclarationNumber, shippingAgent)
    //The result of addign new goods items can be the addition of a B/L
    if (blAsset.status == "NEW") {
		blIds.push(`${blAsset.blNumber}@${blAsset.carrier.organization.code}`)      
    } 
  }   
  let vesselPortCallAsset = await vesselPortCallController.addBls(declaration, blIds)
}  

/**
 * Declaration for changing goods items (Summary Declaration for Temporary Storage).
 * This transaction can only be made by the shipping agent representing the carrier
 * @param {net.gesport.ChangeGoodsItems} changeGoodsItems -The transaction to add goods items in BillOfLading assets.
 * @transaction
 */
async function ChangeGoodsItems(changeGoodsItems) {
  let declaration = changeGoodsItems.declaration
  //Important checks to update the vessel port call
  if(!declaration.portCallId) 
    throw new Error ('portCalId is mandatory when adding a declaration')  
  let shippingAgent = await partyController.updateParty(declaration.shippingAgent)
  let blIds = []
  for(bl of declaration.bls) {
    if(!bl.blNumber || !bl.carrier.organization.code) 
        throw new Error ('blNumber and carrier.organization.code are mandatory when changing goods items in a bill of lading')
    bl.shippingAgent = declaration.shippingAgent
    if(!bl.dischargeTerminalOperator)
      bl.dischargeTerminalOperator = declaration.dischargeTerminalOperator  
    let blAsset = await billOfLadingController.changeGoodsItems(bl, declaration.portCallId, declaration.summaryDeclarationNumber, shippingAgent)
  }   
  let vesselPortCallAsset = await vesselPortCallController.addBls(declaration, blIds)
}  

/**
 * Declaration for removing goods items (Summary Declaration for Temporary Storage).
 * This transaction can only be made by the shipping agent representing the carrier
 * @param {net.gesport.RemoveGoodsItems} removeGoodsItems -The transaction to add goods items in BillOfLading assets.
 * @transaction
 */
async function RemoveGoodsItems(removeGoodsItems) {
  let declaration = removeGoodsItems.declaration
  //Important checks to update the vessel port call
  if(!declaration.portCallId) 
    throw new Error ('portCalId is mandatory when adding a declaration')  
  let shippingAgent = await partyController.updateParty(declaration.shippingAgent)
  let blIds = []
  for(bl of declaration.bls) {
    if(!bl.blNumber || !bl.carrier.organization.code) 
        throw new Error ('blNumber and carrier.organization.code are mandatory when creating a bill of lading')
    bl.shippingAgent = declaration.shippingAgent
    if(!bl.dischargeTerminalOperator)
      bl.dischargeTerminalOperator = declaration.dischargeTerminalOperator  
    let blAsset = await billOfLadingController.removeGoodsItems(bl, declaration.portCallId, declaration.summaryDeclarationNumber, shippingAgent)
    //The result of addign new goods items can be the addition of a B/L
    if (blAsset.status == "CANCELLED") {
		blIds.push(`${blAsset.blNumber}@${blAsset.carrier.organization.code}`)      
		let vesselPortCallAsset = await vesselPortCallController.removeBls(declaration, blIds)
    } 
  }   
}  

/**
 * Get a bill of lading transaction.
 * @param {net.gesport.GetBillOfLading} getBillOfLading The transaction to get a bill of lading asset.
 * @returns {BillOfLading} -The bill of lading asset with the data that the participant can access
 * @transaction
 */
async function GetBillOfLading(getBillOfLading) {
  let billOfLading = billOfLadingController.get(getBillOfLading.blId)
  return billOfLading
}  

/**
 * Get a Container transaction.
 * @param {net.gesport.GetContainer} getContainer -The transaction to get a container asset.
 * @returns {Container} -The container asset with the data that the participant can access
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
 * @param {net.gesport.NotifyArrival} notifyArrival -The transaction for the arrival notification.
 * @transaction
 */
async function NotifyArrival(notifyArrival) {
  let arrivalNotice = notifyArrival.arrivalNotice
  let charges = notifyArrival.charges
  //Important checks to update the bill of lading
  if(!arrivalNotice.blId) 
    throw new Error ('blId is mandatory for the arrival notice')  
  if(!arrivalNotice.blHolder)
    arrivalNotice.blHolder= arrivalNotice.consignee
  let blAsset = await billOfLadingController.arrivalNotification(arrivalNotice, charges)
}  

/**
 * Transfers the BillOfLading to another B/L holder. This transaction can only be made by the B/L Holder or the shipping agent
 * @param {net.gesport.TransferBillOfLading} transferBillOfLading The transfer bill of lading transaction
 * @transaction
 */
async function TransferBillOfLading(transferBillOfLading) {
  //Important checks to update the bill of lading
  if(!transferBillOfLading.blId) 
    throw new Error ('blId is mandatory to transfer the bill of lading')
  let newBLHolder = await partyController.updateParty(transferBillOfLading.newBLHolder)
  let blAsset = await billOfLadingController.transfer(transferBillOfLading.blId, newBLHolder)
  }  

