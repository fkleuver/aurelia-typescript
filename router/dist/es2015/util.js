// tslint:disable:function-name
// tslint:disable:no-parameter-reassignment
export function _normalizeAbsolutePath(path, hasPushState, absolute = false) {
    if (!hasPushState && path[0] !== "#") {
        path = `#${path}`;
    }
    if (hasPushState && absolute) {
        path = path.substring(1, path.length);
    }
    return path;
}
export function _createRootedPath(fragment, baseUrl, hasPushState, absolute) {
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
export function _resolveUrl(fragment, baseUrl, hasPushState) {
    if (isRootedPath.test(fragment)) {
        return _normalizeAbsolutePath(fragment, hasPushState);
    }
    return _createRootedPath(fragment, baseUrl, hasPushState);
}
const isRootedPath = /^#?\//;
const isAbsoluteUrl = /^([a-z][a-z0-9+\-.]*:)?\/\//i;
//# sourceMappingURL=util.js.map