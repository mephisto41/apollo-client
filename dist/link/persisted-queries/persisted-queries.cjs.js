'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var tslib = require('tslib');
var graphql = require('graphql');
var tsInvariant = require('ts-invariant');
require('fast-json-stable-stringify');
var Observable = _interopDefault(require('zen-observable'));
require('symbol-observable');

function getOperationName(doc) {
    return (doc.definitions
        .filter(function (definition) {
        return definition.kind === 'OperationDefinition' && definition.name;
    })
        .map(function (x) { return x.name.value; })[0] || null);
}

Observable.prototype['@@observable'] = function () { return this; };

function iterateObserversSafely(observers, method, argument) {
    var observersWithMethod = [];
    observers.forEach(function (obs) { return obs[method] && observersWithMethod.push(obs); });
    observersWithMethod.forEach(function (obs) { return obs[method](argument); });
}

function isPromiseLike(value) {
    return value && typeof value.then === "function";
}
var Concast = (function (_super) {
    tslib.__extends(Concast, _super);
    function Concast(sources) {
        var _this = _super.call(this, function (observer) {
            _this.addObserver(observer);
            return function () { return _this.removeObserver(observer); };
        }) || this;
        _this.observers = new Set();
        _this.promise = new Promise(function (resolve, reject) {
            _this.resolve = resolve;
            _this.reject = reject;
        });
        _this.handlers = {
            next: function (result) {
                if (_this.sub !== null) {
                    _this.latest = ["next", result];
                    iterateObserversSafely(_this.observers, "next", result);
                }
            },
            error: function (error) {
                if (_this.sub !== null) {
                    if (_this.sub)
                        _this.sub.unsubscribe();
                    _this.sub = null;
                    _this.latest = ["error", error];
                    _this.reject(error);
                    iterateObserversSafely(_this.observers, "error", error);
                }
            },
            complete: function () {
                if (_this.sub !== null) {
                    var value = _this.sources.shift();
                    if (!value) {
                        _this.sub = null;
                        if (_this.latest &&
                            _this.latest[0] === "next") {
                            _this.resolve(_this.latest[1]);
                        }
                        else {
                            _this.resolve();
                        }
                        iterateObserversSafely(_this.observers, "complete");
                    }
                    else if (isPromiseLike(value)) {
                        value.then(function (obs) { return _this.sub = obs.subscribe(_this.handlers); });
                    }
                    else {
                        _this.sub = value.subscribe(_this.handlers);
                    }
                }
            },
        };
        _this.cancel = function (reason) {
            _this.reject(reason);
            _this.sources = [];
            _this.handlers.complete();
        };
        _this.promise.catch(function (_) { });
        if (isPromiseLike(sources)) {
            sources.then(function (iterable) { return _this.start(iterable); }, _this.handlers.error);
        }
        else {
            _this.start(sources);
        }
        return _this;
    }
    Concast.prototype.start = function (sources) {
        if (this.sub !== void 0)
            return;
        this.sources = Array.from(sources);
        this.handlers.complete();
    };
    Concast.prototype.addObserver = function (observer) {
        if (!this.observers.has(observer)) {
            if (this.latest) {
                var nextOrError = this.latest[0];
                var method = observer[nextOrError];
                if (method) {
                    method.call(observer, this.latest[1]);
                }
                if (this.sub === null &&
                    nextOrError === "next" &&
                    observer.complete) {
                    observer.complete();
                }
            }
            this.observers.add(observer);
        }
    };
    Concast.prototype.removeObserver = function (observer, quietly) {
        if (this.observers.delete(observer) &&
            this.observers.size < 1) {
            if (quietly)
                return;
            if (this.sub) {
                this.sub.unsubscribe();
                this.reject(new Error("Observable cancelled prematurely"));
            }
            this.sub = null;
        }
    };
    Concast.prototype.cleanup = function (callback) {
        var _this = this;
        var called = false;
        var once = function () {
            if (!called) {
                called = true;
                _this.observers.delete(observer);
                callback();
            }
        };
        var observer = {
            next: once,
            error: once,
            complete: once,
        };
        this.addObserver(observer);
    };
    return Concast;
}(Observable));
if (typeof Symbol === "function" && Symbol.species) {
    Object.defineProperty(Concast, Symbol.species, {
        value: Observable,
    });
}

function compact() {
    var objects = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        objects[_i] = arguments[_i];
    }
    var result = Object.create(null);
    objects.forEach(function (obj) {
        if (!obj)
            return;
        Object.keys(obj).forEach(function (key) {
            var value = obj[key];
            if (value !== void 0) {
                result[key] = value;
            }
        });
    });
    return result;
}

