"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
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
exports.MinioClientWrapper = void 0;
var minio = require("minio");
var dotenv = require("dotenv");
var stream = require("stream");
dotenv.config({ path: __dirname + "./../../.env" });
var minioClient = function () {
    try {
        return new minio.Client({
            endPoint: "minio",
            port: 9000,
            useSSL: false,
            accessKey: process.env.MINIO_ACCESS_KEY,
            secretKey: process.env.MINIO_SECRED_KEY
        });
    }
    catch (error) {
        console.log(error);
    }
};
var MinioClientWrapper = /** @class */ (function () {
    function MinioClientWrapper() {
        this.minioClient = minioClient();
    }
    MinioClientWrapper.prototype.createBucket = function (name) {
        return __awaiter(this, void 0, void 0, function () {
            var error_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, this.minioClient.makeBucket(name, "eu")];
                    case 1:
                        _a.sent();
                        return [2 /*return*/, name];
                    case 2:
                        error_1 = _a.sent();
                        return [2 /*return*/, error_1];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    MinioClientWrapper.prototype.getFile = function (bucket, fileName) {
        return __awaiter(this, void 0, void 0, function () {
            var stream_1, data, error_2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 3, , 4]);
                        return [4 /*yield*/, this.minioClient.getObject(bucket, fileName)];
                    case 1:
                        stream_1 = _a.sent();
                        return [4 /*yield*/, new Promise(function (resolve, reject) {
                                var dataBuffer = "";
                                stream_1.on("data", function (item) { return (dataBuffer += item); });
                                stream_1.on("error", function (error) { return reject(error); });
                                stream_1.on("end", function () { return resolve(dataBuffer.toString()); });
                                stream_1.on("finish", function () { return resolve(dataBuffer.toString()); });
                            })];
                    case 2:
                        data = _a.sent();
                        return [2 /*return*/, data];
                    case 3:
                        error_2 = _a.sent();
                        return [2 /*return*/, error_2];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    MinioClientWrapper.prototype.uploadObject = function (bucket, fileName, file) {
        return __awaiter(this, void 0, void 0, function () {
            var preparedFile, fileStream;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        preparedFile = typeof file === "string" ? file : JSON.stringify(file);
                        fileStream = new stream.Readable();
                        fileStream.push(preparedFile);
                        fileStream.push(null); // needed to simulate EOF
                        return [4 /*yield*/, this.minioClient.putObject(bucket, fileName, fileStream)];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    MinioClientWrapper.prototype.deleteFiles = function (bucket, files) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.minioClient.removeObjects(bucket, files)];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    MinioClientWrapper.prototype.listBuckets = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.minioClient.listBuckets()];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    MinioClientWrapper.prototype.listFiles = function (bucket, prefix, recursive) {
        if (prefix === void 0) { prefix = ""; }
        if (recursive === void 0) { recursive = true; }
        return __awaiter(this, void 0, void 0, function () {
            var stream, data;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        stream = this.minioClient.listObjects(bucket, prefix, recursive);
                        return [4 /*yield*/, new Promise(function (resolve, reject) {
                                var data = [];
                                stream.on("data", function (item) { return data.push(item); });
                                stream.on("error", function (error) { return reject(error); });
                                stream.on("end", function () { return resolve(data); });
                                stream.on("finish", function () { return resolve(data); });
                            })];
                    case 1:
                        data = _a.sent();
                        return [2 /*return*/, data];
                }
            });
        });
    };
    return MinioClientWrapper;
}());
exports.MinioClientWrapper = MinioClientWrapper;
// (async () => {
//     const client = new MinioClientWrapper();
//     const bucket = "erd";
//     const file = await client.getFile(bucket, "northwind.dot");
//     console.log(file);
// })();
