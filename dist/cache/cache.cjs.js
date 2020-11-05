'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var optimism = require('optimism');
var graphql = require('graphql');
var tsInvariant = require('ts-invariant');
var tslib = require('tslib');
var stringify = _interopDefault(require('fast-json-stable-stringify'));
var Observable = _interopDefault(require('zen-observable'));
require('symbol-observable');
var equality = require('@wry/equality');
var context = require('@wry/context');

function shouldInclude(_a, variables) {
    var directives = _a.directives;
    if (!directives || !directives.length) {
        return true;
    }
    return getInclusionDirectives(directives).every(function (_a) {
        var directive = _a.directive, ifArgument = _a.ifArgument;
        var evaledValue = false;
        if (ifArgument.value.kind === 'Variable') {
            evaledValue = variables && variables[ifArgument.value.name.value];
            process.env.NODE_ENV === "production" ? tsInvariant.invariant(evaledValue !== void 0, 38) : tsInvariant.invariant(evaledValue !== void 0, "Invalid variable referenced in @" + directive.name.value + " directive.");
        }
        else {
            evaledValue = ifArgument.value.value;
        }
        return directive.name.value === 'skip' ? !evaledValue : evaledValue;
    });
}
function getDirectiveNames(root) {
    var names = [];
    graphql.visit(root, {
        Directive: function (node) {
            names.push(node.name.value);
        },
    });
    return names;
}
function hasDirectives(names, root) {
    return getDirectiveNames(root).some(function (name) { return names.indexOf(name) > -1; });
}
function isInclusionDirective(_a) {
    var value = _a.name.value;
    return value === 'skip' || value === 'include';
}
function getInclusionDirectives(directives) {
    var result = [];
    if (directives && directives.length) {
        directives.forEach(function (directive) {
            if (!isInclusionDirective(directive))
                return;
            var directiveArguments = directive.arguments;
            var directiveName = directive.name.value;
            process.env.NODE_ENV === "production" ? tsInvariant.invariant(directiveArguments && directiveArguments.length === 1, 39) : tsInvariant.invariant(directiveArguments && directiveArguments.length === 1, "Incorrect number of arguments for the @" + directiveName + " directive.");
            var ifArgument = directiveArguments[0];
            process.env.NODE_ENV === "production" ? tsInvariant.invariant(ifArgument.name && ifArgument.name.value === 'if', 40) : tsInvariant.invariant(ifArgument.name && ifArgument.name.value === 'if', "Invalid argument for the @" + directiveName + " directive.");
            var ifValue = ifArgument.value;
            process.env.NODE_ENV === "production" ? tsInvariant.invariant(ifValue &&
                (ifValue.kind === 'Variable' || ifValue.kind === 'BooleanValue'), 41) : tsInvariant.invariant(ifValue &&
                (ifValue.kind === 'Variable' || ifValue.kind === 'BooleanValue'), "Argument for the @" + directiveName + " directive must be a variable or a boolean value.");
            result.push({ directive: directive, ifArgument: ifArgument });
        });
    }
    return result;
}

function getFragmentQueryDocument(document, fragmentName) {
    var actualFragmentName = fragmentName;
    var fragments = [];
    document.definitions.forEach(function (definition) {
        if (definition.kind === 'OperationDefinition') {
            throw process.env.NODE_ENV === "production" ? new tsInvariant.InvariantError(42) : new tsInvariant.InvariantError("Found a " + definition.operation + " operation" + (definition.name ? " named '" + definition.name.value + "'" : '') + ". " +
                'No operations are allowed when using a fragment as a query. Only fragments are allowed.');
        }
        if (definition.kind === 'FragmentDefinition') {
            fragments.push(definition);
        }
    });
    if (typeof actualFragmentName === 'undefined') {
        process.env.NODE_ENV === "production" ? tsInvariant.invariant(fragments.length === 1, 43) : tsInvariant.invariant(fragments.length === 1, "Found " + fragments.length + " fragments. `fragmentName` must be provided when there is not exactly 1 fragment.");
        actualFragmentName = fragments[0].name.value;
    }
    var query = tslib.__assign(tslib.__assign({}, document), { definitions: tslib.__spreadArrays([
            {
                kind: 'OperationDefinition',
                operation: 'query',
                selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                        {
                            kind: 'FragmentSpread',
                            name: {
                                kind: 'Name',
                                value: actualFragmentName,
                            },
                        },
                    ],
                },
            }
        ], document.definitions) });
    return query;
}
function createFragmentMap(fragments) {
    if (fragments === void 0) { fragments = []; }
    var symTable = {};
    fragments.forEach(function (fragment) {
        symTable[fragment.name.value] = fragment;
    });
    return symTable;
}
function getFragmentFromSelection(selection, fragmentMap) {
    switch (selection.kind) {
        case 'InlineFragment':
            return selection;
        case 'FragmentSpread': {
            var fragment = fragmentMap && fragmentMap[selection.name.value];
            process.env.NODE_ENV === "production" ? tsInvariant.invariant(fragment, 44) : tsInvariant.invariant(fragment, "No fragment named " + selection.name.value + ".");
            return fragment;
        }
        default:
            return null;
    }
}

function makeReference(id) {
    return { __ref: String(id) };
}
function isReference(obj) {
    return Boolean(obj && typeof obj === 'object' && typeof obj.__ref === 'string');
}
function isStringValue(value) {
    return value.kind === 'StringValue';
}
function isBooleanValue(value) {
    return value.kind === 'BooleanValue';
}
function isIntValue(value) {
    return value.kind === 'IntValue';
}
function isFloatValue(value) {
    return value.kind === 'FloatValue';
}
function isVariable(value) {
    return value.kind === 'Variable';
}
function isObjectValue(value) {
    return value.kind === 'ObjectValue';
}
function isListValue(value) {
    return value.kind === 'ListValue';
}
function isEnumValue(value) {
    return value.kind === 'EnumValue';
}
function isNullValue(value) {
    return value.kind === 'NullValue';
}
function valueToObjectRepresentation(argObj, name, value, variables) {
    if (isIntValue(value) || isFloatValue(value)) {
        argObj[name.value] = Number(value.value);
    }
    else if (isBooleanValue(value) || isStringValue(value)) {
        argObj[name.value] = value.value;
    }
    else if (isObjectValue(value)) {
        var nestedArgObj_1 = {};
        value.fields.map(function (obj) {
            return valueToObjectRepresentation(nestedArgObj_1, obj.name, obj.value, variables);
        });
        argObj[name.value] = nestedArgObj_1;
    }
    else if (isVariable(value)) {
        var variableValue = (variables || {})[value.name.value];
        argObj[name.value] = variableValue;
    }
    else if (isListValue(value)) {
        argObj[name.value] = value.values.map(function (listValue) {
            var nestedArgArrayObj = {};
            valueToObjectRepresentation(nestedArgArrayObj, name, listValue, variables);
            return nestedArgArrayObj[name.value];
        });
    }
    else if (isEnumValue(value)) {
        argObj[name.value] = value.value;
    }
    else if (isNullValue(value)) {
        argObj[name.value] = null;
    }
    else {
        throw process.env.NODE_ENV === "production" ? new tsInvariant.InvariantError(53) : new tsInvariant.InvariantError("The inline argument \"" + name.value + "\" of kind \"" + value.kind + "\"" +
            'is not supported. Use variables instead of inline arguments to ' +
            'overcome this limitation.');
    }
}
function storeKeyNameFromField(field, variables) {
    var directivesObj = null;
    if (field.directives) {
        directivesObj = {};
        field.directives.forEach(function (directive) {
            directivesObj[directive.name.value] = {};
            if (directive.arguments) {
                directive.arguments.forEach(function (_a) {
                    var name = _a.name, value = _a.value;
                    return valueToObjectRepresentation(directivesObj[directive.name.value], name, value, variables);
                });
            }
        });
    }
    var argObj = null;
    if (field.arguments && field.arguments.length) {
        argObj = {};
        field.arguments.forEach(function (_a) {
            var name = _a.name, value = _a.value;
            return valueToObjectRepresentation(argObj, name, value, variables);
        });
    }
    return getStoreKeyName(field.name.value, argObj, directivesObj);
}
var KNOWN_DIRECTIVES = [
    'connection',
    'include',
    'skip',
    'client',
    'rest',
    'export',
];
function getStoreKeyName(fieldName, args, directives) {
    if (args &&
        directives &&
        directives['connection'] &&
        directives['connection']['key']) {
        if (directives['connection']['filter'] &&
            directives['connection']['filter'].length > 0) {
            var filterKeys = directives['connection']['filter']
                ? directives['connection']['filter']
                : [];
            filterKeys.sort();
            var filteredArgs_1 = {};
            filterKeys.forEach(function (key) {
                filteredArgs_1[key] = args[key];
            });
            return directives['connection']['key'] + "(" + JSON.stringify(filteredArgs_1) + ")";
        }
        else {
            return directives['connection']['key'];
        }
    }
    var completeFieldName = fieldName;
    if (args) {
        var stringifiedArgs = stringify(args);
        completeFieldName += "(" + stringifiedArgs + ")";
    }
    if (directives) {
        Object.keys(directives).forEach(function (key) {
            if (KNOWN_DIRECTIVES.indexOf(key) !== -1)
                return;
            if (directives[key] && Object.keys(directives[key]).length) {
                completeFieldName += "@" + key + "(" + JSON.stringify(directives[key]) + ")";
            }
            else {
                completeFieldName += "@" + key;
            }
        });
    }
    return completeFieldName;
}
function argumentsObjectFromField(field, variables) {
    if (field.arguments && field.arguments.length) {
        var argObj_1 = {};
        field.arguments.forEach(function (_a) {
            var name = _a.name, value = _a.value;
            return valueToObjectRepresentation(argObj_1, name, value, variables);
        });
        return argObj_1;
    }
    return null;
}
function resultKeyNameFromField(field) {
    return field.alias ? field.alias.value : field.name.value;
}
function getTypenameFromResult(result, selectionSet, fragmentMap) {
    if (typeof result.__typename === 'string') {
        return result.__typename;
    }
    for (var _i = 0, _a = selectionSet.selections; _i < _a.length; _i++) {
        var selection = _a[_i];
        if (isField(selection)) {
            if (selection.name.value === '__typename') {
                return result[resultKeyNameFromField(selection)];
            }
        }
        else {
            var typename = getTypenameFromResult(result, getFragmentFromSelection(selection, fragmentMap).selectionSet, fragmentMap);
            if (typeof typename === 'string') {
                return typename;
            }
        }
    }
}
function isField(selection) {
    return selection.kind === 'Field';
}

