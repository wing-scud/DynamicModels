// 卡顿，找出原因？g功能完善？性能测试上限 
// level = model=>bilboard卡顿，billboard加载慢
var geohash = require('ngeohash');
var Cesium = require('cesium/Cesium');
import DynamicModel from './DynamicModel'
var urls = {
    "balloon": "static/data/CesiumBalloon.glb",
    "plane": "static/data/Cesium_Air.glb",
    "people": "static/data/Cesium_Air.glb",
}
class DynamicManager {
    constructor() {
        this.init();
    }
    get currentDynamicModel() {
        return this._currentDynamicModel;
    }
    set currentDynamicModel(cdm) {
        this._currentDynamicModel = cdm;
    }
    get dataDrive() {
        return this._dataDrive;
    }
    get level() {
        return this._level;
    }
    set level(level) {
        this._level = level
    }
    set dataDrive(dataDrive) {
        this._dataDrive = dataDrive;
    }
    init() {
        this.currentDynamicModel = undefined;
        this.nameMap = new Map(); //{name:{geohashCodeMap}} geohashCodeMap->{geohash:{"collection":collection,"instances":instanceArray}}
        this.idMap = new Map(); //{id:dm}id 绑定dm
        this.clock = new Cesium.Clock();
        this.clock.shouldAnimate = false;
        this.level = undefined;
        this.dataDrive = undefined
    }
    update = () => {
        var index = -1;
        var time, dm;
        var idMap = this.idMap;
        var time = this.clock.currentTime;
        var nameMap = this.nameMap;
        if (this.dataDrive === "history" && this.level === "model") {
            dm = this.currentDynamicModel;
            dm.updatePositionByTime(time);
            this.clock.tick();
        } else {
            var level = this.getLevelByHeight(this.viewer.camera.positionCartographic);
            if (level !== this.level) {
                if (this.level && nameMap.size > 0) {
                    this.updateCollection(level);
                }
                this.level = level;
            }
            if (idMap.size > 0) {
                for (let [id, dm] of idMap) {
                    index = this.getNameMapIndex(dm);
                    dm.update(level, index)
                }
            }
        }
    }
    initTrueTime() {
        // this.clock.shouldAnimate = true;
        //this.clock.startTime = Cesium.JulianDate.fromDate(new Date());
        // this.clock.currentTime = Cesium.JulianDate.clone(this.clock.startTime);
        var currentDm = this.currentDynamicModel;
        if (currentDm) {
            currentDm.clearPathLine();
            currentDm = undefined
        }
        this.dataDrive = "trueTime"
    }
    initHistory(data) {
        this.clock.shouldAnimate = true;
        var dm = this.currentDynamicModel;
        if (data) {
            dm.trail = data;
        }
        var trail = dm.trail;
        var length = trail.length;
        let start = Cesium.JulianDate.fromDate(new Date(trail[trail.length - 1].ts * 1000));
        let end = Cesium.JulianDate.fromDate(new Date(trail[0].ts * 1000));
        this.clock.startTime = start.clone();
        this.clock.stopTime = end.clone();
        this.clock.currentTime = start.clone();
        this.clock.clockRange = Cesium.ClockRange.LOOP_STOP;
        this.clock.multiplier = 1;
        this.clock.clockStep = Cesium.ClockStep.SYSTEM_CLOCK_MULTIPLIER;
        if (!dm.sampledPosition && !dm.orientationProperty) {
            dm.sampledPosition = new Cesium.SampledPositionProperty();
            for (let i = length - 1; i >= 0; i--) {
                dm.sampledPosition.addSample(Cesium.JulianDate.fromDate(new Date(trail[i].ts * 1000)), Cesium.Cartesian3.fromDegrees(trail[i].lng, trail[i].lat, trail[i].alt));
            }
            dm.orientationProperty = new Cesium.VelocityOrientationProperty(dm.sampledPosition);
        }
        this.dataDrive = "history"
    }
    setClockMultipiler(value) {
            this.clock.multiplier = value;
        }
        //TODO new DM根据collection 创建同时，放到dmArray，更新到idMap
    addSameNameDynamicModels(optionsArray) {
        const { name, modelMatrixArray, idNewArray } = optionsArray;
        var url = urls[name];
        var dmManager = this;
        var codeInstancesMap = new Map(); //geohashCode:instancesArray[{}]
        let instancesArray = [];
        let sameCodeInstancesMap;
        var modelMatrix;
        var idArray = [];
        let collection;
        var sameCodeMap;
        for (let i = 0; i < modelMatrixArray.length; i++) {
            modelMatrix = modelMatrixArray[i]
            let code = getCode(modelMatrix);
            sameCodeInstancesMap = codeInstancesMap.get(code);
            if (sameCodeInstancesMap) {
                idArray = sameCodeInstancesMap.get("idArray");
                instancesArray = sameCodeInstancesMap.get("instancesArray");
            } else {
                sameCodeInstancesMap = new Map();
                idArray = [];
                instancesArray = [];
            }
            idArray.push(idNewArray[i]);
            instancesArray.push({ modelMatrix: modelMatrixArray[i] });
            sameCodeInstancesMap.set("idArray", idArray);
            sameCodeInstancesMap.set("instancesArray", instancesArray)
            codeInstancesMap.set(code, sameCodeInstancesMap)
        }
        var sameNameCodeMap = this.nameMap.get(name);
        if (!sameNameCodeMap) {
            this.nameMap.set(name, new Map());
        }
        sameNameCodeMap = this.nameMap.get(name);
        for (let [key, value] of codeInstancesMap) { //key =code
            sameCodeMap = sameNameCodeMap.get(key);
            if (sameCodeMap) {
                instancesArray = sameCodeMap.get("instances");
                idArray = sameCodeMap.get("ids");
            } else {
                instancesArray = [];
                idArray = []
            }
            instancesArray = instancesArray.concat(value.get("instancesArray"));
            idArray = idArray.concat(value.get("idArray"));
            if (this.level === "model") {
                collection = new Cesium.ModelInstanceCollection({ url: url, instances: instancesArray });
                collection.readyPromise.then(function(collection) {
                    collection._model.minimumPixelSize = 30;
                })
                sameCodeMap = new Map([
                    ["collection", collection],
                    ["instances", instancesArray],
                    ["ids", idArray]
                ]);
                for (let number = 0; number < idArray.length; number++) {
                    let dm = new DynamicModel({ id: idArray[number], collection: collection, modelMatrix: instancesArray[number].modelMatrix, name: name, code: key })
                    dm.addTo(dmManager);
                    this.idMap.set(idArray[number], dm)
                }
                this.viewer.scene.primitives.collections.add(collection)
            } else if (this.level === "point" || this.level === "billboard") {
                collection = this.createCollectionByLevel(this.level)
                for (let number = 0; number < idArray.length; number++) {
                    let dm = new DynamicModel({ id: idArray[number], collection: collection, modelMatrix: instancesArray[number].modelMatrix, name: name, code: key })
                    dm.addTo(dmManager);
                    this.idMap.set(idArray[number], dm)
                }
                sameCodeMap = new Map([
                    ["collection", collection],
                    ["instances", instancesArray],
                    ["ids", idArray]
                ]);
            }
            this.viewer.scene.primitives.collections.add(collection)
            console.log(key)
            sameNameCodeMap.set(key, sameCodeMap);
        }
    }
    getLevelByHeight(cartographic) { // >>>
        if (!cartographic || cartographic.height > 1e8) {
            return 'point';
        } else if (cartographic.height <= 1e8 && cartographic.height > 1e6) {
            return 'billboard';
        }
        return "model";
    }
    createCollectionByLevel(level) {
            var collection;
            if (level === "point") {
                collection = new Cesium.PointPrimitiveCollection();
            } else if (level == "billboard") {
                collection = new Cesium.BillboardCollection();
            }
            return collection;
        }
        //保存到nameMap collection
    updateCollection(level) {
        var nameMap = this.nameMap;
        this.viewer.scene.primitives.collections.removeAll();
        for (let [name, sameNameCodeMap] of nameMap) {
            for (let [code, sameCodeMap] of sameNameCodeMap) {
                let url = urls[name];
                let instances = sameCodeMap.get("instances");
                let collection;
                if (level === "point" || level === "billboard") {
                    collection = this.createCollectionByLevel(level);
                } else if (level === "model") {
                    collection = new Cesium.ModelInstanceCollection({ url: url, instances: instances });
                    collection.readyPromise.then(function(collection) {
                        collection._model.minimumPixelSize = 30;
                    })
                }
                let idArray = sameCodeMap.get("ids");
                for (let id of idArray) {
                    let dm = this.idMap.get(id);
                    dm.collection = collection;
                    this.idMap.set(id, dm)
                }
                sameCodeMap.set("collection", collection);
                this.viewer.scene.primitives.collections.add(collection)
            }
        }
    }
    getNameMapIndex(dm) {
        var name = dm.name;
        var code = dm.code;
        var id = dm.id;
        var sameCodeMap = this.nameMap.get(name).get(code);
        var ids = sameCodeMap.get("ids")
        for (let i = 0; i < ids.length; i++) {
            if (ids[i] === id) {
                return i
            }
        }
    }
    trueTimeUpdate(matrixMap) {
        var idMap = this.idMap;
        var dm;
        if (matrixMap.size > 0 && idMap.size > 0) {
            for (let [id, matrix] of matrixMap) {
                dm = idMap.get(id);
                dm.updatePositionByLevel(matrix)
            }
        }
    }
    clearCurrPathLine() {
        if (this.currentDynamicModel) {
            this.currentDynamicModel.clearPathLine()
        }
    }
    setCurrPath(value) {
        if (this.currentDynamicModel) {
            this.currentDynamicModel.path = value;
        }
    }
    editCurrMb(hpr, scale) {
        if (typeof hpr !== "undefined") {
            if (typeof scale === "undefined") {
                scale = 1;
            }
        } else {
            hpr = new Cesium.HeadingPitchRoll(0, 0, 0);
        }
        var dm = this.currentDynamicModel;
        var quaternion = Cesium.Quaternion.fromHeadingPitchRoll(hpr);
        dm.rotateAndScaleModel(quaternion, scale);
    }
    changeCurrMb(name) {
        var url = urls[name];
        var nameMap = this.nameMap;
        var curr = this.currentDynamicModel;
        var sameNameMapNew, sameNameMapOld;
        var result;
        if (!nameMap.has(name)) {
            nameMap.set(name, new Map());
        }
        sameNameMapNew = nameMap.get(name);
        sameNameMapOld = nameMap.get(curr.name);
        var code = curr.code;
        var sameCodeMapOld = sameNameMapOld.get(code);
        if (!sameNameMapNew.has(code)) {
            sameNameMapNew.set(code, new Map());
        }
        var sameCodeMapNew = sameNameMapNew.get(code);
        //delete
        var collection = sameCodeMapOld.get("collection");
        this.viewer.scene.primitives.collections.remove(collection);
        var instancesArray = sameCodeMapOld.get("instances");
        var idArray = sameCodeMapOld.get("ids");
        var index = idArray.indexOf(curr.id);
        instancesArray.splice(index, 1);
        idArray.splice(index, 1);
        if (instancesArray.length > 0) {
            result = this.createCollectionBySelf(curr.name, instancesArray, idArray)
            sameNameMapOld.set(code, result);
        }
        //add
        idArray = sameCodeMapNew.get("ids");
        if (idArray) {
            collection = sameCodeMapNew.get("collection");
            this.scene.primitives.collections.remove(collection);
            instancesArray = sameCodeMapNew.get("instances");
        } else {
            instancesArray = [];
            idArray = []
        }
        instancesArray.push({ modelMatrix: curr.modelMatrix });
        idArray.push(curr.id);
        result = this.createCollectionBySelf(name, instancesArray, idArray)
        sameNameMapNew.set(code, result);
        this.nameMap.set(name, sameNameMapNew);
        this.nameMap.set(curr.name, sameNameMapOld);
        for (let [id, value] of this.idMap) {
            if (id === curr.id) {
                this.currentDynamicModel = value;
            }
        }
    }
    createCollectionBySelf(name, instancesArray, idArray) {
        var url = urls[name];
        var collection = new Cesium.ModelInstanceCollection({ url: url, instances: instancesArray });
        collection.readyPromise.then(function(collection) {
            collection._model.minimumPixelSize = 30;
        })
        var sameCodeMap = new Map([
            ["collection", collection],
            ["instances", instancesArray],
            ["ids", idArray]
        ]);
        for (let number = 0; number < idArray.length; number++) {
            let code = getCode(instancesArray[number].modelMatrix)
            let dm = new DynamicModel({ id: idArray[number], collection: collection, modelMatrix: instancesArray[number].modelMatrix, name: name, code: code })
            dm.addTo(this);
            this.idMap.set(idArray[number], dm)
        }
        this.viewer.scene.primitives.collections.add(collection);
        return sameCodeMap;
    }
    addToViewer(viewer) {
        this.viewer = viewer;
        var collections = this.viewer.scene.primitives.add(new Cesium.PrimitiveCollection())
        this.viewer.scene.primitives.collections = collections;
        this.viewer.scene.preRender.addEventListener(this.update)
    }
    clearAllMbs() {
        var viewer = this.viewer;
        var idMap = this.idMap;
        var level = this.level;
        for (let [id, dm] of idMap) {
            dm.removePrimitiveByLevel(level);
        }
        this.idMap = new Map()
        this.currentDynamicModel = undefined;
        this.nameMap = new Map();
        this.dataDrive = undefined;
        viewer.scene.primitives.collections.removeAll();
    }
}

function getCode(modelMatrix) {
    var position = getPosition(modelMatrix);
    let cartographic = Cesium.Cartographic.fromCartesian(position);
    let lng = Cesium.Math.toDegrees(cartographic.longitude);
    let lat = Cesium.Math.toDegrees(cartographic.latitude);
    let code = geohash.encode(lat, lng, 2);
    return code;
}

function getPosition(matrix4) {
    var cartesian4 = Cesium.Matrix4.getColumn(matrix4, 3, new Cesium.Cartesian4());
    var result = Cesium.Cartesian3.fromCartesian4(cartesian4);
    return result;
}
export default DynamicManager;