function validateOperation(operation) {
    var OPERATION_FIELDS = [
        'query',
        'operationName',
        'variables',
        'extensions',
        'context',
    ];
    for (var _i = 0, _a = Object.keys(operation); _i < _a.length; _i++) {
        var key = _a[_i];
        if (OPERATION_FIELDS.indexOf(key) < 0) {
            throw process.env.NODE_ENV === "production" ? new tsInvariant.InvariantError(26) : new tsInvariant.InvariantError("illegal argument: " + key);
        }
    }
    return operation;
}

function createOperation(starting, operation) {
    var context = tslib.__assign({}, starting);
    var setContext = function (next) {
        if (typeof next === 'function') {
            context = tslib.__assign(tslib.__assign({}, context), next(context));
        }
        else {
            context = tslib.__assign(tslib.__assign({}, context), next);
        }
    };
    var getContext = function () { return (tslib.__assign({}, context)); };
    Object.defineProperty(operation, 'setContext', {
        enumerable: false,
        value: setContext,
    });
    Object.defineProperty(operation, 'getContext', {
        enumerable: false,
        value: getContext,
    });
    return operation;
}

function transformOperation(operation) {
    var transformedOperation = {
        variables: operation.variables || {},
        extensions: operation.extensions || {},
        operationName: operation.operationName,
        query: operation.query,
    };
    if (!transformedOperation.operationName) {
        transformedOperation.operationName =
            typeof transformedOperation.query !== 'string'
                ? getOperationName(transformedOperation.query) || undefined
                : '';
    }
    return transformedOperation;
}

function passthrough(op, forward) {
    return (forward ? forward(op) : Observable.of());
}
function toLink(handler) {
    return typeof handler === 'function' ? new ApolloLink(handler) : handler;
}
function isTerminating(link) {
    return link.request.length <= 1;
}
var LinkError = (function (_super) {
    tslib.__extends(LinkError, _super);
    function LinkError(message, link) {
        var _this = _super.call(this, message) || this;
        _this.link = link;
        return _this;
    }
    return LinkError;
}(Error));
var ApolloLink = (function () {
    function ApolloLink(request) {
        if (request)
            this.request = request;
    }
    ApolloLink.empty = function () {
        return new ApolloLink(function () { return Observable.of(); });
    };
    ApolloLink.from = function (links) {
        if (links.length === 0)
            return ApolloLink.empty();
        return links.map(toLink).reduce(function (x, y) { return x.concat(y); });
    };
    ApolloLink.split = function (test, left, right) {
        var leftLink = toLink(left);
        var rightLink = toLink(right || new ApolloLink(passthrough));
        if (isTerminating(leftLink) && isTerminating(rightLink)) {
            return new ApolloLink(function (operation) {
                return test(operation)
                    ? leftLink.request(operation) || Observable.of()
                    : rightLink.request(operation) || Observable.of();
            });
        }
        else {
            return new ApolloLink(function (operation, forward) {
                return test(operation)
                    ? leftLink.request(operation, forward) || Observable.of()
                    : rightLink.request(operation, forward) || Observable.of();
            });
        }
    };
    ApolloLink.execute = function (link, operation) {
        return (link.request(createOperation(operation.context, transformOperation(validateOperation(operation)))) || Observable.of());
    };
    ApolloLink.concat = function (first, second) {
        var firstLink = toLink(first);
        if (isTerminating(firstLink)) {
            process.env.NODE_ENV === "production" || tsInvariant.invariant.warn(new LinkError("You are calling concat on a terminating link, which will have no effect", firstLink));
            return firstLink;
        }
        var nextLink = toLink(second);
        if (isTerminating(nextLink)) {
            return new ApolloLink(function (operation) {
                return firstLink.request(operation, function (op) { return nextLink.request(op) || Observable.of(); }) || Observable.of();
            });
        }
        else {
            return new ApolloLink(function (operation, forward) {
                return (firstLink.request(operation, function (op) {
                    return nextLink.request(op, forward) || Observable.of();
                }) || Observable.of());
            });
        }
    };
    ApolloLink.prototype.split = function (test, left, right) {
        return this.concat(ApolloLink.split(test, left, right || new ApolloLink(passthrough)));
    };
    ApolloLink.prototype.concat = function (next) {
        return ApolloLink.concat(this, next);
    };
    ApolloLink.prototype.request = function (operation, forward) {
        throw process.env.NODE_ENV === "production" ? new tsInvariant.InvariantError(21) : new tsInvariant.InvariantError('request is not implemented');
    };
    ApolloLink.prototype.onError = function (reason) {
        throw reason;
    };
    ApolloLink.prototype.setOnError = function (fn) {
        this.onError = fn;
        return this;
    };
    return ApolloLink;
}());

