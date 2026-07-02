use soroban_sdk::{BytesN, Env};

use crate::types::{DataKey, Invoice};

pub fn load_invoice(env: &Env, id: u64) -> Invoice {
    env.storage()
        .persistent()
        .get(&DataKey::Invoice(id))
        .expect("invoice not found")
}

pub fn save_invoice(env: &Env, invoice: &Invoice) {
    env.storage()
        .persistent()
        .set(&DataKey::Invoice(invoice.id), invoice);
}

pub fn empty_commitment(env: &Env) -> BytesN<32> {
    BytesN::from_array(env, &[0u8; 32])
}
