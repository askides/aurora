const dropProtocol = (url) => url.replace(/(^\w+:|^)\/\//, "").replace("www.", "");

module.exports = { dropProtocol };
