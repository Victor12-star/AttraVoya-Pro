/**
 * Public emergency records are a verified reference-data contract, not a live
 * provider response. Only VERIFIED, published, country-wide records with
 * provenance and a verification timestamp may cross this public boundary.
 *
 * @typedef {object} PublicEmergencyRecord
 * @property {string} id
 * @property {string} service
 * @property {string} serviceLabel
 * @property {string} phoneNumber
 * @property {string} sourceName
 * @property {string} sourceUrl
 * @property {string} lastVerifiedAt
 */

export {};
