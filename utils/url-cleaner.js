const clean = (url) => url.replace(/(^\w+:|^)\/\//, "");

module.exports = clean;
