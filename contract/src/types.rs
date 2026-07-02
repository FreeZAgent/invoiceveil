use soroban_sdk::{
    contracttype,
    crypto::bn254::{Bn254G1Affine, Bn254G2Affine, Fr},
    Address, BytesN, Vec,
};

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Proof {
    pub a: Bn254G1Affine,
    pub b: Bn254G2Affine,
    pub c: Bn254G1Affine,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct PublicSignals {
    pub commitment: BytesN<32>,
    pub lo_bound: u64,
    pub hi_bound: u64,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct VerificationKey {
    pub alpha: Bn254G1Affine,
    pub beta: Bn254G2Affine,
    pub gamma: Bn254G2Affine,
    pub delta: Bn254G2Affine,
    pub ic: Vec<Bn254G1Affine>,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct VerifierInputs {
    pub inputs: Vec<Fr>,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum InvoiceStatus {
    Pending,
    Settled,
    Cancelled,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Invoice {
    pub id: u64,
    pub payer: Address,
    pub payee: Address,
    pub lo_bound: u64,
    pub hi_bound: u64,
    pub commitment: BytesN<32>,
    pub status: InvoiceStatus,
}

#[contracttype]
pub enum DataKey {
    NextId,
    Admin,
    VerificationKey,
    Invoice(u64),
}
