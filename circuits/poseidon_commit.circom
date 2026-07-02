pragma circom 2.1.6;

include "../node_modules/circomlib/circuits/poseidon.circom";

template PoseidonCommit() {
    signal input amount;
    signal input salt;
    signal output commitment;

    component hasher = Poseidon(2);
    hasher.inputs[0] <== amount;
    hasher.inputs[1] <== salt;
    commitment <== hasher.out;
}