function checkDocument(doc) {
    process.env.NODE_ENV === "production" ? tsInvariant.invariant(doc && doc.kind === 'Document', 45) : tsInvariant.invariant(doc && doc.kind === 'Document', "Expecting a parsed GraphQL document. Perhaps you need to wrap the query string in a \"gql\" tag? http://docs.apollostack.com/apollo-client/core.html#gql");
    var operations = doc.definitions
        .filter(function (d) { return d.kind !== 'FragmentDefinition'; })
        .map(function (definition) {
        if (definition.kind !== 'OperationDefinition') {
            throw process.env.NODE_ENV === "production" ? new tsInvariant.InvariantError(46) : new tsInvariant.InvariantError("Schema type definitions not allowed in queries. Found: \"" + definition.kind + "\"");
        }
        return definition;
    });
    process.env.NODE_ENV === "production" ? tsInvariant.invariant(operations.length <= 1, 47) : tsInvariant.invariant(operations.length <= 1, "Ambiguous GraphQL document: contains " + operations.length + " operations");
    return doc;
}
function getOperationDefinition(doc) {
    checkDocument(doc);
    return doc.definitions.filter(function (definition) { return definition.kind === 'OperationDefinition'; })[0];
}
function getFragmentDefinitions(doc) {
    return doc.definitions.filter(function (definition) { return definition.kind === 'FragmentDefinition'; });
}
function getQueryDefinition(doc) {
    var queryDef = getOperationDefinition(doc);
    process.env.NODE_ENV === "production" ? tsInvariant.invariant(queryDef && queryDef.operation === 'query', 48) : tsInvariant.invariant(queryDef && queryDef.operation === 'query', 'Must contain a query definition.');
    return queryDef;
}
function getMainDefinition(queryDoc) {
    checkDocument(queryDoc);
    var fragmentDefinition;
    for (var _i = 0, _a = queryDoc.definitions; _i < _a.length; _i++) {
        var definition = _a[_i];
        if (definition.kind === 'OperationDefinition') {
            var operation = definition.operation;
            if (operation === 'query' ||
                operation === 'mutation' ||
                operation === 'subscription') {
                return definition;
            }
        }
        if (definition.kind === 'FragmentDefinition' && !fragmentDefinition) {
            fragmentDefinition = definition;
        }
    }
    if (fragmentDefinition) {
        return fragmentDefinition;
    }
    throw process.env.NODE_ENV === "production" ? new tsInvariant.InvariantError(52) : new tsInvariant.InvariantError('Expected a parsed GraphQL query with a query, mutation, subscription, or a fragment.');
}
function getDefaultValues(definition) {
    var defaultValues = Object.create(null);
    var defs = definition && definition.variableDefinitions;
    if (defs && defs.length) {
        defs.forEach(function (def) {
            if (def.defaultValue) {
                valueToObjectRepresentation(defaultValues, def.variable.name, def.defaultValue);
            }
        });
    }
    return defaultValues;
}

var TYPENAME_FIELD = {
    kind: 'Field',
    name: {
        kind: 'Name',
        value: '__typename',
    },
};
function addTypenameToDocument(doc) {
    return graphql.visit(checkDocument(doc), {
        SelectionSet: {
            enter: function (node, _key, parent) {
                if (parent &&
                    parent.kind === 'OperationDefinition') {
                    return;
                }
                var selections = node.selections;
                if (!selections) {
                    return;
                }
                var skip = selections.some(function (selection) {
                    return (isField(selection) &&
                        (selection.name.value === '__typename' ||
                            selection.name.value.lastIndexOf('__', 0) === 0));
                });
                if (skip) {
                    return;
                }
                var field = parent;
                if (isField(field) &&
                    field.directives &&
                    field.directives.some(function (d) { return d.name.value === 'export'; })) {
                    return;
                }
                return tslib.__assign(tslib.__assign({}, node), { selections: tslib.__spreadArrays(selections, [TYPENAME_FIELD]) });
            },
        },
    });
}
addTypenameToDocument.added = function (field) {
    return field === TYPENAME_FIELD;
};

Observable.prototype['@@observable'] = function () { return this; };

var hasOwnProperty = Object.prototype.hasOwnProperty;
function mergeDeepArray(sources) {
    var target = sources[0] || {};
    var count = sources.length;
    if (count > 1) {
        var merger = new DeepMerger();
        for (var i = 1; i < count; ++i) {
            target = merger.merge(target, sources[i]);
        }
    }
    return target;
}
function isObject(obj) {
    return obj !== null && typeof obj === 'object';
}
var defaultReconciler = function (target, source, property) {
    return this.merge(target[property], source[property]);
};
var DeepMerger = (function () {
    function DeepMerger(reconciler) {
        if (reconciler === void 0) { reconciler = defaultReconciler; }
        this.reconciler = reconciler;
        this.isObject = isObject;
        this.pastCopies = new Set();
    }
    DeepMerger.prototype.merge = function (target, source) {
        var _this = this;
        var context = [];
        for (var _i = 2; _i < arguments.length; _i++) {
            context[_i - 2] = arguments[_i];
        }
        if (isObject(source) && isObject(target)) {
            Object.keys(source).forEach(function (sourceKey) {
                if (hasOwnProperty.call(target, sourceKey)) {
                    var targetValue = target[sourceKey];
                    if (source[sourceKey] !== targetValue) {
                        var result = _this.reconciler.apply(_this, tslib.__spreadArrays([target, source, sourceKey], context));
                        if (result !== targetValue) {
                            target = _this.shallowCopyForMerge(target);
                            target[sourceKey] = result;
                        }
                    }
                }
                else {
                    target = _this.shallowCopyForMerge(target);
                    target[sourceKey] = source[sourceKey];
                }
            });
            return target;
        }
        return source;
    };
    DeepMerger.prototype.shallowCopyForMerge = function (value) {
        if (isObject(value) && !this.pastCopies.has(value)) {
            if (Array.isArray(value)) {
                value = value.slice(0);
            }
            else {
                value = tslib.__assign({ __proto__: Object.getPrototypeOf(value) }, value);
            }
            this.pastCopies.add(value);
        }
        return value;
    };
    return DeepMerger;
}());

var toString = Object.prototype.toString;
function cloneDeep(value) {
    return cloneDeepHelper(value);
}
function cloneDeepHelper(val, seen) {
    switch (toString.call(val)) {
        case "[object Array]": {
            seen = seen || new Map;
            if (seen.has(val))
                return seen.get(val);
            var copy_1 = val.slice(0);
            seen.set(val, copy_1);
            copy_1.forEach(function (child, i) {
                copy_1[i] = cloneDeepHelper(child, seen);
            });
            return copy_1;
        }
        case "[object Object]": {
            seen = seen || new Map;
            if (seen.has(val))
                return seen.get(val);
            var copy_2 = Object.create(Object.getPrototypeOf(val));
            seen.set(val, copy_2);
            Object.keys(val).forEach(function (key) {
                copy_2[key] = cloneDeepHelper(val[key], seen);
            });
            return copy_2;
        }
        default:
            return val;
    }
}

function getEnv() {
    if (typeof process !== 'undefined' && process.env.NODE_ENV) {
        return process.env.NODE_ENV;
    }
    return 'development';
}
function isEnv(env) {
    return getEnv() === env;
}
function isDevelopment() {
    return isEnv('development') === true;
}
function isTest() {
    return isEnv('test') === true;
}

function isObject$1(value) {
    return value !== null && typeof value === "object";
}
function deepFreeze(value) {
    var workSet = new Set([value]);
    workSet.forEach(function (obj) {
        if (isObject$1(obj)) {
            if (!Object.isFrozen(obj))
                Object.freeze(obj);
            Object.getOwnPropertyNames(obj).forEach(function (name) {
                if (isObject$1(obj[name]))
                    workSet.add(obj[name]);
            });
        }
    });
    return value;
}
function maybeDeepFreeze(obj) {
    if (process.env.NODE_ENV !== "production" && (isDevelopment() || isTest())) {
        deepFreeze(obj);
    }
    return obj;
}

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

var canUseWeakMap = typeof WeakMap === 'function' && !(typeof navigator === 'object' &&
    navigator.product === 'ReactNative');

