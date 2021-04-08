const dropProtocol = (url) => url.replace(/(^\w+:|^)\/\//, "");

module.exports = { dropProtocol };
