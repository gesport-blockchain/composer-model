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
var paymentUri = "net.gesport.Payment"

/**
 * Controller class for Payment assets
 */
var paymentController = {

    /** 
     * Method to create the freight charges in a new payment asset
     * If the charges are replaced, added or removed, use the respective function.
     * A payment asset will be associated with a single invoice. When a new invoice is created, a new Payment asset needs to be created
     * @param {String} paymentId -The payment id
     * @param {FreightCharges} freightCharges -The freight charges
     * @returns {Payment} The payment asset 
     */
    createFreightCharges: async function(paymentId, freightCharges) {
        let paymentRegistry = await getAssetRegistry(paymentUri)
        var exist = await paymentRegistry.exists(paymentId)
        if(exist) {
            throw new Error(`The payment ${paymentId} cannot be created because it already exists, consider to use the change transaction`)
        } else {
            //If the asset does not exist then create a new asset
            var factory = getFactory()
            var paymentAsset = factory.newResource(uri, "Payment", paymentId);
            //Mapping of the properties from the transaction towards the asset
            Object.assign(paymentAsset, {
              	version: "1",
                status: "REGISTERED",
                from: freightCharges.from,
                to: freightCharges.to,
                issueDate: freightCharges.issueDate,
                dueDate: freightCharges.dueDate,
                invoiceNumber: freightCharges.invoiceNumber,
                subject: freightCharges.subject,
                references: freightCharges.references,
                exchange: freightCharges.exchange,
                charges: freightCharges.charges,
                subtotal: freightCharges.subtotal,
                taxes: freightCharges.taxes,
                total: freightCharges.total,
                paymentMethod: freightCharges.paymentMethod,
                bankAccount: freightCharges.bankAccount,
                bank: freightCharges.bank
            })
            await paymentRegistry.add(paymentAsset)
            var event = await eventController.paymentEvent("ORDER", "CREATE", paymentAsset.paymentId,
                           [paymentAsset.from, paymentAsset.to, 
                            paymentAsset.bank])
            return paymentAsset
        }
    }
}