var ApolloCache = (function () {
    function ApolloCache() {
        this.getFragmentDoc = optimism.wrap(getFragmentQueryDocument);
    }
    ApolloCache.prototype.recordOptimisticTransaction = function (transaction, optimisticId) {
        this.performTransaction(transaction, optimisticId);
    };
    ApolloCache.prototype.transformDocument = function (document) {
        return document;
    };
    ApolloCache.prototype.identify = function (object) {
        return;
    };
    ApolloCache.prototype.gc = function () {
        return [];
    };
    ApolloCache.prototype.modify = function (options) {
        return false;
    };
    ApolloCache.prototype.transformForLink = function (document) {
        return document;
    };
    ApolloCache.prototype.readQuery = function (options, optimistic) {
        if (optimistic === void 0) { optimistic = false; }
        return this.read({
            rootId: options.id || 'ROOT_QUERY',
            query: options.query,
            variables: options.variables,
            optimistic: optimistic,
        });
    };
    ApolloCache.prototype.readFragment = function (options, optimistic) {
        if (optimistic === void 0) { optimistic = false; }
        return this.read({
            query: this.getFragmentDoc(options.fragment, options.fragmentName),
            variables: options.variables,
            rootId: options.id,
            optimistic: optimistic,
        });
    };
    ApolloCache.prototype.writeQuery = function (options) {
        return this.write({
            dataId: options.id || 'ROOT_QUERY',
            result: options.data,
            query: options.query,
            variables: options.variables,
            broadcast: options.broadcast,
        });
    };
    ApolloCache.prototype.writeFragment = function (options) {
        return this.write({
            dataId: options.id,
            result: options.data,
            variables: options.variables,
            query: this.getFragmentDoc(options.fragment, options.fragmentName),
            broadcast: options.broadcast,
        });
    };
    return ApolloCache;
}());

(function (Cache) {
})(exports.Cache || (exports.Cache = {}));

var MissingFieldError = (function () {
    function MissingFieldError(message, path, query, clientOnly, variables) {
        this.message = message;
        this.path = path;
        this.query = query;
        this.clientOnly = clientOnly;
        this.variables = variables;
    }
    return MissingFieldError;
}());

var hasOwn = Object.prototype.hasOwnProperty;
function getTypenameFromStoreObject(store, objectOrReference) {
    return isReference(objectOrReference)
        ? store.get(objectOrReference.__ref, "__typename")
        : objectOrReference && objectOrReference.__typename;
}
var TypeOrFieldNameRegExp = /^[_a-z][_0-9a-z]*/i;
function fieldNameFromStoreName(storeFieldName) {
    var match = storeFieldName.match(TypeOrFieldNameRegExp);
    return match ? match[0] : storeFieldName;
}
function selectionSetMatchesResult(selectionSet, result, variables) {
    if (result && typeof result === "object") {
        return Array.isArray(result)
            ? result.every(function (item) { return selectionSetMatchesResult(selectionSet, item, variables); })
            : selectionSet.selections.every(function (field) {
                if (isField(field) && shouldInclude(field, variables)) {
                    var key = resultKeyNameFromField(field);
                    return hasOwn.call(result, key) &&
                        (!field.selectionSet ||
                            selectionSetMatchesResult(field.selectionSet, result[key], variables));
                }
                return true;
            });
    }
    return false;
}
function storeValueIsStoreObject(value) {
    return value !== null &&
        typeof value === "object" &&
        !isReference(value) &&
        !Array.isArray(value);
}
function isFieldValueToBeMerged(value) {
    var field = value && value.__field;
    return field && isField(field);
}
function makeProcessedFieldsMerger() {
    return new DeepMerger(reconcileProcessedFields);
}
var reconcileProcessedFields = function (existingObject, incomingObject, property) {
    var existing = existingObject[property];
    var incoming = incomingObject[property];
    if (isFieldValueToBeMerged(existing)) {
        existing.__value = this.merge(existing.__value, isFieldValueToBeMerged(incoming)
            ? incoming.__value
            : incoming);
        return existing;
    }
    if (isFieldValueToBeMerged(incoming)) {
        incoming.__value = this.merge(existing, incoming.__value);
        return incoming;
    }
    return this.merge(existing, incoming);
};

