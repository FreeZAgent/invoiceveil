pragma circom 2.1.6;

include "./range_check.circom";
include "./poseidon_commit.circom";

template InvoiceRange() {
    signal input amount;
    signal input salt;

    signal input lo_bound;
    signal input hi_bound;
    signal input commitment;

    component range = RangeCheck(64);
    range.value <== amount;
    range.lo <== lo_bound;
    range.hi <== hi_bound;

    component commit = PoseidonCommit();
    commit.amount <== amount;
    commit.salt <== salt;
    commit.commitment === commitment;
}

component main { public [lo_bound, hi_bound, commitment] } = InvoiceRange();
