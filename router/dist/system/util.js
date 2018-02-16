// tslint:disable:function-name
// tslint:disable:no-parameter-reassignment
System.register([], function (exports_1, context_1) {
    "use strict";
    var __moduleName = context_1 && context_1.id;
    function _normalizeAbsolutePath(path, hasPushState, absolute = false) {
        if (!hasPushState && path[0] !== "#") {
            path = `#${path}`;
        }
        if (hasPushState && absolute) {
            path = path.substring(1, path.length);
        }
        return path;
    }
    exports_1("_normalizeAbsolutePath", _normalizeAbsolutePath);
    function _createRootedPath(fragment, baseUrl, hasPushState, absolute) {
        if (isAbsoluteUrl.test(fragment)) {
            return fragment;
        }
        let path = "";
        if (baseUrl.length && baseUrl[0] !== "/") {
            path += "/";
        }
        path += baseUrl;
        if ((!path.length || path[path.length - 1] !== "/") && fragment[0] !== "/") {
            path += "/";
        }
        if (path.length && path[path.length - 1] === "/" && fragment[0] === "/") {
            path = path.substring(0, path.length - 1);
        }
        return _normalizeAbsolutePath(path + fragment, hasPushState, absolute);
    }
    exports_1("_createRootedPath", _createRootedPath);
    function _resolveUrl(fragment, baseUrl, hasPushState) {
        if (isRootedPath.test(fragment)) {
            return _normalizeAbsolutePath(fragment, hasPushState);
        }
        return _createRootedPath(fragment, baseUrl, hasPushState);
    }
    exports_1("_resolveUrl", _resolveUrl);
    var isRootedPath, isAbsoluteUrl;
    return {
        setters: [],
        execute: function () {
            isRootedPath = /^#?\//;
            isAbsoluteUrl = /^([a-z][a-z0-9+\-.]*:)?\/\//i;
        }
    };
});
//# sourceMappingURL=util.js.map