var DELETE = Object.create(null);
var delModifier = function () { return DELETE; };
var INVALIDATE = Object.create(null);
var EntityStore = (function () {
    function EntityStore(policies, group) {
        var _this = this;
        this.policies = policies;
        this.group = group;
        this.data = Object.create(null);
        this.rootIds = Object.create(null);
        this.refs = Object.create(null);
        this.getFieldValue = function (objectOrReference, storeFieldName) { return maybeDeepFreeze(isReference(objectOrReference)
            ? _this.get(objectOrReference.__ref, storeFieldName)
            : objectOrReference && objectOrReference[storeFieldName]); };
        this.canRead = function (objOrRef) {
            return isReference(objOrRef)
                ? _this.has(objOrRef.__ref)
                : typeof objOrRef === "object";
        };
        this.toReference = function (objOrIdOrRef, mergeIntoStore) {
            if (typeof objOrIdOrRef === "string") {
                return makeReference(objOrIdOrRef);
            }
            if (isReference(objOrIdOrRef)) {
                return objOrIdOrRef;
            }
            var id = _this.policies.identify(objOrIdOrRef)[0];
            if (id) {
                var ref = makeReference(id);
                if (mergeIntoStore) {
                    _this.merge(id, objOrIdOrRef);
                }
                return ref;
            }
        };
    }
    EntityStore.prototype.toObject = function () {
        return tslib.__assign({}, this.data);
    };
    EntityStore.prototype.has = function (dataId) {
        return this.lookup(dataId, true) !== void 0;
    };
    EntityStore.prototype.get = function (dataId, fieldName) {
        this.group.depend(dataId, fieldName);
        if (hasOwn.call(this.data, dataId)) {
            var storeObject = this.data[dataId];
            if (storeObject && hasOwn.call(storeObject, fieldName)) {
                return storeObject[fieldName];
            }
        }
        if (fieldName === "__typename" &&
            hasOwn.call(this.policies.rootTypenamesById, dataId)) {
            return this.policies.rootTypenamesById[dataId];
        }
        if (this instanceof Layer) {
            return this.parent.get(dataId, fieldName);
        }
    };
    EntityStore.prototype.lookup = function (dataId, dependOnExistence) {
        if (dependOnExistence)
            this.group.depend(dataId, "__exists");
        return hasOwn.call(this.data, dataId) ? this.data[dataId] :
            this instanceof Layer ? this.parent.lookup(dataId, dependOnExistence) : void 0;
    };
    EntityStore.prototype.merge = function (dataId, incoming) {
        var _this = this;
        var existing = this.lookup(dataId);
        var merged = new DeepMerger(storeObjectReconciler).merge(existing, incoming);
        this.data[dataId] = merged;
        if (merged !== existing) {
            delete this.refs[dataId];
            if (this.group.caching) {
                var fieldsToDirty_1 = Object.create(null);
                if (!existing)
                    fieldsToDirty_1.__exists = 1;
                Object.keys(incoming).forEach(function (storeFieldName) {
                    if (!existing || existing[storeFieldName] !== merged[storeFieldName]) {
                        fieldsToDirty_1[fieldNameFromStoreName(storeFieldName)] = 1;
                        if (merged[storeFieldName] === void 0 && !(_this instanceof Layer)) {
                            delete merged[storeFieldName];
                        }
                    }
                });
                Object.keys(fieldsToDirty_1).forEach(function (fieldName) { return _this.group.dirty(dataId, fieldName); });
            }
        }
    };
    EntityStore.prototype.modify = function (dataId, fields) {
        var _this = this;
        var storeObject = this.lookup(dataId);
        if (storeObject) {
            var changedFields_1 = Object.create(null);
            var needToMerge_1 = false;
            var allDeleted_1 = true;
            var sharedDetails_1 = {
                DELETE: DELETE,
                INVALIDATE: INVALIDATE,
                isReference: isReference,
                toReference: this.toReference,
                canRead: this.canRead,
                readField: function (fieldNameOrOptions, from) { return _this.policies.readField(typeof fieldNameOrOptions === "string" ? {
                    fieldName: fieldNameOrOptions,
                    from: from || makeReference(dataId),
                } : fieldNameOrOptions, { store: _this }); },
            };
            Object.keys(storeObject).forEach(function (storeFieldName) {
                var fieldName = fieldNameFromStoreName(storeFieldName);
                var fieldValue = storeObject[storeFieldName];
                if (fieldValue === void 0)
                    return;
                var modify = typeof fields === "function"
                    ? fields
                    : fields[storeFieldName] || fields[fieldName];
                if (modify) {
                    var newValue = modify === delModifier ? DELETE :
                        modify(maybeDeepFreeze(fieldValue), tslib.__assign(tslib.__assign({}, sharedDetails_1), { fieldName: fieldName,
                            storeFieldName: storeFieldName, storage: _this.getStorage(dataId, storeFieldName) }));
                    if (newValue === INVALIDATE) {
                        _this.group.dirty(dataId, storeFieldName);
                    }
                    else {
                        if (newValue === DELETE)
                            newValue = void 0;
                        if (newValue !== fieldValue) {
                            changedFields_1[storeFieldName] = newValue;
                            needToMerge_1 = true;
                            fieldValue = newValue;
                        }
                    }
                }
                if (fieldValue !== void 0) {
                    allDeleted_1 = false;
                }
            });
            if (needToMerge_1) {
                this.merge(dataId, changedFields_1);
                if (allDeleted_1) {
                    if (this instanceof Layer) {
                        this.data[dataId] = void 0;
                    }
                    else {
                        delete this.data[dataId];
                    }
                    this.group.dirty(dataId, "__exists");
                }
                return true;
            }
        }
        return false;
    };
    EntityStore.prototype.delete = function (dataId, fieldName, args) {
        var _a;
        var storeObject = this.lookup(dataId);
        if (storeObject) {
            var typename = this.getFieldValue(storeObject, "__typename");
            var storeFieldName = fieldName && args
                ? this.policies.getStoreFieldName({ typename: typename, fieldName: fieldName, args: args })
                : fieldName;
            return this.modify(dataId, storeFieldName ? (_a = {},
                _a[storeFieldName] = delModifier,
                _a) : delModifier);
        }
        return false;
    };
    EntityStore.prototype.evict = function (options) {
        var evicted = false;
        if (options.id) {
            if (hasOwn.call(this.data, options.id)) {
                evicted = this.delete(options.id, options.fieldName, options.args);
            }
            if (this instanceof Layer) {
                evicted = this.parent.evict(options) || evicted;
            }
            if (options.fieldName || evicted) {
                this.group.dirty(options.id, options.fieldName || "__exists");
            }
        }
        return evicted;
    };
    EntityStore.prototype.clear = function () {
        this.replace(null);
    };
    EntityStore.prototype.replace = function (newData) {
        var _this = this;
        Object.keys(this.data).forEach(function (dataId) {
            if (!(newData && hasOwn.call(newData, dataId))) {
                _this.delete(dataId);
            }
        });
        if (newData) {
            Object.keys(newData).forEach(function (dataId) {
                _this.merge(dataId, newData[dataId]);
            });
        }
    };
    EntityStore.prototype.retain = function (rootId) {
        return this.rootIds[rootId] = (this.rootIds[rootId] || 0) + 1;
    };
    EntityStore.prototype.release = function (rootId) {
        if (this.rootIds[rootId] > 0) {
            var count = --this.rootIds[rootId];
            if (!count)
                delete this.rootIds[rootId];
            return count;
        }
        return 0;
    };
    EntityStore.prototype.getRootIdSet = function (ids) {
        if (ids === void 0) { ids = new Set(); }
        Object.keys(this.rootIds).forEach(ids.add, ids);
        if (this instanceof Layer) {
            this.parent.getRootIdSet(ids);
        }
        return ids;
    };
    EntityStore.prototype.gc = function () {
        var _this = this;
        var ids = this.getRootIdSet();
        var snapshot = this.toObject();
        ids.forEach(function (id) {
            if (hasOwn.call(snapshot, id)) {
                Object.keys(_this.findChildRefIds(id)).forEach(ids.add, ids);
                delete snapshot[id];
            }
        });
        var idsToRemove = Object.keys(snapshot);
        if (idsToRemove.length) {
            var root_1 = this;
            while (root_1 instanceof Layer)
                root_1 = root_1.parent;
            idsToRemove.forEach(function (id) { return root_1.delete(id); });
        }
        return idsToRemove;
    };
    EntityStore.prototype.findChildRefIds = function (dataId) {
        if (!hasOwn.call(this.refs, dataId)) {
            var found_1 = this.refs[dataId] = Object.create(null);
            var workSet_1 = new Set([this.data[dataId]]);
            var canTraverse_1 = function (obj) { return obj !== null && typeof obj === 'object'; };
            workSet_1.forEach(function (obj) {
                if (isReference(obj)) {
                    found_1[obj.__ref] = true;
                }
                else if (canTraverse_1(obj)) {
                    Object.values(obj)
                        .filter(canTraverse_1)
                        .forEach(workSet_1.add, workSet_1);
                }
            });
        }
        return this.refs[dataId];
    };
    EntityStore.prototype.makeCacheKey = function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        return this.group.keyMaker.lookupArray(args);
    };
    return EntityStore;
}());
var CacheGroup = (function () {
    function CacheGroup(caching) {
        this.caching = caching;
        this.d = null;
        this.keyMaker = new optimism.KeyTrie(canUseWeakMap);
        this.d = caching ? optimism.dep() : null;
    }
    CacheGroup.prototype.depend = function (dataId, storeFieldName) {
        if (this.d) {
            this.d(makeDepKey(dataId, storeFieldName));
        }
    };
    CacheGroup.prototype.dirty = function (dataId, storeFieldName) {
        if (this.d) {
            this.d.dirty(makeDepKey(dataId, storeFieldName));
        }
    };
    return CacheGroup;
}());
function makeDepKey(dataId, storeFieldName) {
    return fieldNameFromStoreName(storeFieldName) + '#' + dataId;
}
(function (EntityStore) {
    var Root = (function (_super) {
        tslib.__extends(Root, _super);
        function Root(_a) {
            var policies = _a.policies, _b = _a.resultCaching, resultCaching = _b === void 0 ? true : _b, seed = _a.seed;
            var _this = _super.call(this, policies, new CacheGroup(resultCaching)) || this;
            _this.storageTrie = new optimism.KeyTrie(canUseWeakMap);
            _this.sharedLayerGroup = new CacheGroup(resultCaching);
            if (seed)
                _this.replace(seed);
            return _this;
        }
        Root.prototype.addLayer = function (layerId, replay) {
            return new Layer(layerId, this, replay, this.sharedLayerGroup);
        };
        Root.prototype.removeLayer = function () {
            return this;
        };
        Root.prototype.getStorage = function (idOrObj, storeFieldName) {
            return this.storageTrie.lookup(idOrObj, storeFieldName);
        };
        return Root;
    }(EntityStore));
    EntityStore.Root = Root;
})(EntityStore || (EntityStore = {}));
var Layer = (function (_super) {
    tslib.__extends(Layer, _super);
    function Layer(id, parent, replay, group) {
        var _this = _super.call(this, parent.policies, group) || this;
        _this.id = id;
        _this.parent = parent;
        _this.replay = replay;
        _this.group = group;
        replay(_this);
        return _this;
    }
    Layer.prototype.addLayer = function (layerId, replay) {
        return new Layer(layerId, this, replay, this.group);
    };
    Layer.prototype.removeLayer = function (layerId) {
        var _this = this;
        var parent = this.parent.removeLayer(layerId);
        if (layerId === this.id) {
            if (this.group.caching) {
                Object.keys(this.data).forEach(function (dataId) {
                    if (_this.data[dataId] !== parent.lookup(dataId)) {
                        _this.delete(dataId);
                    }
                });
            }
            return parent;
        }
        if (parent === this.parent)
            return this;
        return parent.addLayer(this.id, this.replay);
    };
    Layer.prototype.toObject = function () {
        return tslib.__assign(tslib.__assign({}, this.parent.toObject()), this.data);
    };
    Layer.prototype.findChildRefIds = function (dataId) {
        var fromParent = this.parent.findChildRefIds(dataId);
        return hasOwn.call(this.data, dataId) ? tslib.__assign(tslib.__assign({}, fromParent), _super.prototype.findChildRefIds.call(this, dataId)) : fromParent;
    };
    Layer.prototype.getStorage = function (idOrObj, storeFieldName) {
        return this.parent.getStorage(idOrObj, storeFieldName);
    };
    return Layer;
}(EntityStore));
function storeObjectReconciler(existingObject, incomingObject, property) {
    var existingValue = existingObject[property];
    var incomingValue = incomingObject[property];
    return equality.equal(existingValue, incomingValue) ? existingValue : incomingValue;
}
function supportsResultCaching(store) {
    return !!(store instanceof EntityStore && store.group.caching);
}

