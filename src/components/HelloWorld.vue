<template>
<div id="cesiumContainer">
    <div id="editor">
        <div class="operater">
            <el-button type="primary" plain @click="createMb()">创建列表动标</el-button>
        </div>
        <div class="operater">
            <el-button type="primary" plain @click="changeModelType()">切换模型</el-button>
        </div>
        <div class="operater">
            <el-button type="primary" plain @click="deleteMb()">清除动标</el-button>
        </div>
        <div class="operater">
            <el-button type="primary" plain @click=" addPartical()">添加粒子效果</el-button>
        </div>
        <div class="operater">
            <el-button type="primary" plain @click=" trackModel()">跟踪目标</el-button>
        </div>
        <div class="operater">
            <el-select v-model="pathChooseValue" placeholder="请选择" @change="pathChoose()">
                <el-option :disabled="pathDisabled" v-for="item in pathOptions" :key="item.value" :label="item.label" :value="item.value">
                </el-option>
            </el-select>
        </div>
    </div>
</div>
</template>

<script>
import fetch from 'node-fetch';
var Cesium = require('cesium/Cesium');
// import Cesium from 'cesium/Cesium';
// import widgets from 'cesium/Widgets/widgets.css';
import DynamicModel from "../class/DynamicModel";
import trailTest from "../../static/data/trail.json"
export default {
    name: 'HelloWorld',
    data() {
        return {
            pathOptions: [{
                value: 'passed',
                label: '飞行轨迹'
            }, {
                value: 'path',
                label: '飞行路径'
            }],
            pathDisabled: true,
            modelGrounp: [],
            pickModel: "",
            pathChooseValue: "",
            basePath: "static/data/",
            interval: undefined,
            cameraPick: false,
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
        window.viewer = viewer;
        var scene = viewer.scene;
        var page = this;
        var handler = new Cesium.ScreenSpaceEventHandler(scene.canvas);
        handler.setInputAction(function (windowPosition) {
            var pick = scene.pick(windowPosition.position);
            if (pick) {
                var model = page.judgeMbModel(pick.id)
                if (model && model.id !== page.pickModel.id) {
                    if (page.pickModel.id) { //如果不是第一次操作，是切换
                        page.pickModel.color = Cesium.Color.WHITE;
                        page.pickModel.historyRoute = false;
                    }
                    page.pickModel = model;
                    page.pickModel.color = Cesium.Color.RED;
                    if (page.pickModel.trail.length === 0) { //第一次点击
                        var trail = page.setTrail(page.pickModel.id);
                        trail.then(data => {
                            page.pickModel.trail = data;
                            page.pickModel.historyRoute = true;
                        })
                    } else { //点击过一次，数据无需获取
                        page.pickModel.historyRoute = true;
                    }
                    page.pathDisabled = false;
                } else if (model.id === page.pickModel.id) { //再次点击
                    page.pickModel.color = Cesium.Color.WHITE;
                    page.pathDisabled = true;
                    page.pickModel.historyRoute = false;
                    page.pickModel = '';
                }
            }
        }, Cesium.ScreenSpaceEventType.LEFT_CLICK)
    },
    methods: {
        async createMb() {
            var files = await this.statisticFile();
            var flightName = files[0];
            var flightData = await this.dealFilghtData(flightName);
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
                let model = Cesium.Model.fromGltf({
                    url: "../../static/data/Cesium_Air.glb",
                    modelMatrix: modelMatrix,
                    scale: 10,
                    show: true,
                    minimumPixelSize: 50,
                });
                let options = {
                    model: model,
                    id: modelCode
                };
                let dm = new DynamicModel(options);
                this.modelGrounp.push(dm);
                dm.addToViewer(viewer);
            };
            this.trueTimeUpdate().then(res => {
                this.interval = res;
            })
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
        judgeMbModel(id) {
            for (let item of this.modelGrounp) {
                if (id === item.id) {
                    return item;
                }
            }
        },
        async trueTimeUpdate() {
            var page = this;
            var modelInfor, modelCode, modelArray, lng, lat, heading, alt, model, cartesian;
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
                    for (let j = 0; j < page.modelGrounp.length; j++) {
                        if (modelCode === page.modelGrounp[j].id) {
                            model = page.modelGrounp[j];
                            break;
                        }
                    }
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
            for (let i = 0; i < this.modelGrounp.length; i++) {
                viewer.scene.primitives.remove(this.modelGrounp[i].model);
            }
            this.modelGrounp = [];
        },
        pathChoose() {
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
                //   modelMatrix: modelMatrix,
                scale: 10,
                show: true,
                minimumPixelSize: 50,
            })
            if (this.pickModel) {
                this.pickModel.changeModel(model, {
                    id: "balloon"
                });
                this.pickModel.color = Cesium.Color.RED;
            }
        },
        statisticFile() {
            var fileName = this.basePath + "flightInfor.json";
            return fetch(fileName).then(res => res.json()).then(json => {
                return json.data;
            });
        },
        trackModel() {
            // var distance = new Cesium.Cartesian3(0, 0, 1000000);
            var model = this.pickModel;
            window.model = model;
            window.Cesium = Cesium;
            var cameraFunction = function () {
                var position = model.getPosition();
                //   position=Cesium.Cartesian3(position.x,position.y,position.z+20)
                //   Cesium.Cartesian3.add(position, distance, position)
                var or = model.getOrientation();
                viewer.camera.setView({
                    destination: position,
                    orientation: {
                        heading: Cesium.HeadingPitchRoll.fromQuaternion(or).heading, // east, default value is 0.0 (north)
                        pitch: Cesium.Math.toRadians(-90), // default value (looking down)
                        roll: 0. // default value
                    }
                });
                viewer.camera.moveBackward(1000);
            };
            if (!this.cameraPick) {
                model.clock.onTick.addEventListener(cameraFunction)
            } else {
                model.clock.onTick.removeEventListener(cameraFunction);
            }
            this.cameraPick = !this.cameraPick;
        }
    },
    watch: {
        pickModel: function (newValue, oldValue) {
            if (newValue) {
                clearInterval(this.interval);
            } else {
                this.interval = this.trueTimeUpdate();
            }
        }
    }
}
</script>

<style scoped>
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
}
</style>
