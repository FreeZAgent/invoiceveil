pragma circom 2.1.6;

include "../node_modules/circomlib/circuits/comparators.circom";
include "../node_modules/circomlib/circuits/bitify.circom";

// Proves lo <= value <= hi with n-bit precision.
template RangeCheck(n) {
    signal input value;
    signal input lo;
    signal input hi;

    component bits = Num2Bits(n);
    bits.in <== value;

    component loCmp = LessEqThan(n);
    loCmp.in[0] <== lo;
    loCmp.in[1] <== value;
    loCmp.out === 1;

    component hiCmp = LessEqThan(n);
    hiCmp.in[0] <== value;
    hiCmp.in[1] <== hi;
    hiCmp.out === 1;
}