function missingFromInvariant(err, context) {
    return new MissingFieldError(err.message, context.path.slice(), context.query, context.clientOnly, context.variables);
}
var StoreReader = (function () {
    function StoreReader(config) {
        var _this = this;
        this.config = config;
        this.executeSelectionSet = optimism.wrap(function (options) { return _this.execSelectionSetImpl(options); }, {
            keyArgs: function (options) {
                return [
                    options.selectionSet,
                    options.objectOrReference,
                    options.context,
                ];
            },
            makeCacheKey: function (selectionSet, parent, context) {
                if (supportsResultCaching(context.store)) {
                    return context.store.makeCacheKey(selectionSet, isReference(parent) ? parent.__ref : parent, context.varString);
                }
            }
        });
        this.knownResults = new WeakMap();
        this.executeSubSelectedArray = optimism.wrap(function (options) {
            return _this.execSubSelectedArrayImpl(options);
        }, {
            makeCacheKey: function (_a) {
                var field = _a.field, array = _a.array, context = _a.context;
                if (supportsResultCaching(context.store)) {
                    return context.store.makeCacheKey(field, array, context.varString);
                }
            }
        });
        this.config = tslib.__assign({ addTypename: true }, config);
    }
    StoreReader.prototype.diffQueryAgainstStore = function (_a) {
        var store = _a.store, query = _a.query, _b = _a.rootId, rootId = _b === void 0 ? 'ROOT_QUERY' : _b, variables = _a.variables, _c = _a.returnPartialData, returnPartialData = _c === void 0 ? true : _c;
        var policies = this.config.cache.policies;
        variables = tslib.__assign(tslib.__assign({}, getDefaultValues(getQueryDefinition(query))), variables);
        var execResult = this.executeSelectionSet({
            selectionSet: getMainDefinition(query).selectionSet,
            objectOrReference: makeReference(rootId),
            context: {
                store: store,
                query: query,
                policies: policies,
                variables: variables,
                varString: JSON.stringify(variables),
                fragmentMap: createFragmentMap(getFragmentDefinitions(query)),
                path: [],
                clientOnly: false,
            },
        });
        var hasMissingFields = execResult.missing && execResult.missing.length > 0;
        if (hasMissingFields && !returnPartialData) {
            throw execResult.missing[0];
        }
        return {
            result: execResult.result,
            missing: execResult.missing,
            complete: !hasMissingFields,
        };
    };
    StoreReader.prototype.isFresh = function (result, parent, selectionSet, context) {
        if (supportsResultCaching(context.store) &&
            this.knownResults.get(result) === selectionSet) {
            var latest = this.executeSelectionSet.peek(selectionSet, parent, context);
            if (latest && result === latest.result) {
                return true;
            }
        }
        return false;
    };
    StoreReader.prototype.execSelectionSetImpl = function (_a) {
        var _this = this;
        var selectionSet = _a.selectionSet, objectOrReference = _a.objectOrReference, context = _a.context;
        if (isReference(objectOrReference) &&
            !context.policies.rootTypenamesById[objectOrReference.__ref] &&
            !context.store.has(objectOrReference.__ref)) {
            return {
                result: {},
                missing: [missingFromInvariant(process.env.NODE_ENV === "production" ? new tsInvariant.InvariantError(4) : new tsInvariant.InvariantError("Dangling reference to missing " + objectOrReference.__ref + " object"), context)],
            };
        }
        var variables = context.variables, policies = context.policies, store = context.store;
        var objectsToMerge = [];
        var finalResult = { result: null };
        var typename = store.getFieldValue(objectOrReference, "__typename");
        if (this.config.addTypename &&
            typeof typename === "string" &&
            !policies.rootIdsByTypename[typename]) {
            objectsToMerge.push({ __typename: typename });
        }
        function getMissing() {
            return finalResult.missing || (finalResult.missing = []);
        }
        function handleMissing(result) {
            var _a;
            if (result.missing)
                (_a = getMissing()).push.apply(_a, result.missing);
            return result.result;
        }
        var workSet = new Set(selectionSet.selections);
        workSet.forEach(function (selection) {
            var _a;
            if (!shouldInclude(selection, variables))
                return;
            if (isField(selection)) {
                var fieldValue = policies.readField({
                    fieldName: selection.name.value,
                    field: selection,
                    variables: context.variables,
                    from: objectOrReference,
                }, context);
                var resultName = resultKeyNameFromField(selection);
                context.path.push(resultName);
                var wasClientOnly = context.clientOnly;
                context.clientOnly = wasClientOnly || !!(selection.directives &&
                    selection.directives.some(function (d) { return d.name.value === "client"; }));
                if (fieldValue === void 0) {
                    if (!addTypenameToDocument.added(selection)) {
                        getMissing().push(missingFromInvariant(process.env.NODE_ENV === "production" ? new tsInvariant.InvariantError(5) : new tsInvariant.InvariantError("Can't find field '" + selection.name.value + "' on " + (isReference(objectOrReference)
                            ? objectOrReference.__ref + " object"
                            : "object " + JSON.stringify(objectOrReference, null, 2))), context));
                    }
                }
                else if (Array.isArray(fieldValue)) {
                    fieldValue = handleMissing(_this.executeSubSelectedArray({
                        field: selection,
                        array: fieldValue,
                        context: context,
                    }));
                }
                else if (!selection.selectionSet) {
                    if (process.env.NODE_ENV !== 'production') {
                        assertSelectionSetForIdValue(context.store, selection, fieldValue);
                        maybeDeepFreeze(fieldValue);
                    }
                }
                else if (fieldValue != null) {
                    fieldValue = handleMissing(_this.executeSelectionSet({
                        selectionSet: selection.selectionSet,
                        objectOrReference: fieldValue,
                        context: context,
                    }));
                }
                if (fieldValue !== void 0) {
                    objectsToMerge.push((_a = {}, _a[resultName] = fieldValue, _a));
                }
                context.clientOnly = wasClientOnly;
                tsInvariant.invariant(context.path.pop() === resultName);
            }
            else {
                var fragment = getFragmentFromSelection(selection, context.fragmentMap);
                if (fragment && policies.fragmentMatches(fragment, typename)) {
                    fragment.selectionSet.selections.forEach(workSet.add, workSet);
                }
            }
        });
        finalResult.result = mergeDeepArray(objectsToMerge);
        if (process.env.NODE_ENV !== 'production') {
            Object.freeze(finalResult.result);
        }
        this.knownResults.set(finalResult.result, selectionSet);
        return finalResult;
    };
    StoreReader.prototype.execSubSelectedArrayImpl = function (_a) {
        var _this = this;
        var field = _a.field, array = _a.array, context = _a.context;
        var missing;
        function handleMissing(childResult, i) {
            if (childResult.missing) {
                missing = missing || [];
                missing.push.apply(missing, childResult.missing);
            }
            tsInvariant.invariant(context.path.pop() === i);
            return childResult.result;
        }
        if (field.selectionSet) {
            array = array.filter(context.store.canRead);
        }
        array = array.map(function (item, i) {
            if (item === null) {
                return null;
            }
            context.path.push(i);
            if (Array.isArray(item)) {
                return handleMissing(_this.executeSubSelectedArray({
                    field: field,
                    array: item,
                    context: context,
                }), i);
            }
            if (field.selectionSet) {
                return handleMissing(_this.executeSelectionSet({
                    selectionSet: field.selectionSet,
                    objectOrReference: item,
                    context: context,
                }), i);
            }
            if (process.env.NODE_ENV !== 'production') {
                assertSelectionSetForIdValue(context.store, field, item);
            }
            tsInvariant.invariant(context.path.pop() === i);
            return item;
        });
        if (process.env.NODE_ENV !== 'production') {
            Object.freeze(array);
        }
        return { result: array, missing: missing };
    };
    return StoreReader;
}());
function assertSelectionSetForIdValue(store, field, fieldValue) {
    if (!field.selectionSet) {
        var workSet_1 = new Set([fieldValue]);
        workSet_1.forEach(function (value) {
            if (value && typeof value === "object") {
                process.env.NODE_ENV === "production" ? tsInvariant.invariant(!isReference(value), 6) : tsInvariant.invariant(!isReference(value), "Missing selection set for object of type " + getTypenameFromStoreObject(store, value) + " returned for query field " + field.name.value);
                Object.values(value).forEach(workSet_1.add, workSet_1);
            }
        });
    }
}

var StoreWriter = (function () {
    function StoreWriter(cache, reader) {
        this.cache = cache;
        this.reader = reader;
    }
    StoreWriter.prototype.writeToStore = function (_a) {
        var query = _a.query, result = _a.result, dataId = _a.dataId, store = _a.store, variables = _a.variables;
        var operationDefinition = getOperationDefinition(query);
        var merger = makeProcessedFieldsMerger();
        variables = tslib.__assign(tslib.__assign({}, getDefaultValues(operationDefinition)), variables);
        var ref = this.processSelectionSet({
            result: result || Object.create(null),
            dataId: dataId,
            selectionSet: operationDefinition.selectionSet,
            context: {
                store: store,
                written: Object.create(null),
                merge: function (existing, incoming) {
                    return merger.merge(existing, incoming);
                },
                variables: variables,
                varString: JSON.stringify(variables),
                fragmentMap: createFragmentMap(getFragmentDefinitions(query)),
            },
        });
        if (!isReference(ref)) {
            throw process.env.NODE_ENV === "production" ? new tsInvariant.InvariantError(7) : new tsInvariant.InvariantError("Could not identify object " + JSON.stringify(result));
        }
        store.retain(ref.__ref);
        return ref;
    };
    StoreWriter.prototype.processSelectionSet = function (_a) {
        var _this = this;
        var dataId = _a.dataId, result = _a.result, selectionSet = _a.selectionSet, context = _a.context, _b = _a.out, out = _b === void 0 ? {
            shouldApplyMerges: false,
        } : _b;
        var policies = this.cache.policies;
        var _c = policies.identify(result, selectionSet, context.fragmentMap), id = _c[0], keyObject = _c[1];
        dataId = dataId || id;
        if ("string" === typeof dataId) {
            var sets = context.written[dataId] || (context.written[dataId] = []);
            var ref = makeReference(dataId);
            if (sets.indexOf(selectionSet) >= 0)
                return ref;
            sets.push(selectionSet);
            if (this.reader && this.reader.isFresh(result, ref, selectionSet, context)) {
                return ref;
            }
        }
        var mergedFields = Object.create(null);
        if (keyObject) {
            mergedFields = context.merge(mergedFields, keyObject);
        }
        var typename = (dataId && policies.rootTypenamesById[dataId]) ||
            getTypenameFromResult(result, selectionSet, context.fragmentMap) ||
            (dataId && context.store.get(dataId, "__typename"));
        if ("string" === typeof typename) {
            mergedFields.__typename = typename;
        }
        var workSet = new Set(selectionSet.selections);
        workSet.forEach(function (selection) {
            var _a;
            if (!shouldInclude(selection, context.variables))
                return;
            if (isField(selection)) {
                var resultFieldKey = resultKeyNameFromField(selection);
                var value = result[resultFieldKey];
                if (typeof value !== 'undefined') {
                    var storeFieldName = policies.getStoreFieldName({
                        typename: typename,
                        fieldName: selection.name.value,
                        field: selection,
                        variables: context.variables,
                    });
                    var incomingValue = _this.processFieldValue(value, selection, context, out);
                    if (policies.hasMergeFunction(typename, selection.name.value)) {
                        incomingValue = {
                            __field: selection,
                            __typename: typename,
                            __value: incomingValue,
                        };
                        out.shouldApplyMerges = true;
                    }
                    mergedFields = context.merge(mergedFields, (_a = {},
                        _a[storeFieldName] = incomingValue,
                        _a));
                }
                else if (policies.usingPossibleTypes &&
                    !hasDirectives(["defer", "client"], selection)) {
                    throw process.env.NODE_ENV === "production" ? new tsInvariant.InvariantError(8) : new tsInvariant.InvariantError("Missing field '" + resultFieldKey + "' in " + JSON.stringify(result, null, 2).substring(0, 100));
                }
            }
            else {
                var fragment = getFragmentFromSelection(selection, context.fragmentMap);
                if (fragment &&
                    policies.fragmentMatches(fragment, typename, result, context.variables)) {
                    fragment.selectionSet.selections.forEach(workSet.add, workSet);
                }
            }
        });
        if ("string" === typeof dataId) {
            var entityRef_1 = makeReference(dataId);
            if (out.shouldApplyMerges) {
                mergedFields = policies.applyMerges(entityRef_1, mergedFields, context);
            }
            if (process.env.NODE_ENV !== "production") {
                Object.keys(mergedFields).forEach(function (storeFieldName) {
                    var fieldName = fieldNameFromStoreName(storeFieldName);
                    if (!policies.hasMergeFunction(typename, fieldName)) {
                        warnAboutDataLoss(entityRef_1, mergedFields, storeFieldName, context.store);
                    }
                });
            }
            context.store.merge(dataId, mergedFields);
            return entityRef_1;
        }
        return mergedFields;
    };
    StoreWriter.prototype.processFieldValue = function (value, field, context, out) {
        var _this = this;
        if (!field.selectionSet || value === null) {
            return process.env.NODE_ENV === 'production' ? value : cloneDeep(value);
        }
        if (Array.isArray(value)) {
            return value.map(function (item) { return _this.processFieldValue(item, field, context, out); });
        }
        return this.processSelectionSet({
            result: value,
            selectionSet: field.selectionSet,
            context: context,
            out: out,
        });
    };
    return StoreWriter;
}());
var warnings = new Set();
function warnAboutDataLoss(existingRef, incomingObj, storeFieldName, store) {
    var getChild = function (objOrRef) {
        var child = store.getFieldValue(objOrRef, storeFieldName);
        return typeof child === "object" && child;
    };
    var existing = getChild(existingRef);
    if (!existing)
        return;
    var incoming = getChild(incomingObj);
    if (!incoming)
        return;
    if (isReference(existing))
        return;
    if (equality.equal(existing, incoming))
        return;
    if (Object.keys(existing).every(function (key) { return store.getFieldValue(incoming, key) !== void 0; })) {
        return;
    }
    var parentType = store.getFieldValue(existingRef, "__typename") ||
        store.getFieldValue(incomingObj, "__typename");
    var fieldName = fieldNameFromStoreName(storeFieldName);
    var typeDotName = parentType + "." + fieldName;
    if (warnings.has(typeDotName))
        return;
    warnings.add(typeDotName);
    var childTypenames = [];
    if (!Array.isArray(existing) &&
        !Array.isArray(incoming)) {
        [existing, incoming].forEach(function (child) {
            var typename = store.getFieldValue(child, "__typename");
            if (typeof typename === "string" &&
                !childTypenames.includes(typename)) {
                childTypenames.push(typename);
            }
        });
    }
    process.env.NODE_ENV === "production" || tsInvariant.invariant.warn("Cache data may be lost when replacing the " + fieldName + " field of a " + parentType + " object.\n\nTo address this problem (which is not a bug in Apollo Client), " + (childTypenames.length
        ? "either ensure all objects of type " +
            childTypenames.join(" and ") + " have IDs, or "
        : "") + "define a custom merge function for the " + typeDotName + " field, so InMemoryCache can safely merge these objects:\n\n  existing: " + JSON.stringify(existing).slice(0, 1000) + "\n  incoming: " + JSON.stringify(incoming).slice(0, 1000) + "\n\nFor more information about these options, please refer to the documentation:\n\n  * Ensuring entity objects have IDs: https://go.apollo.dev/c/generating-unique-identifiers\n  * Defining custom merge functions: https://go.apollo.dev/c/merging-non-normalized-objects\n");
}

