<template>
<div id="cesiumContainer">
    <div id="editor">
        <div class="operater">
            <el-button type="primary" plain @click="createMb()">创建列表动标</el-button>
        </div>
        <div class="operater">
            <el-select v-model="pathChooseValue" placeholder="请选择" @change="pathChoose()">
                <el-option :disabled="pathDisabled" v-for="item in pathOptions" :key="item.value" :label="item.label" :value="item.value">
                </el-option>
            </el-select>
        </div>
        <div class="operater">
            <el-button type="primary" plain @click="changeModelType()">切换模型</el-button>
        </div>
        <div class="operater">
            <el-button type="primary" plain @click="deleteMb()">清除动标</el-button>
        </div>
        <!-- <div class="operater">
            <el-button type="primary" plain @click=" addPartical()">添加粒子效果</el-button>
        </div> -->
        <div class="operater">
            <el-button type="primary" plain @click=" trackModel()">跟踪目标</el-button>
        </div>
        <div class="operater">
            <el-slider v-model="time" :min="minTime" :max="maxTime" :format-tooltip="formatTooltip" :disabled="timelineControl"></el-slider>
        </div>
    </div>
</div>
</template>

<script>
var Cesium = require('cesium/Cesium');
import fetch from "node-fetch"
import DynamicModels from "../class/DynamicModels"
export default {
    name: 'ModelPage',
    data() {
        return {
            pathOptions: [{
                value: 'passed',
                label: '已飞行轨迹'
            }, {
                value: 'path',
                label: '飞行路径'
            }],
            pathDisabled: true,
            modelMap: "",
            pickModel: "",
            pathChooseValue: "",
            basePath: "static/data/test/w2/",
            interval: undefined,
            cameraPick: false,

            timelineControl: true,
            time: 0,
            minTime: 0,
            maxTime: 0,
            collection: ""
        }
    },
    mounted() {
        Cesium.Ion.defaultAccessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiIxZTg5ODRkNS00NTViLTQ3MzEtYWE4ZS0zNmNjYzgzYzQ0MDgiLCJpZCI6MTcyMDAsInNjb3BlcyI6WyJhc3IiLCJnYyJdLCJpYXQiOjE1NzE3OTk5NzJ9.6gFtjhsys4gwUDc8m1C54mzZcM6fP_BbdnrSv7mro4o';
        var viewer = new Cesium.Viewer('cesiumContainer', {
            animation: false, //隐藏时钟
            homeButton: false,
            fullscreenButton: false,
            geocoder: false, //隐藏搜索
            sceneModePicker: false, // 隐藏二三维切换
            baseLayerPicker: false, //隐藏图层管理
            timeline: false,
            infoBox: false, // 隐藏点击entity信息框
            navigationHelpButton: false, //隐藏帮助按钮
            selectionIndicator: false // 隐藏点击entity绿框
        });
        var layer = viewer.imageryLayers.addImageryProvider(
            new Cesium.IonImageryProvider({
                assetId: 3
            })
        );
        var page = this;
        window.viewer = viewer;
        var scene = viewer.scene;
        var handler = new Cesium.ScreenSpaceEventHandler(viewer.canvas);
        handler.setInputAction(function (movement) {
            var pick = scene.pick(movement.position);
            if (Cesium.defined(pick)) {
                //将modelInstance转为Dm，
                var model = page.judgeModelInstanceToDm(pick)
                if (model && model.id !== page.pickModel.id) {
                    if (page.pickModel.id) { //如果不是第一次操作，是切换
                        //移除并恢复之前的
                        page.pickModel.modelMatrix = page.scaleModel(0.6, page.pickModel.modelMatrix);
                        page.pickModel.historyRoute = false;
                        page.pickModel.clearPathLine();
                        page.pathChooseValue = "";
                    }
                    //处理当前的
                    page.pickModel = model;
                    page.pickModel.modelMatrix = page.scaleModel(1.5, page.pickModel.modelMatrix);
                    if (page.pickModel.trail.length === 0) { //该model第一次点击
                        var trail = page.setTrail(page.pickModel.id);
                        trail.then(data => {
                            page.pickModel.trail = data;
                            page.pickModel.historyRoute = true;
                            page.timelineControl = false
                            page.minTime = page.pickModel.trail[page.pickModel.trail.length - 1].ts;
                            page.maxTime = page.pickModel.trail[0].ts;
                            page.time = parseInt(Cesium.JulianDate.toDate(page.pickModel.clock.currentTime).getTime() / 1000);
                        })
                    } else {
                        //点击过一次，数据无需获取
                        page.pickModel.historyRoute = true;
                        page.timelineControl = false
                        page.minTime = page.pickModel.trail[page.pickModel.trail.length - 1].ts;
                        page.maxTime = page.pickModel.trail[0].ts;
                        page.time = parseInt(Cesium.JulianDate.toDate(page.pickModel.clock.currentTime).getTime() / 1000);
                    }
                    setTimeout(function () {
                        var position = page.pickModel.getPosition()
                        position = new Cesium.Cartesian3(position.x, position.y, position.z)
                        viewer.camera.setView({
                            destination: position,
                        });
                        viewer.camera.moveBackward(50000);
                    }, 500);
                    page.pathDisabled = false;
                } else if (model.id === page.pickModel.id) { //再次点击
                    page.pickModel.modelMatrix = page.scaleModel(0.6, page.pickModel.modelMatrix);
                    page.pathDisabled = true;
                    page.pickModel.clearPathLine();
                    page.pickModel.historyRoute = false;
                    page.pickModel = ''
                    page.timelineControl = true;
                    page.minTime = 0;
                    page.maxTime = 0;
                    page.pathChooseValue = ""
                }
            }
        }, Cesium.ScreenSpaceEventType.LEFT_CLICK);
    },
    methods: {
        async createMb() {
            var url = "../../static/data/Cesium_Air.glb"
            var files = await this.statisticFile();
            var flightName = files[0];
            var flightData = await this.dealFilghtData(flightName);
            var matrixArray = [];
            for (let i = 0; i < flightData.length; i++) {
                let modelInfor = flightData[i];
                let modelCode = modelInfor["code"];
                let modelArray = modelInfor["infor"];
                let name = modelArray[0];
                let lng = modelArray[2];
                let lat = modelArray[1];
                let heading = modelArray[3];
                let alt = modelArray[4];
                let cartesian = Cesium.Cartesian3.fromDegrees(lng, lat, alt);
                let modelMatrix = Cesium.Transforms.eastNorthUpToFixedFrame(cartesian);
                matrixArray.push({
                    modelMatrix: modelMatrix,
                });
            };
            var collection = viewer.scene.primitives.add(
                new Cesium.ModelInstanceCollection({
                    url: url,
                    instances: matrixArray,
                })
            );
            var page = this;
            page.modelMap = new Map();
            collection.readyPromise.then(function (collection) {
                    collection._model.minimumPixelSize = 10;
                    for (let i = 0; i < flightData.length; i++) {
                        var modelInstance = collection._instances[i];
                        let modelInfor = flightData[i];
                        let dm = new DynamicModels({
                            id: modelInfor["code"],
                            instance: modelInstance
                        });
                        page.modelMap.set(dm.id, dm);
                        page.collection = collection;
                        dm.addTo(viewer)
                    }
                    page.trueTimeUpdate().then(res => {
                        page.interval = res;
                    })
                })
                .otherwise(function (error) {
                    window.alert(error);
                });
        },
        async setTrail(modelCode) {
            var trail = await this.readTrailFile(modelCode);
            if (trail === undefined) {
                trail = trailTest;
            }
            trail = trail.trail;
            var modelTrail = []
            for (let j = 0; j < trail.length; j++) {
                let temp = trail[j]
                modelTrail.push({
                    "lat": temp.lat,
                    "lng": temp.lng,
                    "alt": temp.alt,
                    "ts": temp.ts
                })
            }
            return modelTrail;
        },
        async trueTimeUpdate() {
            var page = this;
            var modelInfor, modelCode, modelArray, lng, lat, heading, alt, model, cartesian, j, length;
            var files = await this.statisticFile();
            var fileNum = 1;
            var interval = setInterval(async function () {
                if (fileNum >= files.length - 1) {
                    clearInterval(interval);
                }
                var flightName = files[fileNum];
                var flightData = await page.dealFilghtData(flightName);
                for (let i = 0; i < flightData.length; i++) {
                    modelInfor = flightData[i];
                    modelCode = modelInfor["code"];
                    modelArray = modelInfor["infor"];
                    name = modelArray[0];
                    lng = modelArray[2];
                    lat = modelArray[1];
                    heading = modelArray[3];
                    alt = modelArray[4];
                    model = page.modelMap.get(modelCode)
                    cartesian = Cesium.Cartesian3.fromDegrees(lng, lat, alt);
                    model.updatePosition(cartesian, heading);
                }
                fileNum++;
            }, 1000);
            return interval;
        },
        readTrailFile(trailCode) {
            var trailAddress = this.basePath + "trail/trail_" + trailCode + ".json";
            return fetch(trailAddress).then(res => {
                if (res.status === 200) {
                    return res.json();
                }
            })
        },
        dealFilghtData(flightName) {
            flightName = this.basePath + "flight/" + flightName;
            return fetch(flightName).then(res => res.json()).then(json => {
                var data = []
                var otherInfor = ["full_count", "version", "stats", "selected-aircraft", "selected"];
                for (let key in json) {
                    if (!otherInfor.includes(key)) {
                        data.push({
                            "code": key,
                            "infor": json[key]
                        });
                    }
                }
                return data;
            });
        },
        //TODO 创建一个collection，专门放model
        deleteMb() {
            if (this.pickModel) {
                this.pickModel.viewer.scene.preRender.removeEventListener(this.pickModel.update);
            }
            viewer.scene.primitives.remove(this.collection);
            if (this.interval !== "") {
                clearInterval(this.interval);
            }
            this.modelMap = new Map();
            this.pickModel = ""
            this.pathDisabled = true;
        },
        pathChoose() {
            this.pickModel.clearPathLine()
            if (this.pathChooseValue === "passed") {
                this.pickModel.path = "passed";
            } else if (this.pathChooseValue === "path") {
                this.pickModel.path = "path";
            }
        },
        addPartical() {
            this.pickModel.addParticalSystem();
        },
        changeModelType() {
            var model = Cesium.Model.fromGltf({
                url: "static/data/CesiumBalloon.glb",
                scale: 10,
                show: true,
                minimumPixelSize: 50,
            })
            if (this.collection.length !== 0) {
                this.collection.model = model;
            }
        },
        statisticFile() {
            var fileName = this.basePath + "flightInfor.json";
            return fetch(fileName).then(res => res.json()).then(json => {
                return json.data;
            });
        },
        trackModel() {
            var model = this.pickModel;
            window.model = model;
            window.Cesium = Cesium;
            if (!this.cameraPick) {
                model.clock.onTick.addEventListener(this.cameraFunction)
            } else {
                model.clock.onTick.removeEventListener(this.cameraFunction);
            }
            this.cameraPick = !this.cameraPick;
        },
        cameraFunction() {
            var model = this.pickModel
            var position = model.getPosition();
            var or = model.getOrientation();
            viewer.camera.setView({
                destination: position,
                orientation: {
                    heading: Cesium.HeadingPitchRoll.fromQuaternion(or).heading, // east, default value is 0.0 (north)
                    pitch: Cesium.Math.toRadians(-90),
                    roll: 0
                }
            });
            viewer.camera.moveBackward(50000);
        },
        scaleModel(scale, matrix) {
            var scaleMatrix = Cesium.Matrix4.fromUniformScale(scale);
            var modelMatrix = Cesium.Matrix4.multiply(
                matrix,
                scaleMatrix,
                new Cesium.Matrix4()
            );
            return modelMatrix;
        },
        formatTooltip(val) {
            var time = new Date(val * 1000)
            return time;
        },
        //这个判断有问题，不能只比教innstanceID(数组编号)，判断modelMATRIX?
        judgeModelInstanceToDm(pick) {
            for (let value of this.modelMap.values()) {
                if (value.modelInstance.instanceId === pick.instanceId) {
                    return value;
                }
            }
        }
    },
    watch: {
        pickModel: function (newValue, oldValue) {
            if (newValue) {
                clearInterval(this.interval);
            } else {
                this.interval = this.trueTimeUpdate();
            }
        },
        time: function (newValue, oldValue) {
            this.pickModel.clock.currentTime = Cesium.JulianDate.fromDate(new Date(newValue * 1000));
            if (this.pickModel.path !== "path") {
                this.pickModel.clearPathLine();
                this.pickModel.path = this.pickModel.path
            }
        },
    }
}
</script>

<style>
@import "cesium/Source/Widgets/widgets.css";

#cesiumContainer {
    margin: 0;
    padding: 0;
    width: 100%;
    height: 100%;
}

#editor {
    position: absolute;
    top: 10;
    right: 0;
    height: 500px;
    width: 250px;
    z-index: 1100;
}

.operater {
    height: 50px;
    width: 100%;
    margin-top: 10px;
}
</style>
