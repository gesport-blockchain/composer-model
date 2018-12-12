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
var officeUri = "net.valenciaportpcs.Office"

/**
 * Controller class for Parties and Office participants
 */
var partyController = {
  
    /** 
     * Method to add a VesselPortCall asset from a vessel port call transaction
     * @param {Party} party The party participating in a transaction
     */
    updateParty: async function(party) {
        if(!party) return null
        if(!party.organization.code) return null
        if(!party.office) {
            if(!party.officeCode)
                party.officeCode=""
            //If there is not an Office participant reference in the Party, let's look and assign one
            let offices = await query('GetOffice', {organizationCode: party.organization.code, officeCode: party.officeCode})
            if(offices.length==1) {
                let office = offices[0]
                party.office =  office
                party.organization = party.organization || office.organization
                party.organization.name = party.organization.name || office.organization.name
                party.address = party.address || office.address
                party.email = party.email || office.email
                party.phone = party.phone || office.phone
            }
        } else {
            //If there is already an Office participant reference in the Party, only update data if necessary
            let officeRegistry = await getParticipantRegistry(officeUri)
            let office = await officeRegistry.getId(party.office.officeId)
            party.organization = party.organization || office.organization
            party.organization.name = party.organization.name || office.organization.name
            party.address = party.address || office.address
            party.email = party.email || office.email
            party.phone = party.phone || office.phone
        }
        return party
    },

    getParticipantParty: async function(currentParticipant) {
        let officeRegistry = await getParticipantRegistry(officeUri)
        let office = await officeRegistry.getId(party.office.officeId)
        return office
    },

    checkOldParty: function(oldParty, newParty, oldParties)  {
        if(oldParty) {
            if(!newParty) {
                oldParties.push(oldParty.office)
            } else if(oldParty.organization.code != newParty.organization.code || oldParty.officeCode != newParty.officeCode) {
                oldParties.push(oldParty.office)
            }
        }
        return oldParties
    },

    isPCS: function(office) {
        return office.types.indexOf("PCS") > -1
    },

    isAgentOf: function(agent, company) {
        return agent.agentOf.indexOf(company.organization.code) > -1
    },

    //The string conversion of a resource returns "RESOURCE {resourceId}" while the string conversion of a 
    //resource link returns "LINK {resourceId}". With this function we can compare two offices {resourceId}
    //independently if they are a RESOURCE or a LINK
    compareOffices: function(office1, office2) {
        return `${office1}`.match("\\{.*}") == `${office2}`.match("\\{.*}")
    }
  
  }
  