var varDep = optimism.dep();
var cacheSlot = new context.Slot();
function consumeAndIterate(set, callback) {
    var items = [];
    set.forEach(function (item) { return items.push(item); });
    set.clear();
    items.forEach(callback);
}
function makeVar(value) {
    var caches = new Set();
    var listeners = new Set();
    var rv = function (newValue) {
        if (arguments.length > 0) {
            if (value !== newValue) {
                value = newValue;
                varDep.dirty(rv);
                caches.forEach(broadcast);
                consumeAndIterate(listeners, function (listener) { return listener(value); });
            }
        }
        else {
            var cache = cacheSlot.getValue();
            if (cache)
                caches.add(cache);
            varDep(rv);
        }
        return value;
    };
    rv.onNextChange = function (listener) {
        listeners.add(listener);
        return function () {
            listeners.delete(listener);
        };
    };
    return rv;
}
function broadcast(cache) {
    if (cache.broadcastWatches) {
        cache.broadcastWatches();
    }
}

function argsFromFieldSpecifier(spec) {
    return spec.args !== void 0 ? spec.args :
        spec.field ? argumentsObjectFromField(spec.field, spec.variables) : null;
}
var defaultDataIdFromObject = function (_a, context) {
    var __typename = _a.__typename, id = _a.id, _id = _a._id;
    if (typeof __typename === "string") {
        if (context) {
            context.keyObject =
                id !== void 0 ? { id: id } :
                    _id !== void 0 ? { _id: _id } :
                        void 0;
        }
        if (id === void 0)
            id = _id;
        if (id !== void 0) {
            return __typename + ":" + ((typeof id === "number" ||
                typeof id === "string") ? id : JSON.stringify(id));
        }
    }
};
var nullKeyFieldsFn = function () { return void 0; };
var simpleKeyArgsFn = function (_args, context) { return context.fieldName; };
var mergeTrueFn = function (existing, incoming, _a) {
    var mergeObjects = _a.mergeObjects;
    return mergeObjects(existing, incoming);
};
var mergeFalseFn = function (_, incoming) { return incoming; };
var Policies = (function () {
    function Policies(config) {
        this.config = config;
        this.typePolicies = Object.create(null);
        this.supertypeMap = new Map();
        this.fuzzySubtypes = new Map();
        this.rootIdsByTypename = Object.create(null);
        this.rootTypenamesById = Object.create(null);
        this.usingPossibleTypes = false;
        this.config = tslib.__assign({ dataIdFromObject: defaultDataIdFromObject }, config);
        this.cache = this.config.cache;
        this.setRootTypename("Query");
        this.setRootTypename("Mutation");
        this.setRootTypename("Subscription");
        if (config.possibleTypes) {
            this.addPossibleTypes(config.possibleTypes);
        }
        if (config.typePolicies) {
            this.addTypePolicies(config.typePolicies);
        }
    }
    Policies.prototype.identify = function (object, selectionSet, fragmentMap) {
        var typename = selectionSet && fragmentMap
            ? getTypenameFromResult(object, selectionSet, fragmentMap)
            : object.__typename;
        if (typename === this.rootTypenamesById.ROOT_QUERY) {
            return ["ROOT_QUERY"];
        }
        var context = {
            typename: typename,
            selectionSet: selectionSet,
            fragmentMap: fragmentMap,
        };
        var id;
        var policy = this.getTypePolicy(typename, false);
        var keyFn = policy && policy.keyFn || this.config.dataIdFromObject;
        while (keyFn) {
            var specifierOrId = keyFn(object, context);
            if (Array.isArray(specifierOrId)) {
                keyFn = keyFieldsFnFromSpecifier(specifierOrId);
            }
            else {
                id = specifierOrId;
                break;
            }
        }
        id = id && String(id);
        return context.keyObject ? [id, context.keyObject] : [id];
    };
    Policies.prototype.addTypePolicies = function (typePolicies) {
        var _this = this;
        Object.keys(typePolicies).forEach(function (typename) {
            var existing = _this.getTypePolicy(typename, true);
            var incoming = typePolicies[typename];
            var keyFields = incoming.keyFields, fields = incoming.fields;
            if (incoming.queryType)
                _this.setRootTypename("Query", typename);
            if (incoming.mutationType)
                _this.setRootTypename("Mutation", typename);
            if (incoming.subscriptionType)
                _this.setRootTypename("Subscription", typename);
            existing.keyFn =
                keyFields === false ? nullKeyFieldsFn :
                    Array.isArray(keyFields) ? keyFieldsFnFromSpecifier(keyFields) :
                        typeof keyFields === "function" ? keyFields :
                            existing.keyFn;
            if (fields) {
                Object.keys(fields).forEach(function (fieldName) {
                    var existing = _this.getFieldPolicy(typename, fieldName, true);
                    var incoming = fields[fieldName];
                    if (typeof incoming === "function") {
                        existing.read = incoming;
                    }
                    else {
                        var keyArgs = incoming.keyArgs, read = incoming.read, merge = incoming.merge;
                        existing.keyFn =
                            keyArgs === false ? simpleKeyArgsFn :
                                Array.isArray(keyArgs) ? keyArgsFnFromSpecifier(keyArgs) :
                                    typeof keyArgs === "function" ? keyArgs :
                                        existing.keyFn;
                        if (typeof read === "function")
                            existing.read = read;
                        existing.merge =
                            typeof merge === "function" ? merge :
                                merge === true ? mergeTrueFn :
                                    merge === false ? mergeFalseFn :
                                        existing.merge;
                    }
                    if (existing.read && existing.merge) {
                        existing.keyFn = existing.keyFn || simpleKeyArgsFn;
                    }
                });
            }
        });
    };
    Policies.prototype.setRootTypename = function (which, typename) {
        if (typename === void 0) { typename = which; }
        var rootId = "ROOT_" + which.toUpperCase();
        var old = this.rootTypenamesById[rootId];
        if (typename !== old) {
            process.env.NODE_ENV === "production" ? tsInvariant.invariant(!old || old === which, 1) : tsInvariant.invariant(!old || old === which, "Cannot change root " + which + " __typename more than once");
            if (old)
                delete this.rootIdsByTypename[old];
            this.rootIdsByTypename[typename] = rootId;
            this.rootTypenamesById[rootId] = typename;
        }
    };
    Policies.prototype.addPossibleTypes = function (possibleTypes) {
        var _this = this;
        this.usingPossibleTypes = true;
        Object.keys(possibleTypes).forEach(function (supertype) {
            _this.getSupertypeSet(supertype, true);
            possibleTypes[supertype].forEach(function (subtype) {
                _this.getSupertypeSet(subtype, true).add(supertype);
                var match = subtype.match(TypeOrFieldNameRegExp);
                if (!match || match[0] !== subtype) {
                    _this.fuzzySubtypes.set(subtype, new RegExp(subtype));
                }
            });
        });
    };
    Policies.prototype.getTypePolicy = function (typename, createIfMissing) {
        if (typename) {
            return this.typePolicies[typename] || (createIfMissing && (this.typePolicies[typename] = Object.create(null)));
        }
    };
    Policies.prototype.getFieldPolicy = function (typename, fieldName, createIfMissing) {
        var typePolicy = this.getTypePolicy(typename, createIfMissing);
        if (typePolicy) {
            var fieldPolicies = typePolicy.fields || (createIfMissing && (typePolicy.fields = Object.create(null)));
            if (fieldPolicies) {
                return fieldPolicies[fieldName] || (createIfMissing && (fieldPolicies[fieldName] = Object.create(null)));
            }
        }
    };
    Policies.prototype.getSupertypeSet = function (subtype, createIfMissing) {
        var supertypeSet = this.supertypeMap.get(subtype);
        if (!supertypeSet && createIfMissing) {
            this.supertypeMap.set(subtype, supertypeSet = new Set());
        }
        return supertypeSet;
    };
    Policies.prototype.fragmentMatches = function (fragment, typename, result, variables) {
        var _this = this;
        if (!fragment.typeCondition)
            return true;
        if (!typename)
            return false;
        var supertype = fragment.typeCondition.name.value;
        if (typename === supertype)
            return true;
        if (this.usingPossibleTypes &&
            this.supertypeMap.has(supertype)) {
            var typenameSupertypeSet = this.getSupertypeSet(typename, true);
            var workQueue_1 = [typenameSupertypeSet];
            var maybeEnqueue_1 = function (subtype) {
                var supertypeSet = _this.getSupertypeSet(subtype, false);
                if (supertypeSet &&
                    supertypeSet.size &&
                    workQueue_1.indexOf(supertypeSet) < 0) {
                    workQueue_1.push(supertypeSet);
                }
            };
            var needToCheckFuzzySubtypes = !!(result && this.fuzzySubtypes.size);
            var checkingFuzzySubtypes = false;
            for (var i = 0; i < workQueue_1.length; ++i) {
                var supertypeSet = workQueue_1[i];
                if (supertypeSet.has(supertype)) {
                    if (!typenameSupertypeSet.has(supertype)) {
                        if (checkingFuzzySubtypes) {
                            process.env.NODE_ENV === "production" || tsInvariant.invariant.warn("Inferring subtype " + typename + " of supertype " + supertype);
                        }
                        typenameSupertypeSet.add(supertype);
                    }
                    return true;
                }
                supertypeSet.forEach(maybeEnqueue_1);
                if (needToCheckFuzzySubtypes &&
                    i === workQueue_1.length - 1 &&
                    selectionSetMatchesResult(fragment.selectionSet, result, variables)) {
                    needToCheckFuzzySubtypes = false;
                    checkingFuzzySubtypes = true;
                    this.fuzzySubtypes.forEach(function (regExp, fuzzyString) {
                        var match = typename.match(regExp);
                        if (match && match[0] === typename) {
                            maybeEnqueue_1(fuzzyString);
                        }
                    });
                }
            }
        }
        return false;
    };
    Policies.prototype.getStoreFieldName = function (fieldSpec) {
        var typename = fieldSpec.typename, fieldName = fieldSpec.fieldName;
        var policy = this.getFieldPolicy(typename, fieldName, false);
        var storeFieldName;
        var keyFn = policy && policy.keyFn;
        if (keyFn && typename) {
            var context = {
                typename: typename,
                fieldName: fieldName,
                field: fieldSpec.field || null,
                variables: fieldSpec.variables,
            };
            var args = argsFromFieldSpecifier(fieldSpec);
            while (keyFn) {
                var specifierOrString = keyFn(args, context);
                if (Array.isArray(specifierOrString)) {
                    keyFn = keyArgsFnFromSpecifier(specifierOrString);
                }
                else {
                    storeFieldName = specifierOrString || fieldName;
                    break;
                }
            }
        }
        if (storeFieldName === void 0) {
            storeFieldName = fieldSpec.field
                ? storeKeyNameFromField(fieldSpec.field, fieldSpec.variables)
                : getStoreKeyName(fieldName, argsFromFieldSpecifier(fieldSpec));
        }
        return fieldName === fieldNameFromStoreName(storeFieldName)
            ? storeFieldName
            : fieldName + ":" + storeFieldName;
    };
    Policies.prototype.readField = function (options, context) {
        var objectOrReference = options.from;
        if (!objectOrReference)
            return;
        var nameOrField = options.field || options.fieldName;
        if (!nameOrField)
            return;
        if (options.typename === void 0) {
            var typename = context.store.getFieldValue(objectOrReference, "__typename");
            if (typename)
                options.typename = typename;
        }
        var storeFieldName = this.getStoreFieldName(options);
        var fieldName = fieldNameFromStoreName(storeFieldName);
        var existing = context.store.getFieldValue(objectOrReference, storeFieldName);
        var policy = this.getFieldPolicy(options.typename, fieldName, false);
        var read = policy && policy.read;
        if (read) {
            var readOptions = makeFieldFunctionOptions(this, objectOrReference, options, context, context.store.getStorage(isReference(objectOrReference)
                ? objectOrReference.__ref
                : objectOrReference, storeFieldName));
            return cacheSlot.withValue(this.cache, read, [existing, readOptions]);
        }
        return existing;
    };
    Policies.prototype.hasMergeFunction = function (typename, fieldName) {
        var policy = this.getFieldPolicy(typename, fieldName, false);
        return !!(policy && policy.merge);
    };
    Policies.prototype.applyMerges = function (existing, incoming, context, storageKeys) {
        var _a;
        var _this = this;
        if (isFieldValueToBeMerged(incoming)) {
            var field = incoming.__field;
            var fieldName = field.name.value;
            var merge = this.getFieldPolicy(incoming.__typename, fieldName, false).merge;
            incoming = merge(existing, incoming.__value, makeFieldFunctionOptions(this, void 0, { typename: incoming.__typename, fieldName: fieldName,
                field: field, variables: context.variables }, context, storageKeys
                ? (_a = context.store).getStorage.apply(_a, storageKeys) : Object.create(null)));
        }
        if (Array.isArray(incoming)) {
            return incoming.map(function (item) { return _this.applyMerges(void 0, item, context); });
        }
        if (storeValueIsStoreObject(incoming)) {
            var e_1 = existing;
            var i_1 = incoming;
            var firstStorageKey_1 = isReference(e_1)
                ? e_1.__ref
                : typeof e_1 === "object" && e_1;
            var newFields_1;
            Object.keys(i_1).forEach(function (storeFieldName) {
                var incomingValue = i_1[storeFieldName];
                var appliedValue = _this.applyMerges(context.store.getFieldValue(e_1, storeFieldName), incomingValue, context, firstStorageKey_1 ? [firstStorageKey_1, storeFieldName] : void 0);
                if (appliedValue !== incomingValue) {
                    newFields_1 = newFields_1 || Object.create(null);
                    newFields_1[storeFieldName] = appliedValue;
                }
            });
            if (newFields_1) {
                return tslib.__assign(tslib.__assign({}, i_1), newFields_1);
            }
        }
        return incoming;
    };
    return Policies;
}());
function makeFieldFunctionOptions(policies, objectOrReference, fieldSpec, context, storage) {
    var storeFieldName = policies.getStoreFieldName(fieldSpec);
    var fieldName = fieldNameFromStoreName(storeFieldName);
    var variables = fieldSpec.variables || context.variables;
    var _a = context.store, getFieldValue = _a.getFieldValue, toReference = _a.toReference, canRead = _a.canRead;
    return {
        args: argsFromFieldSpecifier(fieldSpec),
        field: fieldSpec.field || null,
        fieldName: fieldName,
        storeFieldName: storeFieldName,
        variables: variables,
        isReference: isReference,
        toReference: toReference,
        storage: storage,
        cache: policies.cache,
        canRead: canRead,
        readField: function (fieldNameOrOptions, from) {
            var options = typeof fieldNameOrOptions === "string" ? {
                fieldName: fieldNameOrOptions,
                from: from,
            } : tslib.__assign({}, fieldNameOrOptions);
            if (void 0 === options.from) {
                options.from = objectOrReference;
            }
            if (void 0 === options.variables) {
                options.variables = variables;
            }
            return policies.readField(options, context);
        },
        mergeObjects: function (existing, incoming) {
            if (Array.isArray(existing) || Array.isArray(incoming)) {
                throw process.env.NODE_ENV === "production" ? new tsInvariant.InvariantError(2) : new tsInvariant.InvariantError("Cannot automatically merge arrays");
            }
            if (existing && typeof existing === "object" &&
                incoming && typeof incoming === "object") {
                var eType = getFieldValue(existing, "__typename");
                var iType = getFieldValue(incoming, "__typename");
                var typesDiffer = eType && iType && eType !== iType;
                var applied = policies.applyMerges(typesDiffer ? void 0 : existing, incoming, context);
                if (typesDiffer ||
                    !storeValueIsStoreObject(existing) ||
                    !storeValueIsStoreObject(applied)) {
                    return applied;
                }
                return tslib.__assign(tslib.__assign({}, existing), applied);
            }
            return incoming;
        }
    };
}
function keyArgsFnFromSpecifier(specifier) {
    return function (args, context) {
        return args ? context.fieldName + ":" + JSON.stringify(computeKeyObject(args, specifier)) : context.fieldName;
    };
}
function keyFieldsFnFromSpecifier(specifier) {
    var trie = new optimism.KeyTrie(canUseWeakMap);
    return function (object, context) {
        var aliasMap;
        if (context.selectionSet && context.fragmentMap) {
            var info = trie.lookupArray([
                context.selectionSet,
                context.fragmentMap,
            ]);
            aliasMap = info.aliasMap || (info.aliasMap = makeAliasMap(context.selectionSet, context.fragmentMap));
        }
        var keyObject = context.keyObject =
            computeKeyObject(object, specifier, aliasMap);
        return context.typename + ":" + JSON.stringify(keyObject);
    };
}
function makeAliasMap(selectionSet, fragmentMap) {
    var map = Object.create(null);
    var workQueue = new Set([selectionSet]);
    workQueue.forEach(function (selectionSet) {
        selectionSet.selections.forEach(function (selection) {
            if (isField(selection)) {
                if (selection.alias) {
                    var responseKey = selection.alias.value;
                    var storeKey = selection.name.value;
                    if (storeKey !== responseKey) {
                        var aliases = map.aliases || (map.aliases = Object.create(null));
                        aliases[storeKey] = responseKey;
                    }
                }
                if (selection.selectionSet) {
                    var subsets = map.subsets || (map.subsets = Object.create(null));
                    subsets[selection.name.value] =
                        makeAliasMap(selection.selectionSet, fragmentMap);
                }
            }
            else {
                var fragment = getFragmentFromSelection(selection, fragmentMap);
                if (fragment) {
                    workQueue.add(fragment.selectionSet);
                }
            }
        });
    });
    return map;
}
function computeKeyObject(response, specifier, aliasMap) {
    var keyObj = Object.create(null);
    var prevKey;
    specifier.forEach(function (s) {
        if (Array.isArray(s)) {
            if (typeof prevKey === "string") {
                var subsets = aliasMap && aliasMap.subsets;
                var subset = subsets && subsets[prevKey];
                keyObj[prevKey] = computeKeyObject(response[prevKey], s, subset);
            }
        }
        else {
            var aliases = aliasMap && aliasMap.aliases;
            var responseName = aliases && aliases[s] || s;
            process.env.NODE_ENV === "production" ? tsInvariant.invariant(hasOwn.call(response, responseName), 3) : tsInvariant.invariant(hasOwn.call(response, responseName), "Missing field '" + responseName + "' while computing key fields");
            keyObj[prevKey = s] = response[responseName];
        }
    });
    return keyObj;
}

