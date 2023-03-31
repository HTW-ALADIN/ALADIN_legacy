"use strict";
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
exports.__esModule = true;
exports.ensureType = exports.toPascalCase = exports.templateString = exports.statefulCounter = void 0;
var templateString = function (template, valueObject, concatWith) {
    if (valueObject === void 0) { valueObject = {}; }
    if (concatWith === void 0) { concatWith = " "; }
    var output = template;
    Object.entries(valueObject).forEach(function (_a) {
        var key = _a[0], values = _a[1];
        output = output.replace(new RegExp("\\$" + ("{" + key + "}"), "g"), function () {
            return values.reduce(function (string, value, i) { return (!i ? value : string + concatWith + value); }, "");
        });
    });
    return output;
};
exports.templateString = templateString;
var toPascalCase = function (string) {
    return ("" + string)
        .replace(/[-_]+/g, " ")
        .replace(/[^\w\s]/g, "")
        .replace(/\s+(.)(\w+)/g, function ($1, $2, $3) { return "" + ($2.toUpperCase() + $3.toLowerCase()); })
        .replace(/\s/g, "")
        .replace(/\w/, function (s) { return s.toUpperCase(); });
};
exports.toPascalCase = toPascalCase;
var ensureType = function (type, input) {
    var typeMap = {
        string: function (input) { return input.toString(); },
        int: function (input) { return parseInt(input); },
        float: function (input) { return parseFloat(input); }
    };
    if (Array.isArray(input)) {
        return input.map(function (i) { return ensureType(type, i); });
    }
    return typeMap[type](input);
};
exports.ensureType = ensureType;
function statefulCounter() {
    var i;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                i = 0;
                _a.label = 1;
            case 1:
                if (!true) return [3 /*break*/, 3];
                return [4 /*yield*/, i++];
            case 2:
                _a.sent();
                return [3 /*break*/, 1];
            case 3: return [2 /*return*/];
        }
    });
}
exports.statefulCounter = statefulCounter;
