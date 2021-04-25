const percentage = (n, t) => (n / t) * 100;

const sum = (args = []) => args.reduce((acc, el) => acc + el, 0);

module.exports = { percentage, sum };