var defaultConfig = {
    dataIdFromObject: defaultDataIdFromObject,
    addTypename: true,
    resultCaching: true,
    typePolicies: {},
};
var InMemoryCache = (function (_super) {
    tslib.__extends(InMemoryCache, _super);
    function InMemoryCache(config) {
        if (config === void 0) { config = {}; }
        var _this = _super.call(this) || this;
        _this.watches = new Set();
        _this.typenameDocumentCache = new Map();
        _this.makeVar = makeVar;
        _this.txCount = 0;
        _this.maybeBroadcastWatch = optimism.wrap(function (c, fromOptimisticTransaction) {
            return _this.broadcastWatch.call(_this, c, !!fromOptimisticTransaction);
        }, {
            makeCacheKey: function (c) {
                var store = c.optimistic ? _this.optimisticData : _this.data;
                if (supportsResultCaching(store)) {
                    var optimistic = c.optimistic, rootId = c.rootId, variables = c.variables;
                    return store.makeCacheKey(c.query, c.callback, JSON.stringify({ optimistic: optimistic, rootId: rootId, variables: variables }));
                }
            }
        });
        _this.watchDep = optimism.dep();
        _this.config = tslib.__assign(tslib.__assign({}, defaultConfig), config);
        _this.addTypename = !!_this.config.addTypename;
        _this.policies = new Policies({
            cache: _this,
            dataIdFromObject: _this.config.dataIdFromObject,
            possibleTypes: _this.config.possibleTypes,
            typePolicies: _this.config.typePolicies,
        });
        _this.data = new EntityStore.Root({
            policies: _this.policies,
            resultCaching: _this.config.resultCaching,
        });
        _this.optimisticData = _this.data;
        _this.storeWriter = new StoreWriter(_this, _this.storeReader = new StoreReader({
            cache: _this,
            addTypename: _this.addTypename,
        }));
        return _this;
    }
    InMemoryCache.prototype.restore = function (data) {
        if (data)
            this.data.replace(data);
        return this;
    };
    InMemoryCache.prototype.extract = function (optimistic) {
        if (optimistic === void 0) { optimistic = false; }
        return (optimistic ? this.optimisticData : this.data).toObject();
    };
    InMemoryCache.prototype.read = function (options) {
        var store = options.optimistic ? this.optimisticData : this.data;
        if (typeof options.rootId === 'string' && !store.has(options.rootId)) {
            return null;
        }
        return this.storeReader.diffQueryAgainstStore({
            store: store,
            query: options.query,
            variables: options.variables,
            rootId: options.rootId,
            config: this.config,
            returnPartialData: false,
        }).result || null;
    };
    InMemoryCache.prototype.write = function (options) {
        try {
            ++this.txCount;
            return this.storeWriter.writeToStore({
                store: this.data,
                query: options.query,
                result: options.result,
                dataId: options.dataId,
                variables: options.variables,
            });
        }
        finally {
            if (!--this.txCount && options.broadcast !== false) {
                this.broadcastWatches();
            }
        }
    };
    InMemoryCache.prototype.modify = function (options) {
        if (hasOwn.call(options, "id") && !options.id) {
            return false;
        }
        var store = options.optimistic
            ? this.optimisticData
            : this.data;
        try {
            ++this.txCount;
            return store.modify(options.id || "ROOT_QUERY", options.fields);
        }
        finally {
            if (!--this.txCount && options.broadcast !== false) {
                this.broadcastWatches();
            }
        }
    };
    InMemoryCache.prototype.diff = function (options) {
        return this.storeReader.diffQueryAgainstStore({
            store: options.optimistic ? this.optimisticData : this.data,
            rootId: options.id || "ROOT_QUERY",
            query: options.query,
            variables: options.variables,
            returnPartialData: options.returnPartialData,
            config: this.config,
        });
    };
    InMemoryCache.prototype.watch = function (watch) {
        var _this = this;
        this.watches.add(watch);
        if (watch.immediate) {
            this.maybeBroadcastWatch(watch);
        }
        return function () {
            _this.watches.delete(watch);
            _this.watchDep.dirty(watch);
            _this.maybeBroadcastWatch.forget(watch);
        };
    };
    InMemoryCache.prototype.gc = function () {
        return this.optimisticData.gc();
    };
    InMemoryCache.prototype.retain = function (rootId, optimistic) {
        return (optimistic ? this.optimisticData : this.data).retain(rootId);
    };
    InMemoryCache.prototype.release = function (rootId, optimistic) {
        return (optimistic ? this.optimisticData : this.data).release(rootId);
    };
    InMemoryCache.prototype.identify = function (object) {
        return isReference(object) ? object.__ref :
            this.policies.identify(object)[0];
    };
    InMemoryCache.prototype.evict = function (options) {
        if (!options.id) {
            if (hasOwn.call(options, "id")) {
                return false;
            }
            options = tslib.__assign(tslib.__assign({}, options), { id: "ROOT_QUERY" });
        }
        try {
            ++this.txCount;
            return this.optimisticData.evict(options);
        }
        finally {
            if (!--this.txCount && options.broadcast !== false) {
                this.broadcastWatches();
            }
        }
    };
    InMemoryCache.prototype.reset = function () {
        this.data.clear();
        this.optimisticData = this.data;
        this.broadcastWatches();
        return Promise.resolve();
    };
    InMemoryCache.prototype.removeOptimistic = function (idToRemove) {
        var newOptimisticData = this.optimisticData.removeLayer(idToRemove);
        if (newOptimisticData !== this.optimisticData) {
            this.optimisticData = newOptimisticData;
            this.broadcastWatches();
        }
    };
    InMemoryCache.prototype.performTransaction = function (transaction, optimisticId) {
        var _this = this;
        var perform = function (layer) {
            var _a = _this, data = _a.data, optimisticData = _a.optimisticData;
            ++_this.txCount;
            if (layer) {
                _this.data = _this.optimisticData = layer;
            }
            try {
                transaction(_this);
            }
            finally {
                --_this.txCount;
                _this.data = data;
                _this.optimisticData = optimisticData;
            }
        };
        var fromOptimisticTransaction = false;
        if (typeof optimisticId === 'string') {
            this.optimisticData = this.optimisticData.addLayer(optimisticId, perform);
            fromOptimisticTransaction = true;
        }
        else if (optimisticId === null) {
            perform(this.data);
        }
        else {
            perform();
        }
        this.broadcastWatches(fromOptimisticTransaction);
    };
    InMemoryCache.prototype.transformDocument = function (document) {
        if (this.addTypename) {
            var result = this.typenameDocumentCache.get(document);
            if (!result) {
                result = addTypenameToDocument(document);
                this.typenameDocumentCache.set(document, result);
                this.typenameDocumentCache.set(result, result);
            }
            return result;
        }
        return document;
    };
    InMemoryCache.prototype.broadcastWatches = function (fromOptimisticTransaction) {
        var _this = this;
        if (!this.txCount) {
            this.watches.forEach(function (c) { return _this.maybeBroadcastWatch(c, fromOptimisticTransaction); });
        }
    };
    InMemoryCache.prototype.broadcastWatch = function (c, fromOptimisticTransaction) {
        this.watchDep.dirty(c);
        this.watchDep(c);
        var diff = this.diff({
            query: c.query,
            variables: c.variables,
            optimistic: c.optimistic,
        });
        if (c.optimistic && fromOptimisticTransaction) {
            diff.fromOptimisticTransaction = true;
        }
        c.callback(diff);
    };
    return InMemoryCache;
}(ApolloCache));

exports.ApolloCache = ApolloCache;
exports.InMemoryCache = InMemoryCache;
exports.MissingFieldError = MissingFieldError;
exports.cacheSlot = cacheSlot;
exports.defaultDataIdFromObject = defaultDataIdFromObject;
exports.isReference = isReference;
exports.makeReference = makeReference;
exports.makeVar = makeVar;
//# sourceMappingURL=cache.cjs.js.map