var VERSION = 1;
var defaultOptions = {
    disable: function (_a) {
        var graphQLErrors = _a.graphQLErrors, operation = _a.operation;
        if (graphQLErrors &&
            graphQLErrors.some(function (_a) {
                var message = _a.message;
                return message === 'PersistedQueryNotSupported';
            })) {
            return true;
        }
        var response = operation.getContext().response;
        if (response &&
            response.status &&
            (response.status === 400 || response.status === 500)) {
            return true;
        }
        return false;
    },
    useGETForHashedQueries: false,
};
function operationDefinesMutation(operation) {
    return operation.query.definitions.some(function (d) { return d.kind === 'OperationDefinition' && d.operation === 'mutation'; });
}
var hasOwnProperty = Object.prototype.hasOwnProperty;
var hashesByQuery = new WeakMap();
var nextHashesChildKey = 0;
var createPersistedQueryLink = function (options) {
    process.env.NODE_ENV === "production" ? tsInvariant.invariant(options && (typeof options.sha256 === 'function' ||
        typeof options.generateHash === 'function'), 24) : tsInvariant.invariant(options && (typeof options.sha256 === 'function' ||
        typeof options.generateHash === 'function'), 'Missing/invalid "sha256" or "generateHash" function. Please ' +
        'configure one using the "createPersistedQueryLink(options)" options ' +
        'parameter.');
    var _a = compact(defaultOptions, options), sha256 = _a.sha256, _b = _a.generateHash, generateHash = _b === void 0 ? function (query) {
        return Promise.resolve(sha256(graphql.print(query)));
    } : _b, disable = _a.disable, useGETForHashedQueries = _a.useGETForHashedQueries;
    var supportsPersistedQueries = true;
    var hashesChildKey = 'forLink' + nextHashesChildKey++;
    var getHashPromise = function (query) {
        return new Promise(function (resolve) { return resolve(generateHash(query)); });
    };
    function getQueryHash(query) {
        if (!query || typeof query !== 'object') {
            return getHashPromise(query);
        }
        var hashes = hashesByQuery.get(query);
        if (!hashes)
            hashesByQuery.set(query, hashes = Object.create(null));
        return hasOwnProperty.call(hashes, hashesChildKey)
            ? hashes[hashesChildKey]
            : hashes[hashesChildKey] = getHashPromise(query);
    }
    return new ApolloLink(function (operation, forward) {
        process.env.NODE_ENV === "production" ? tsInvariant.invariant(forward, 25) : tsInvariant.invariant(forward, 'PersistedQueryLink cannot be the last link in the chain.');
        var query = operation.query;
        return new Observable(function (observer) {
            var subscription;
            var retried = false;
            var originalFetchOptions;
            var setFetchOptions = false;
            var retry = function (_a, cb) {
                var response = _a.response, networkError = _a.networkError;
                if (!retried && ((response && response.errors) || networkError)) {
                    retried = true;
                    var disablePayload = {
                        response: response,
                        networkError: networkError,
                        operation: operation,
                        graphQLErrors: response ? response.errors : undefined,
                    };
                    supportsPersistedQueries = !disable(disablePayload);
                    if ((response &&
                        response.errors &&
                        response.errors.some(function (_a) {
                            var message = _a.message;
                            return message === 'PersistedQueryNotFound';
                        })) ||
                        !supportsPersistedQueries) {
                        if (subscription)
                            subscription.unsubscribe();
                        operation.setContext({
                            http: {
                                includeQuery: true,
                                includeExtensions: supportsPersistedQueries,
                            },
                        });
                        if (setFetchOptions) {
                            operation.setContext({ fetchOptions: originalFetchOptions });
                        }
                        subscription = forward(operation).subscribe(handler);
                        return;
                    }
                }
                cb();
            };
            var handler = {
                next: function (response) {
                    retry({ response: response }, function () { return observer.next(response); });
                },
                error: function (networkError) {
                    retry({ networkError: networkError }, function () { return observer.error(networkError); });
                },
                complete: observer.complete.bind(observer),
            };
            operation.setContext({
                http: {
                    includeQuery: !supportsPersistedQueries,
                    includeExtensions: supportsPersistedQueries,
                },
            });
            if (useGETForHashedQueries &&
                supportsPersistedQueries &&
                !operationDefinesMutation(operation)) {
                operation.setContext(function (_a) {
                    var _b = _a.fetchOptions, fetchOptions = _b === void 0 ? {} : _b;
                    originalFetchOptions = fetchOptions;
                    return {
                        fetchOptions: tslib.__assign(tslib.__assign({}, fetchOptions), { method: 'GET' }),
                    };
                });
                setFetchOptions = true;
            }
            if (supportsPersistedQueries) {
                getQueryHash(query).then(function (sha256Hash) {
                    operation.extensions.persistedQuery = {
                        version: VERSION,
                        sha256Hash: sha256Hash,
                    };
                    subscription = forward(operation).subscribe(handler);
                }).catch(observer.error.bind(observer));
            }
            else {
                subscription = forward(operation).subscribe(handler);
            }
            return function () {
                if (subscription)
                    subscription.unsubscribe();
            };
        });
    });
};

exports.VERSION = VERSION;
exports.createPersistedQueryLink = createPersistedQueryLink;
//# sourceMappingURL=persisted-queries.cjs.js.map
