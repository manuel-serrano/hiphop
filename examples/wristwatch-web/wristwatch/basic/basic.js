//====================
// Auxiliary functions
//====================

// Boolean functions
//------------------

// Boolean negation

function bnot (b) {
    if (b) {
	return false;
    } else {
	return true;
    }
}
exports.bnot = bnot;

// Integer functions
//------------------

// Adding two numbers

function plus (m, n) {
   return m+n;
}
exports.plus = plus;
